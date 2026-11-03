# Reprise lot 0 bis (pause du 2026-11-03)

## Fait
- `lot0bis-spec`, `lot0bis-confidentialite`, `lot0bis-dependances`, `lot0bis-lien-pdf-contrat`, `lot0bis-export-rgpd` : poussées (les 3 dernières déjà fusionnées dans main).
- `lot0bis-cookies-host` (C) : terminée, poussée. Fusion à grouper avec la rotation de `JWT_SECRET` (déconnecte tout le monde une fois).
- `lot0bis-activation` (A, cette branche, WIP) : faits — `lib/activation.js` (+ tests), `lib/activationStore.js` (+ tests usage unique), migration `docs/superpowers/migrations/lot0bis-activation.sql` + `lib/schema.sql`, `sendActivationEmail`, route `POST /api/activation/[token]`, page `/activer/[token]`, routes `/api/clients/[id]/login` et `/api/clients` basculées, `ClientLoginManager` réécrit, statut d'activation sur la fiche client.

## Prochaines tâches (A)
1. `app/admin/clients/new/page.js` : retirer le champ mot de passe, afficher le lien d'activation (`data.activationLink`) si l'e-mail n'est pas parti.
2. `proxy.js` : ajouter `/activer` à `PRIVATE_PREFIXES` (noindex).
3. `lib/privacy.js` `applyRetention` : purger les jetons expirés ou utilisés depuis plus de 7 jours.
4. `bun build` sur tous les fichiers, `bun test tests/`, commit final (sans « WIP »), push.

## Ensuite (B, étape 1)
`lot0bis-csp-report` : nonce par requête dans `proxy.js`, CSP stricte en `Content-Security-Policy-Report-Only` (CSP actuelle inchangée), nonce sur le JSON-LD et le script de thème ; vérifier la doc Next.js 16 (nextjs.org, guide CSP) pour la transmission du nonce.

## À la fusion de A
Appliquer `docs/superpowers/migrations/lot0bis-activation.sql` sur Neon AVANT le déploiement.
