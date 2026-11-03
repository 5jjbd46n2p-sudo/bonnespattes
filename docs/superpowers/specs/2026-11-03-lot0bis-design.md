# Lot 0 bis : sécurité de second rang

Date : 2026-11-03. Statut : à relire par Timothé. Origine : `docs/lots/lot-0bis-securite.md`.

## Objectif
Réduire les risques restants après le lot 0 sans changer l'usage quotidien d'Aurore ni celui des clients. Les points à faible risque sont livrés tout de suite, chacun sur sa branche ; les trois points qui changent le comportement de connexion ou du navigateur attendent une décision de Timothé.

## Livré maintenant (faible risque)

### 1. Politique de confidentialité (`lot0bis-confidentialite`)
- Destinataires de géocodage et d'itinéraire précisés : `api-adresse.data.gouv.fr` (Base Adresse Nationale, État français) reçoit l'adresse du domicile du client et celle de la prestataire ; `router.project-osrm.org` (OSRM, association FOSSGIS, Allemagne) reçoit uniquement les coordonnées GPS des deux adresses. Finalité : distance et durée de trajet pour les frais de déplacement. Aucune autre donnée.
- Nouveautés reflétées : envoi des devis et factures par e-mail (Resend) ; avis clients publiés sur l'accueil (prénom ou nom affiché, précision facultative, texte), publiés avec l'accord de la personne et retirés sur simple demande.
- Date de mise à jour actualisée. DMARC est un réglage DNS, pas une donnée personnelle : rien à ajouter.

### 2. Dépendances (`lot0bis-dependances`)
- `.github/dependabot.yml` : npm chaque semaine (lundi), mises à jour mineures et correctifs regroupés en une seule demande, majeures séparées (Next.js, React, Tailwind) ; GitHub Actions chaque mois.
- `docs/SECURITE.md` : section « Mises à jour » (politique mensuelle, correctifs de sécurité sous 7 jours, majeures sur branche dédiée avec vérification de l'aperçu Vercel).

### 3. Lien PDF public du contrat (`lot0bis-lien-pdf-contrat`)
- `SIGNED_PDF_LINK_DAYS` passe de 30 à 14 jours. Justification : le PDF signé est envoyé en pièce jointe au client et à Aurore ; il reste disponible sans limite dans l'espace client et dans l'admin. Le lien public sans connexion ne sert qu'au téléchargement juste après la signature ; 14 jours couvrent un oubli ou un e-mail tardif tout en limitant l'exposition d'un lien transféré.
- Journalisation de chaque téléchargement par lien public : `console.info` avec l'identifiant de la signature et l'âge du lien en jours, sans nom, e-mail, IP ni jeton.
- Format des jetons inchangé.

### 4. Export RGPD complet (`lot0bis-export-rgpd`)
- `lib/clientExport.js` ajoute `devis` (numéro, dates, statut, montants, message, adresse d'envoi, dates d'envoi et d'acceptation), `lignes` dans chaque devis (description, quantité, prix unitaire, total) et `photos` (identifiant, date, date et animal de la visite ; pas les fichiers ni leurs adresses de stockage).
- Compatibilité : toutes les clés existantes restent identiques ; seules des clés sont ajoutées. La note de l'export mentionne que les fichiers photos sont fournis sur demande.
- La construction de l'objet est séparée de l'accès à la base (`assembleClientExport`) pour être testée sans base.

## Planifié, à décider par Timothé

### A. Lien d'activation à la place du mot de passe provisoire
- Aujourd'hui : Aurore crée l'accès, un mot de passe provisoire part en clair par e-mail, changement imposé à la première connexion.
- Proposé : jeton à usage unique (32 octets, haché en base, table `activation_tokens`), valable 72 h, page `/activer/[jeton]` où le client choisit son mot de passe ; renvoi possible depuis la fiche client ; aucun mot de passe dans un e-mail.
- Impacts : nouvelle table et route publique (limitation des essais), nouveau modèle d'e-mail ; les comptes existants ne changent pas. Risque : un client qui laisse expirer le lien doit demander un renvoi.
- Ordre : table et route, puis bascule de la création d'accès, puis suppression du mot de passe provisoire.

### B. CSP stricte avec nonces, sans `unsafe-inline`
- Aujourd'hui (`next.config.mjs`) : `script-src 'self' 'unsafe-inline'` et `style-src 'self' 'unsafe-inline'`.
- Proposé : nonce par requête généré dans `proxy.js`, transmis par en-tête et lu par Next.js pour ses scripts ; JSON-LD de l'accueil et script de thème avec ce nonce ; `style-src` garde `unsafe-inline` dans un premier temps (styles en ligne de React et des e-mails PDF), à retirer ensuite.
- Impacts : toutes les pages deviennent dynamiques (plus de mise en cache statique de l'accueil), risque de page blanche si un script oublie le nonce. Déploiement d'abord en `Content-Security-Policy-Report-Only` pendant une semaine, puis en mode bloquant.

### C. Cookies `__Host-`
- Proposé : `__Host-petsitter_session`, `__Host-petsitter_mfa` (secure, path `/`, sans domaine) ; `proxy.js` et `lib/auth.js` lisent le nouveau nom.
- Impact : **tout le monde est déconnecté une fois** (Aurore et les clients) ; en développement local (http), le préfixe impose HTTPS. Mitigation : lire l'ancien nom pendant 30 jours et réécrire le nouveau à la volée ; à grouper avec une autre opération qui déconnecte déjà (rotation de `JWT_SECRET`).

## Ordre conseillé
1 à 4 (indépendants, fusion dans n'importe quel ordre) ; puis C groupé avec la rotation de `JWT_SECRET` ; puis A ; puis B en mode rapport.

## Vérification
`bun build --no-bundle` par fichier ; `bun test tests/` (export RGPD) ; à l'écran par Timothé : page `/confidentialite`, téléchargement « Mes données » dans l'espace client, lien PDF d'un contrat signé récent.
