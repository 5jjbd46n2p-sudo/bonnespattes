# Sécurité lot 0 : plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche par tâche. Les étapes utilisent des cases (`- [ ]`) pour le suivi.

**Objectif :** sceller les contrats signés, protéger le compte admin (secret TOTP chiffré, codes de secours, 2FA obligatoire), rendre la limitation des essais atomique, verrouiller la facturation en base avec un journal d'audit, chiffrer les accès (clés, digicode) et compléter l'anonymisation.

**Architecture :** trois bibliothèques pures et testables (`lib/crypto.js`, `lib/contractSeal.js`, `lib/backupCodes.js`) ; deux bibliothèques avec base (`lib/audit.js`, `consumeAttempt` dans `lib/security.js`) ; les invariants critiques (contrat signé, facture émise, préfixe, journal) sont aussi imposés par des triggers PostgreSQL, pour qu'aucun chemin de code ni script ne puisse les contourner.

**Pile :** Next.js 16 App Router (lire `node_modules/next/dist/docs/` en cas de doute), `pg`, Node `crypto` (AES-256-GCM, SHA-256), pdf-lib, Neon Postgres 18 (projet `muddy-tree-70096815`, branche de prod `br-empty-wildflower-b19wb1v9`), Vercel.

**Spécification :** `docs/superpowers/specs/2026-11-02-securite-lot0-design.md` (branche `secu-lot0`).

## Contraintes globales
- Une branche par phase (ci-dessous), partie de `origin/main` à jour ; fusion dans `main` seulement sur « Merge » de Timothé, puis vérification du déploiement Vercel READY.
- Pas de build : chaque fichier modifié passe `bun build --no-bundle <fichier>` (un à la fois). Logique pure testée par `bun test tests/<fichier>.test.mjs` (fichiers de test sans import de `lib/db.js` : `node_modules` absent du bac à sable). Signaler à Timothé tout ce qui n'est pas testé à l'écran.
- Migrations : appliquées à la main sur Neon (`run_sql` = une instruction, `run_sql_transaction` sinon), puis ajoutées de façon idempotente en fin de `lib/schema.sql`. Instantané Neon avant chaque migration de triggers. Triggers d'abord testés sur une branche Neon jetable (supprimée ensuite ; limite de 10 branches sur le plan gratuit).
- Routes : n'exporter que des handlers ; fonctions partagées dans `lib/`. Dates SQL castées `::text` vers le client. Texte libre dans un PDF : `pdfSafe` (`lib/pdfText.js`).
- Aucune donnée personnelle dans `audit_log.details` (identifiants, numéros de facture, noms de champs seulement).
- `console.error` : message court (`e.message` ou libellé), jamais l'objet d'erreur brut ni une valeur saisie.
- Textes : tutoiement côté admin, vouvoiement côté client, aucun emoji, icônes Phosphor.
- `DATA_ENCRYPTION_KEY` : 32 octets aléatoires en base64, jamais affichée, copie conservée par Timothé hors Vercel.
- Trailers de commit : `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` et `Claude-Session: https://claude.ai/code/session_01UDBZYwjhnRcqfgzYGzF2Uu`.

## Points d'attention (relevés à la lecture du code, non couverts tels quels par la spec)
1. **Client sans facture mais avec contrat signé** : `eraseClient` fait `DELETE FROM clients`, ce qui supprime en cascade le contrat signé et sera refusé par le nouveau trigger. Attendu : le client est alors anonymisé (pas supprimé) et le contrat conservé. Test en tâche 6.
2. **Avoir** : `credit-note` insère la facture en `ENVOYEE` puis ses lignes ; le verrou des lignes refuserait l'insertion. Attendu : l'avoir est créé en `BROUILLON`, ses lignes ajoutées, puis passé en `ENVOYEE` dans la même transaction. Test en tâche 10.
3. **Purge de conservation** : le cron supprime des contrats signés hors transaction ; `SET LOCAL app.retention` exige une transaction. Attendu : suppression dans `tx()` avec `set_config('app.retention','on',true)`, et rien d'autre ne peut supprimer un contrat signé. Test en tâche 6.
4. **Brouillon avec un vrai numéro** : les brouillons reçoivent un numéro F#### dès leur création et l'appli permet de les supprimer. Le trigger autorise donc la suppression si `status = 'BROUILLON'` ou `is_test`. Un trou de numérotation reste possible si on supprime un brouillon qui n'est pas le dernier (comportement actuel, inchangé ; à trancher par Timothé plus tard).
5. **Connexion réussie** : avec « enregistrer avant de vérifier », les connexions réussies comptent aussi. Attendu : après un succès, les essais de la clé compte+IP sont effacés, pour qu'Aurore ne se bloque pas elle-même. Test en tâche 3.

---

## Phase A — branche `secu-0a-fondations` (étapes 1 à 3 de la spec)

### Tâche 1 : chiffrement et instantané

**Fichiers :** créer `lib/crypto.js`, `tests/crypto.test.mjs`.

**Interfaces produites :**
- `encrypt(plain: string): string` → `"v1:" + iv + ":" + tag + ":" + data` (base64, IV de 12 octets).
- `decrypt(value: string): string` ; lève une erreur si format, clé ou tag invalides.
- `isEncrypted(value: unknown): boolean` (préfixe `v1:`).
- Clé lue dans `process.env.DATA_ENCRYPTION_KEY` à chaque appel ; erreur `"DATA_ENCRYPTION_KEY manquante ou invalide."` si absente ou ≠ 32 octets décodés.

- [ ] **Étape 1 : instantané Neon** `avant-secu-0a` de `br-empty-wildflower-b19wb1v9`.
- [ ] **Étape 2 : clé Vercel.** Générer la clé dans le bac à sable (`openssl rand -base64 32`), la créer dans Vercel (`create_project_env`, cibles production + preview, type sensible) sans l'afficher ; demander à Timothé d'en garder une copie (lui transmettre par un moyen qu'il choisit, jamais dans le chat ni un commit).
- [ ] **Étape 3 : tests (échouent)** dans `tests/crypto.test.mjs` : aller-retour `decrypt(encrypt("1234A"))==="1234A"` (y compris chaîne vide et accents) ; deux chiffrements du même texte diffèrent ; `isEncrypted(encrypt("x"))` vrai, `isEncrypted("JBSWY3DP")` faux ; un octet modifié dans `data` → `decrypt` lève ; clé absente → lève avec le message ci-dessus.
- [ ] **Étape 4 : implémenter** `lib/crypto.js` (`createCipheriv("aes-256-gcm")`).
- [ ] **Étape 5 :** `bun test tests/crypto.test.mjs` → PASS ; `bun build --no-bundle lib/crypto.js` → OK.
- [ ] **Étape 6 : commit** « Sécurité : chiffrement AES-256-GCM des données sensibles ».

### Tâche 2 : schéma et journal d'audit

**Fichiers :** créer `lib/audit.js` ; modifier `lib/schema.sql` (fin de fichier).

**Interfaces produites :**
- `audit(db, { actorId, action, entity, entityId, details }): Promise<void>` où `db` est un client de `tx()` ou `null` (alors `query()`). N'échoue jamais l'action appelante hors transaction (erreur journalisée en message court) ; dans une transaction, l'erreur remonte (l'action et sa trace sont atomiques).
- Constantes `AUDIT_ACTIONS` : `invoice.create`, `invoice.issue`, `invoice.payment`, `invoice.update_notes`, `invoice.update_due_date`, `invoice.credit_note`, `invoice.replace`, `client.delete`, `client.anonymize`, `settings.sensitive_change`, `contract.send`, `contract.sign`, `contract.cancel`, `contract.integrity_failure`, `mfa.enable`, `mfa.disable`, `mfa.backup_code_used`, `mfa.backup_codes_regenerated`.

- [ ] **Étape 1 : migration** (une transaction Neon) :
  - `contract_signatures` : `seal_hash TEXT`, `sealed_at TIMESTAMPTZ`, `seal_legacy BOOLEAN NOT NULL DEFAULT false`.
  - `backup_codes (id UUID PK DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users ON DELETE CASCADE, code_hash TEXT NOT NULL, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (user_id, code_hash))`.
  - `audit_log (id BIGSERIAL PK, at TIMESTAMPTZ NOT NULL DEFAULT now(), actor_id UUID, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, details JSONB NOT NULL DEFAULT '{}')` + index `(at DESC)` et `(action, at DESC)`.
  - `clients.access_info_enc TEXT`.
- [ ] **Étape 2 :** ajouter les mêmes instructions en `IF NOT EXISTS` à `lib/schema.sql`.
- [ ] **Étape 3 : implémenter** `lib/audit.js` ; `bun build --no-bundle lib/audit.js` → OK.
- [ ] **Étape 4 : commit** « Sécurité : tables du lot 0 et journal d'audit ».

### Tâche 3 : limitation atomique des essais

**Fichiers :** modifier `lib/security.js`, `app/api/auth/login/route.js`, `app/api/auth/mfa/route.js`, `app/api/contract/[token]/otp/route.js`, `app/api/contract/[token]/sign/route.js`.

**Interfaces produites :**
- `consumeAttempt(bucket, key, { limit, windowSeconds }): Promise<boolean>` : `INSERT` puis `COUNT` dans la fenêtre (une seule requête CTE) ; renvoie `true` si **autorisé** (total ≤ limite).
- `clearAttempts(bucket, key): Promise<void>`.
- `clientIp(req)` : `x-real-ip` d'abord, puis premier élément de `x-forwarded-for`, sinon `"unknown"`.
- `isRateLimited` / `recordHit` restent exportés tant que d'autres routes s'en servent (leads, totp, contract-sign-user).

- [ ] **Étape 1 : connexion.** Ordre : validation → `consumeAttempt("login-ip", ip, 20/15 min)` → `consumeAttempt("login-account", normalizedEmail + "|" + ip, 6/15 min)` → recherche du compte → bcrypt (vrai ou factice) → succès : `clearAttempts("login-account", …)`. Refus = même 429 et même message que le compte existe ou non, toujours après une comparaison bcrypt (factice si besoin) pour un délai comparable.
- [ ] **Étape 2 : MFA.** `consumeAttempt("mfa", user.id, 5/15 min)` et `("mfa-ip", user.id|ip, 5/15 min)` avant toute vérification (TOTP ou code de secours, tâche 7).
- [ ] **Étape 3 : contrat.** OTP : `consumeAttempt("contract-otp-ip", ip, 10/h)` ; signature : `consumeAttempt("contract-sign-ip", ip, 20/h)`. Réponses inchangées.
- [ ] **Étape 4 : test manuel de la CTE** sur une branche Neon jetable : 7 appels successifs avec limite 6 → les 6 premiers autorisés, le 7e refusé.
- [ ] **Étape 5 :** `bun build --no-bundle` sur chaque fichier modifié → OK.
- [ ] **Étape 6 : commit** « Sécurité : limitation des essais atomique, réponse identique compte connu ou non ».

### Tâche 4 : petits correctifs

**Fichiers :** modifier `lib/auth.js`, `app/api/auth/password/route.js` (vérifier qu'il n'utilise pas `requireClient`), `app/api/visits/[id]/photos/route.js`, `app/api/site-photos/[slot]/route.js`, `app/api/clients/[id]/route.js`, `app/api/invoices/[id]/route.js` ; créer `lib/imageMagic.js`, `tests/imageMagic.test.mjs` ; balayer `console.error(e)` dans `app/api` et `lib`.

**Interfaces produites :**
- `requireClient({ allowPasswordChange = false } = {})` : renvoie `null` si `must_change_password` et pas `allowPasswordChange`. Seule `/api/auth/password` passe `true` (si elle passe par `requireClient`).
- `sniffImageType(bytes: Uint8Array): "image/jpeg"|"image/png"|"image/webp"|"image/heic"|null` (lit les 12 premiers octets ; HEIC/HEIF = `ftyp` en 4–7 suivi de `heic|heix|hevc|mif1|msf1|heif`).

- [ ] **Étape 1 : tests (échouent)** : en-têtes `FF D8 FF` → jpeg ; `89 50 4E 47 0D 0A 1A 0A` → png ; `RIFF....WEBP` → webp ; `....ftypheic` → heic ; `....ftypmif1` → heic ; `GIF89a` → null ; 3 octets → null.
- [ ] **Étape 2 : implémenter** `lib/imageMagic.js` ; `bun test` → PASS.
- [ ] **Étape 3 : photos.** Dans les deux routes d'envoi, lire `await file.slice(0, 16).arrayBuffer()` ; refuser (400, même message de format) si `sniffImageType` est `null` ou d'une autre famille que `file.type` (heic et heif = même famille).
- [ ] **Étape 4 : longueurs.** `clients/[id]` PATCH : `cleanText` avec maxima prénom/nom 100, téléphone 40, email 200 (format vérifié), adresse 300, notes 5000, `hourly_rate` via `parseAmount`. `invoices/[id]` PATCH : `notes` texte ≤ 2000, `dueDate` via `parseDateISO` ou `null`. 400 avec message clair sinon.
- [ ] **Étape 5 : journaux.** Remplacer `console.error(e)` par `console.error("<contexte> :", e?.message)` (sans valeur saisie).
- [ ] **Étape 6 :** `bun build --no-bundle` sur chaque fichier → OK. Commit « Sécurité : changement de mot de passe obligatoire côté API, octets magiques des photos, longueurs ».

**Fin de phase A :** push, rapport, attente « Merge ». Après fusion : vérifier la connexion d'Aurore et d'un client (à faire à l'écran par Timothé).

---

## Phase B — branche `secu-0b-contrat` (étape 4)

### Tâche 5 : sceau d'intégrité

**Fichiers :** créer `lib/contractSeal.js`, `tests/contractSeal.test.mjs` ; modifier `app/api/contract/[token]/sign/route.js`, `app/api/portal/contract/[id]/sign/route.js`, `app/api/contract/[token]/pdf/route.js`, `app/api/contracts/[id]/pdf/route.js`, `lib/contract.js` (page « Preuve de signature »), `lib/contractFinalize.js`, `lib/email.js`.

**Interfaces produites :**
- `canonicalJson(value): string` : clés triées récursivement, pas d'espaces, `Date` → `toISOString()`.
- `sealPayload(sig): object` : exactement `{ id, client_id, version, content, content_hash, signer_name, signer_ip, signer_user_agent, checkboxes, emergency_contact, vet_info, signed_at }`, `signed_at` en ISO 8601 UTC, `null` pour les absents.
- `computeSeal(sig): string` (SHA-256 hex de `canonicalJson(sealPayload(sig))`, UTF-8).
- `verifySeal(sig): { ok: boolean, legacy: boolean }` (comparaison à temps constant ; `ok:false` si `seal_hash` absent).

- [ ] **Étape 1 : tests (échouent)** : même contrat avec clés dans un autre ordre → même empreinte ; `signed_at` en `Date` ou en chaîne ISO équivalente → même empreinte ; changer `signer_name`, `checkboxes.accept` ou un caractère de `content` → empreinte différente ; `verifySeal({...sig, seal_hash: computeSeal(sig)}).ok` vrai ; sans `seal_hash` → faux ; texte avec emoji et accents → empreinte stable (valeur de référence figée dans le test).
- [ ] **Étape 2 : implémenter** ; `bun test` → PASS.
- [ ] **Étape 3 : signature.** Dans les deux routes, après l'`UPDATE … RETURNING *` et dans la même transaction : `UPDATE contract_signatures SET seal_hash = $2, sealed_at = signed_at WHERE id = $1`, puis `audit(db, { action: "contract.sign", entity: "contract", entityId: id })`.
- [ ] **Étape 4 : rendu.** Dans les deux routes PDF, pour `status = 'SIGNE'` : `verifySeal` ; si échec → 409 « Contrat altéré : intégrité non vérifiée. Aurore a été prévenue. » (vouvoiement côté client), `alertAdmin`, `audit(null, { action: "contract.integrity_failure", … })`. Les contrats non signés ne sont pas concernés.
- [ ] **Étape 5 : PDF.** Page « Preuve de signature » : ligne « Intégrité vérifiée » + « Empreinte du dossier (SHA-256) : <seal_hash> » ; si `seal_legacy` : « Scellé le <sealed_at, Europe/Paris> (contrat signé avant la mise en place du sceau) ».
- [ ] **Étape 6 : e-mail.** `sendSignedContractEmail` reçoit `sealHash` et l'affiche sous le texte (client et Aurore).
- [ ] **Étape 7 :** `bun build --no-bundle` sur chaque fichier → OK. Commit « Contrat : sceau d'intégrité vérifié au rendu du PDF ».

### Tâche 6 : verrou en base, contrats existants, conservation

**Fichiers :** modifier `lib/schema.sql`, `lib/privacy.js`, `app/api/clients/[id]/contract/route.js` (journal `contract.send` / `contract.cancel`) ; créer `scripts/seal-existing-contracts.mjs`.

- [ ] **Étape 1 : instantané Neon** `avant-secu-0b`.
- [ ] **Étape 2 : scellement des contrats existants.** Le sceau doit être calculé par `computeSeal` (JS), pas en SQL. Script `scripts/seal-existing-contracts.mjs` (même logique que `lib/contractSeal.js`, importée) : pour chaque `status='SIGNE' AND seal_hash IS NULL`, poser `seal_hash`, `sealed_at = now()`, `seal_legacy = true`. Le bac à sable n'ayant pas `node_modules`, exécution : lire les lignes via `run_sql`, calculer les empreintes avec `bun` localement, écrire via `run_sql_transaction`. Vérifier ensuite `SELECT count(*) WHERE status='SIGNE' AND seal_hash IS NULL` = 0.
- [ ] **Étape 3 : trigger** `contract_signatures_lock()` `BEFORE UPDATE OR DELETE` :
  - UPDATE avec `OLD.status = 'SIGNE'` → `RAISE EXCEPTION 'contrat signé : modification interdite'`, **sauf** si seuls `seal_hash`/`sealed_at`/`seal_legacy` passent de NULL à une valeur (premier scellement) — ou si l'UPDATE fait passer `ENVOYE` → `SIGNE` (signature).
  - DELETE avec `OLD.status = 'SIGNE'` → refus sauf `current_setting('app.retention', true) = 'on'`.
- [ ] **Étape 4 : tests SQL sur branche Neon jetable** : signer une ligne de test puis `UPDATE … SET signer_name='x'` → erreur ; `DELETE` → erreur ; en transaction avec `set_config('app.retention','on',true)` → supprimée ; ligne `ENVOYE` modifiable et supprimable ; `DELETE FROM clients` d'un client ayant un contrat signé → erreur (cascade).
- [ ] **Étape 5 : `lib/privacy.js`.** `eraseClient` : si le client a un contrat `SIGNE`, il est anonymisé même sans facture (point d'attention 1) ; `applyRetention` supprime les contrats signés expirés dans `tx()` après `SELECT set_config('app.retention','on',true)` (point 3). Journal `client.delete` / `client.anonymize`.
- [ ] **Étape 6 :** appliquer le trigger en prod, l'ajouter à `lib/schema.sql` (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` puis `CREATE TRIGGER`). `bun build --no-bundle` → OK. Commit « Contrat : verrou en base, contrats existants scellés ».

**Fin de phase B :** push, rapport, « Merge ». À l'écran (Timothé) : signer un contrat de test, ouvrir son PDF, ouvrir le PDF d'un ancien contrat (mention « scellé le »).

---

## Phase C — branche `secu-0c-2fa` (étape 5)

### Tâche 7 : codes de secours

**Fichiers :** créer `lib/backupCodes.js`, `tests/backupCodes.test.mjs` ; modifier `app/api/auth/totp/route.js`, `app/api/auth/mfa/route.js`, `components/SecuritySettings.jsx`, `app/login/page.js`.

**Interfaces produites :**
- `generateBackupCodes(n = 10): string[]` : format `XXXX-XXXX`, alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, `crypto.randomInt`.
- `normalizeBackupCode(input): string` (majuscules, sans espaces ni tirets) ; `hashBackupCode(code): string` = SHA-256 hex du code normalisé.
- `looksLikeBackupCode(input): boolean` (8 caractères de l'alphabet après normalisation).

- [ ] **Étape 1 : tests (échouent)** : 10 codes distincts au bon format ; `hashBackupCode("abcd-efgh") === hashBackupCode("ABCDEFGH")` ; `looksLikeBackupCode("123456")` faux ; `looksLikeBackupCode("abcd efgh")` vrai.
- [ ] **Étape 2 : implémenter** ; `bun test` → PASS.
- [ ] **Étape 3 : activation.** `totp` action `enable` : après validation du code, dans une transaction : supprimer les anciens codes, insérer 10 empreintes, `audit mfa.enable` ; réponse `{ ok, enabled, backupCodes }` (affichés une fois). Nouvelle action `regenerate-codes` (mot de passe + code TOTP exigés) ; `disable` supprime les codes et journalise `mfa.disable`.
- [ ] **Étape 4 : connexion.** `mfa` : si `looksLikeBackupCode(code)`, `UPDATE backup_codes SET used_at = now() WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING id` ; succès → session, `audit mfa.backup_code_used`, `alertAdmin` (« un code de secours a été utilisé, il en reste N »). Sinon chemin TOTP actuel.
- [ ] **Étape 5 : écrans.** `SecuritySettings` : affichage des 10 codes après activation, bouton « Copier », case « J'ai mis ces codes en lieu sûr » avant de fermer, nombre de codes restants, bouton « Générer de nouveaux codes ». `login` : lien « Utiliser un code de secours » qui change l'aide du champ.
- [ ] **Étape 6 :** `bun build --no-bundle` → OK. Commit « 2FA : codes de secours ».

### Tâche 8 : secret TOTP chiffré

**Fichiers :** modifier `lib/security.js`, `app/api/auth/totp/route.js`, `app/api/auth/mfa/route.js`.

**Interfaces produites :** `readTotpSecret(user): Promise<string|null>` : déchiffre si `isEncrypted`, sinon renvoie le secret en clair **et** le réécrit chiffré (`UPDATE users SET totp_secret = $2 WHERE id = $1 AND totp_secret = $3`).

- [ ] **Étape 1 :** `setup` stocke `encrypt(secret)` ; `enable`, `disable`, `regenerate-codes` et `mfa` utilisent `readTotpSecret`. Une erreur de déchiffrement → 500 générique et `alertAdmin` (jamais de repli sans 2FA).
- [ ] **Étape 2 :** `bun build --no-bundle` → OK. Commit « 2FA : secret TOTP chiffré, migration paresseuse ».
- [ ] **Étape 3 (après fusion) :** vérifier via `run_sql` que `totp_secret` de l'admin commence par `v1:` après une connexion d'Aurore.

**Fin de phase C :** push, rapport, « Merge ». À l'écran : Aurore active (ou réactive) la 2FA, range ses codes, se connecte une fois avec un code de secours.

---

## Phase D — branche `secu-0d-2fa-obligatoire` (étape 6, seulement après confirmation d'Aurore)

### Tâche 9 : 2FA obligatoire pour l'admin

**Fichiers :** modifier `lib/auth.js`, `app/api/auth/totp/route.js`, `app/api/auth/me/route.js`, `app/api/auth/logout/route.js` ; créer `app/admin/securite/page.js` (réutilise `components/SecuritySettings.jsx`).

**Interfaces :** `requireAdmin({ allowWithout2fa = false } = {})` et `adminPageGuard({ allowWithout2fa = false } = {})` : un ADMIN sans `totp_enabled` → `null` (API) ou redirection `/admin/securite` (pages). Seuls `totp`, `me`, `logout` et la page `/admin/securite` passent `true`.

- [ ] **Étape 1 :** vérifier en base que l'admin a `totp_enabled = true` et au moins un code de secours non utilisé ; sinon s'arrêter et prévenir Timothé.
- [ ] **Étape 2 :** implémenter ; `redirectFor(user)` renvoie `/admin/securite` pour un ADMIN sans 2FA.
- [ ] **Étape 3 :** `bun build --no-bundle` → OK. Commit « 2FA obligatoire pour l'admin ». Rappeler dans le rapport : secours = `npm run create-admin`.

---

## Phase E — branche `secu-0e-facturation` (étape 7)

### Tâche 10 : triggers de facturation

**Fichiers :** modifier `lib/schema.sql`, `app/api/invoices/[id]/credit-note/route.js`, `app/api/settings/route.js`.

- [ ] **Étape 1 : avoir (point 2).** `credit-note` : insérer l'avoir en `BROUILLON`, ses lignes, puis `UPDATE invoices SET status = 'ENVOYEE'` dans la même transaction.
- [ ] **Étape 2 : préfixe.** `settings` PATCH : si `invoicePrefix` change et qu'il existe une facture `is_test = false`, 409 « Le préfixe de facturation ne peut plus changer : des factures ont déjà été émises. »
- [ ] **Étape 3 : instantané Neon** `avant-secu-0e`.
- [ ] **Étape 4 : triggers** (fonctions `plpgsql`) :
  - `invoices` `BEFORE DELETE` : refus si `NOT OLD.is_test AND OLD.status <> 'BROUILLON'`.
  - `invoices` `BEFORE UPDATE` : si `NOT OLD.is_test AND OLD.status <> 'BROUILLON'`, refus si `number`, `issue_date`, `client_id`, `total_ht`, `total_tva`, `total_ttc`, `tva_rate`, `is_test` ou `credit_note_of` changent, ou si `NEW.status = 'BROUILLON'`.
  - `invoice_items` `BEFORE INSERT OR UPDATE OR DELETE` : refus si la facture parente existe, n'est pas de test et n'est pas `BROUILLON` (une ligne supprimée en cascade d'un brouillon passe : la parente est déjà absente ou brouillon).
  - `settings` `BEFORE UPDATE` : refus si `invoice_prefix` change et qu'une facture `is_test = false` existe.
- [ ] **Étape 5 : tests SQL sur branche Neon jetable** : supprimer une facture émise → erreur ; supprimer un brouillon et une facture de test → OK ; changer `total_ttc` d'une facture émise → erreur ; passer `ENVOYEE` → `PAYEE` et modifier `notes`/`due_date` → OK ; avoir complet (étape 1) → OK ; changer le préfixe → erreur ; parcours « annuler et remplacer » (`DeleteInvoiceButton`) rejoué en SQL → OK.
- [ ] **Étape 6 :** appliquer en prod, ajouter à `lib/schema.sql`. `bun build --no-bundle` → OK. Commit « Facturation : verrou en base des factures émises et du préfixe ».

### Tâche 11 : journal d'audit (écritures et écran)

**Fichiers :** modifier `app/api/invoices/route.js`, `app/api/invoices/from-visits/route.js`, `app/api/invoices/[id]/route.js`, `app/api/invoices/[id]/payments/route.js`, `app/api/invoices/[id]/credit-note/route.js`, `app/api/settings/route.js`, `lib/privacy.js` (purge), `lib/schema.sql` ; créer `app/admin/journal/page.js` ; lien depuis `app/admin/settings/page.js`.

- [ ] **Étape 1 : trigger `audit_log`** `BEFORE UPDATE OR DELETE` : refus, sauf DELETE avec `app.retention = 'on'` et `OLD.at < now() - interval '5 years'`. Test sur branche jetable, puis prod et `schema.sql`.
- [ ] **Étape 2 : écritures**, dans la transaction de l'action : `invoice.create` (`{number}`), `invoice.issue` (passage BROUILLON → autre), `invoice.payment` (`{number, amount}`), `invoice.update_notes` / `invoice.update_due_date` (`{number}`), `invoice.credit_note` (`{number, creditNote}`), `invoice.replace` ; `settings.sensitive_change` (`{fields: [...]}` parmi `invoice_prefix`, `iban`, `siret`, `contract_template`, `insurance_info`, `mediator_info`, sans valeurs).
- [ ] **Étape 3 : purge** : `applyRetention` supprime les entrées de plus de 5 ans (dans `tx()` avec `app.retention`).
- [ ] **Étape 4 : écran « Journal »** (`adminPageGuard`) : 100 dernières entrées (`at::text`), filtre `?type=` (préfixe d'action : `invoice`, `contract`, `client`, `settings`, `mfa`), libellés en français, lecture seule.
- [ ] **Étape 5 :** `bun build --no-bundle` sur chaque fichier → OK. Commit « Journal d'audit des actions sensibles ».

**Fin de phase E :** push, rapport, « Merge ». À l'écran : tenter de supprimer une facture émise (refus), créer un avoir, ouvrir le Journal.

---

## Phase F — branche `secu-0f-acces` (étape 8)

### Tâche 12 : champ « Accès » chiffré

**Fichiers :** modifier `app/api/clients/[id]/route.js`, `app/api/clients/route.js`, `app/admin/clients/new/page.js`, la fiche client admin et la fiche de visite (composants à localiser), `lib/clientExport.js` (vérifier l'absence du champ) ; créer `app/admin/clients/controle-notes/page.js`, `lib/accessHints.js`, `tests/accessHints.test.mjs`.

**Interfaces :** `looksLikeAccessCode(notes: string): boolean` : vrai si le texte contient `code`, `digicode`, `clé`/`clef`/`cles`, `badge`, `alarme` (insensible à la casse et aux accents) ou une suite de 4 chiffres ou plus qui n'est pas une date ni un numéro de téléphone.

- [ ] **Étape 1 : tests (échouent)** : « Digicode 4B12 » → vrai ; « clés chez la voisine » → vrai ; « alarme 1234 » → vrai ; « Croquettes matin et soir » → faux ; « Né en 2019 » → faux (année seule) ; « 06 12 34 56 78 » → faux.
- [ ] **Étape 2 : implémenter** ; `bun test` → PASS.
- [ ] **Étape 3 : API.** `accessInfo` (≤ 1000 caractères) accepté en création et en PATCH ; stocké `encrypt()` dans `access_info_enc` (chaîne vide → `NULL`) ; jamais renvoyé par les listes, la recherche, le portail ni les exports ; déchiffré seulement dans la fiche client admin et la fiche de visite du jour.
- [ ] **Étape 4 : écrans.** Champ « Accès (clés, digicode) » (admin) ; libellé des notes : « Notes (consignes) ». Page de contrôle listant les clients dont `notes` vérifie `looksLikeAccessCode`, avec lien vers la fiche, accessible depuis la liste des clients.
- [ ] **Étape 5 :** `bun build --no-bundle` → OK. Commit « Clients : accès (clés, digicode) chiffrés ».

### Tâche 13 : anonymisation étendue et politique de confidentialité

**Fichiers :** modifier `lib/privacy.js`, `app/confidentialite/page.js`.

- [ ] **Étape 1 :** `eraseClient` (mode anonymisation) efface aussi : `clients.access_info_enc` ; `quotes.sent_to` du client ; `contract_signatures.sent_to` (contrat signé conservé : l'UPDATE de `sent_to` seul doit être autorisé par le trigger de la tâche 6 → ajouter cette exception, `sent_to` vers `''` uniquement, et la tester sur branche jetable) ; `admin_events` liés au client (titre « Client anonymisé », notes et lieu vides) ; `leads` dont l'e-mail ou le téléphone correspond (avant effacement de la fiche). Les notes de factures restent ; si non vides, `audit client.anonymize` avec `{ invoicesWithNotes: n }`.
- [ ] **Étape 2 :** politique de confidentialité : mention du champ d'accès chiffré, de sa non-transmission et de son effacement ; conservation du journal (5 ans).
- [ ] **Étape 3 :** `bun build --no-bundle` → OK. Commit « RGPD : anonymisation étendue ».

**Fin de phase F :** push, rapport, « Merge ». Mettre à jour `docs/SECURITE.md` (protections ajoutées, `DATA_ENCRYPTION_KEY`, secours en cas de verrouillage) dans cette même branche.

---

## Couverture de la spec
§1 → tâches 5, 6 · §2 → 1, 7, 8, 9 · §3 → 3 · §4 → 2, 10, 11 · §5 → 12, 13 · §6 → 4 · Migrations → 2, 6, 10, 11 · Ordre de déploiement → phases A à F.
