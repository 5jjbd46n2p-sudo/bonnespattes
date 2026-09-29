# Sécurité et RGPD : ce qui est en place

## Protections
- **Accès** : chaque page admin/portail vérifie elle-même la session (`adminPageGuard` / `clientPageGuard`), en plus du `proxy.js` qui bloque avant tout rendu. Ne jamais protéger une page par son seul layout.
- **Sessions** : JWT signé, audience `session`, version de session en base (`users.session_version`) : déconnexion, changement ou réinitialisation de mot de passe et activation de la 2FA révoquent toutes les sessions. Admin 7 jours, client 30 jours.
- **Connexion** : temps de réponse identique compte existant ou non, verrouillage du compte après 6 échecs, 20 essais max / 15 min par IP (`rate_limit_hits`, IP hachée), empreintes bcrypt coût 12 (les anciennes sont renforcées à la connexion).
- **Double authentification admin** (TOTP, Réglages > Sécurité), anti-rejeu, mot de passe exigé pour l'activer/désactiver.
- **Mots de passe** : 12 caractères minimum ; mot de passe provisoire d'un client à changer à la première connexion.
- **CSRF** : `proxy.js` refuse toute écriture `/api` venant d'un autre site (Origin / Sec-Fetch-Site).
- **En-têtes** : CSP stricte (images servies par le site uniquement), HSTS, COOP/CORP, `X-Robots-Tag: noindex` sur les pages privées, PDF financiers `no-store`.
- **Base** : certificat TLS vérifié.
- **Alertes email** à l'admin : changement d'IBAN, de mot de passe admin, désactivation de la 2FA.

## Comptabilité (obligations légales)
- Une facture émise ne peut être ni supprimée, ni repassée en brouillon, ni passée en test : on l'annule par un **avoir** (`/api/invoices/[id]/credit-note`).
- `invoices.client_id` est en `ON DELETE RESTRICT` : supprimer un client avec factures l'**anonymise** (`lib/privacy.js`).

## RGPD
- Durées de conservation dans `lib/privacy.js` (`RETENTION`), appliquées chaque nuit par `/api/cron/retention` (Vercel Cron, `vercel.json`) et reprises automatiquement dans `/confidentialite`.
- Toute nouvelle donnée collectée doit être ajoutée à la politique de confidentialité (finalité, base légale, durée).

## À faire par la propriétaire
1. Passer le dépôt GitHub en **privé** (Settings > General > Danger Zone > Change visibility).
2. Variables Vercel : `CRON_SECRET` et `LEAD_IP_SALT` (`openssl rand -hex 32`) ; remplacer `JWT_SECRET` par une valeur de 64 caractères (déconnecte tout le monde une fois).
3. Exécuter `lib/schema.sql` sur la base Neon de production (`npm run migrate`).
4. Activer la double authentification dans Réglages > Sécurité.
5. Recommandé : base Neon en région européenne (aws-eu-central-1) au lieu de us-east-2.
6. Vérifier que les accords de traitement (DPA) de Vercel, Neon et Resend sont acceptés dans leurs consoles.
