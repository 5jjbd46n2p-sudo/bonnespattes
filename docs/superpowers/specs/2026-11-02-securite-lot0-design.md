# Sécurité, lot 0 : intégrité, comptes admin, facturation, données sensibles

Date : 2026-11-02. Statut : à relire par Timothé avant le plan d'implémentation.
Origine : audit de sécurité du 2026-11-02 (lecture du code, rien testé à l'écran, base de production non interrogée).

## Objectif
Corriger les cinq risques les plus importants relevés par l'audit, sans changer l'usage quotidien d'Aurore :
1. la force probante de la signature électronique du contrat ;
2. la protection du compte admin (double authentification) ;
3. le contournement de la limitation des essais de connexion ;
4. l'intégrité de la facturation (numérotation, factures émises) et l'absence de journal d'audit ;
5. les données sensibles en clair et l'anonymisation incomplète.

## Hors périmètre (lot 0 bis, plus tard)
Lien d'activation à la place du mot de passe provisoire par e-mail ; CSP stricte avec nonces ; mention d'OSRM et d'api-adresse.data.gouv.fr dans la politique de confidentialité ; export RGPD complet (devis, photos) ; préfixe `__Host-` des cookies ; réduction de la durée du lien PDF public de contrat ; horodatage qualifié par un tiers ; chiffrement de l'IBAN (il figure sur chaque facture).

## 1. Contrat signé : sceau d'intégrité
Constat : `content_hash` est calculé à l'envoi mais n'est pas revérifié ; il ne couvre ni le signataire, ni l'IP, ni les cases cochées, ni la date. Rien n'empêche de modifier la ligne en base.

Conception :
- Nouvelle colonne `contract_signatures.seal_hash TEXT` et `sealed_at TIMESTAMPTZ`.
- À la signature (routes `contract/[token]/sign` et `portal/contract/[id]/sign`), calcul de `seal_hash = SHA-256(JSON canonique { id, client_id, version, content, content_hash, signer_name, signer_ip, signer_user_agent, checkboxes, emergency_contact, vet_info, signed_at })`. Clés triées, encodage UTF-8, dates en ISO 8601 UTC.
- La fonction de calcul vit dans `lib/contractSeal.js` (une seule implémentation, utilisée à la signature et au rendu).
- Au rendu du PDF (`contract/[token]/pdf`, `contracts/[id]/pdf`) : recalcul et comparaison. Correspondance : le PDF affiche « Intégrité vérifiée » et l'empreinte. Écart : refus du PDF (erreur claire) et e-mail d'alerte à l'admin.
- Verrou en base : trigger `BEFORE UPDATE OR DELETE` sur `contract_signatures`. Quand `status = 'SIGNE'`, toute modification est refusée, et toute suppression l'est aussi sauf si la session a posé le paramètre `app.retention = 'on'` (utilisé uniquement par le cron de conservation). Les lignes `ENVOYE` et `ANNULE` restent modifiables.
- E-mail de confirmation : le PDF signé et l'empreinte sont envoyés au client et à l'admin.
- Contrats déjà signés : une migration calcule et pose `seal_hash` avec `sealed_at = now()`. Le PDF mentionne « scellé le [date] » pour ces contrats, car l'état antérieur ne peut pas être prouvé.
- Limite assumée : il s'agit toujours d'une signature électronique simple. Ce lot protège contre la modification après coup, pas contre une contestation de l'identité du signataire.

## 2. Double authentification admin
Constat : `users.totp_secret` en clair ; 2FA facultative ; pas de codes de secours.

Conception :
- Nouvelle variable d'environnement `DATA_ENCRYPTION_KEY` (32 octets aléatoires en base64), distincte de `JWT_SECRET`. Refus de démarrer les routes concernées si elle manque.
- `lib/crypto.js` : `encrypt(texte)` / `decrypt(texte)` en AES-256-GCM, format `v1:iv:tag:données` (base64), ce qui permet une rotation de clé future.
- `totp_secret` est chiffré. Migration paresseuse : lors d'une connexion avec un secret non chiffré, il est chiffré et réécrit.
- Codes de secours : table `backup_codes(id, user_id, code_hash, used_at, created_at)`. 10 codes à usage unique, générés à l'activation de la 2FA et affichés une seule fois, stockés hachés. Utilisables à l'étape MFA de la connexion ; chaque utilisation est tracée dans le journal d'audit.
- 2FA obligatoire pour le rôle ADMIN, en deux temps : (1) déploiement de l'activation guidée et des codes de secours ; (2) seulement ensuite, activation de la règle. Sans 2FA, l'admin est redirigé vers l'écran d'activation après le mot de passe et ne peut rien faire d'autre. Le script `scripts/create-admin.mjs` reste le secours en cas de verrouillage.

## 3. Limitation des essais de connexion
Constat : `lib/security.js` vérifie le compteur puis enregistre l'échec, ce qui laisse passer des requêtes en parallèle ; la réponse 429 révèle l'existence du compte.

Conception :
- Nouvelle fonction `consumeAttempt(bucket, key)` : `INSERT` du hit d'abord, puis `COUNT` dans la fenêtre ; si le total dépasse la limite, la requête est refusée. L'essai est donc compté même si la requête est lente ou parallèle.
- Appliquée à `auth/login` (mot de passe), `auth/mfa` (code 2FA et code de secours) et aux envois de code de contrat.
- Clé : e-mail normalisé + IP hachée, qu'il existe ou non un compte. La réponse est identique dans les deux cas (même statut, même message, même délai approximatif).
- IP : uniquement `x-real-ip` / l'IP fournie par Vercel, plus `x-forwarded-for` en repli.

## 4. Facturation verrouillée et journal d'audit
Constat : la numérotation et l'immuabilité des factures reposent uniquement sur l'application.

Conception (triggers dans la base) :
- `BEFORE DELETE` sur `invoices` : refus si `is_test = false` et que le numéro n'est pas un brouillon sans numéro réel. Une facture avec un vrai numéro ne se supprime plus ; on émet un avoir.
- `BEFORE UPDATE` sur `invoices` : si le statut est autre que `BROUILLON`, refus de modifier `number`, `issue_date`, `client_id`, `total_ht`, `total_tva`, `total_ttc`, `tva_rate`. `notes` et `due_date` restent modifiables mais sont journalisés.
- Même verrou sur `invoice_items` pour les factures émises.
- Préfixe de facturation figé : `settings.invoice_prefix` ne peut plus changer dès qu'une facture réelle existe (contrôle dans la route `settings` et trigger sur `settings`).
- Table `audit_log(id, at, actor_id, action, entity, entity_id, details JSONB)` écrite par l'application via `lib/audit.js` pour : création, émission, paiement, modification de notes ou d'échéance, avoir, annulation et remplacement de facture ; suppression ou anonymisation d'un client ; changement de réglages sensibles (préfixe, IBAN, SIRET, contrat) ; envoi, signature et annulation de contrat ; activation ou désactivation de la 2FA ; utilisation d'un code de secours ; échecs d'intégrité d'un contrat. Pas de données personnelles dans `details` (identifiants seulement).
- `audit_log` est en ajout seul (triggers refusant UPDATE et DELETE), purgée par le cron de conservation au bout de 5 ans.
- Écran admin « Journal » (lecture seule, 100 dernières entrées, filtre par type).

## 5. Données sensibles et anonymisation
Constat : digicodes saisis dans `clients.notes` en clair ; anonymisation incomplète.

Conception :
- Nouvelle colonne `clients.access_info_enc TEXT` : champ « Accès (clés, digicode) » chiffré avec `lib/crypto.js`. Affiché uniquement sur la fiche de visite du jour et sur la fiche client pour l'admin, jamais dans le portail, les e-mails ou les exports PDF. Le libellé du champ « Notes » ne mentionne plus « clés, code ».
- Les notes existantes ne sont pas modifiées automatiquement. Un écran de contrôle liste celles qui ressemblent à des codes (chiffres, mots « code », « digicode », « clé ») pour qu'Aurore les déplace.
- Anonymisation d'un client (`lib/privacy.js`) étendue : `quotes.sent_to`, `contract_signatures.sent_to` (le contrat signé lui-même est conservé 5 ans, seule l'adresse e-mail est effacée), `admin_events` liés au client (titre, notes, lieu), `leads` associés (par e-mail ou téléphone), notes des factures laissées telles quelles si le texte est libre mais signalées dans le journal.
- La politique de confidentialité est mise à jour en conséquence.

## 6. Petits correctifs du même lot
- `requireClient()` refuse l'accès tant que `must_change_password` est vrai, sauf `/api/auth/password`.
- Photos : contrôle des octets magiques (JPEG, PNG, WebP, HEIC) en plus du type déclaré.
- Longueur et type vérifiés sur les PATCH `clients/[id]` et `invoices/[id]` (notes, dates, textes).
- Les `console.error` ne journalisent plus d'objets d'erreur bruts contenant des valeurs (message court seulement).

## Migrations (idempotentes, ajoutées à `lib/schema.sql`)
`seal_hash`, `sealed_at` ; `backup_codes` ; `audit_log` ; `clients.access_info_enc` ; fonctions et triggers de verrou (contrats, factures, lignes de facture, préfixe, journal). Ordre d'application : tables et colonnes, puis scellement des contrats existants, puis triggers. Un instantané Neon est créé avant.

## Ordre de déploiement
1. Clé `DATA_ENCRYPTION_KEY` dans Vercel (générée, jamais affichée) et instantané Neon.
2. `lib/crypto.js`, `lib/audit.js`, migrations de colonnes et tables.
3. Limitation des essais (3) et petits correctifs (6).
4. Contrat : sceau, vérification, verrou, e-mail (1).
5. Codes de secours et activation guidée (2), puis chiffrement du secret TOTP.
6. Obligation de la 2FA, après que Aurore a activé et vérifié ses codes.
7. Triggers de facturation et journal (4).
8. Champ d'accès chiffré et anonymisation étendue (5).
Chaque étape sur une branche, fusionnée seulement après « Merge » et déploiement vérifié.

## Vérification
Pas de build possible dans le bac à sable : chaque fichier est vérifié par `bun build --no-bundle`, et la logique pure (empreintes, chiffrement, limite d'essais) par de petits scripts. Les triggers sont testés sur une branche Neon jetable avant la production. Après chaque déploiement, Timothé vérifie à l'écran : connexion avec code de secours, signature d'un contrat de test, tentative de suppression d'une facture émise (doit échouer), PDF d'un contrat scellé.

## Risques
- Perte de la clé `DATA_ENCRYPTION_KEY` : les secrets et codes d'accès chiffrés deviennent illisibles. Conserver une copie hors Vercel.
- Verrouillage de l'admin si la 2FA devient obligatoire avant que les codes de secours soient enregistrés : d'où l'ordre de déploiement ci-dessus.
- Les triggers peuvent bloquer une opération légitime d'un script existant ; test sur branche jetable obligatoire.

## Décisions déjà prises
Option B (refonte éditoriale du design, par lots) ; sécurité critique d'abord ; IBAN non chiffré ; contrats existants scellés avec la mention « scellé le [date] ».
