# Feuille de route par lots

Décision : refonte éditoriale par lots, en gardant l'identité « carnet de balade » (voir `../IDENTITE_VISUELLE.md`), la sécurité critique d'abord.

| Lot | Sujet | État | Document |
|---|---|---|---|
| 0 | Sécurité critique (sceau des contrats, 2FA, essais, facturation, données sensibles) | Phase A fusionnée, phases B à F à faire | `../superpowers/specs/2026-11-02-securite-lot0-design.md` et `../superpowers/plans/2026-11-02-securite-lot0.md` |
| 0 bis | Sécurité de second rang | À faire | `lot-0bis-securite.md` |
| 1 | Fondations UI | À faire | `lot-1-fondations-ui.md` |
| 2 | Vitrine | À faire | `lot-2-vitrine.md` |
| 3 | Portail client | À faire | `lot-3-portail-client.md` |
| 4 | Admin mobile | À faire | `lot-4-admin-mobile.md` |
| Avis | Avis clients (branche `avis`, en attente de « Merge avis ») | Prêt | voir la branche |

## Règles de travail communes
- Une branche par lot (ou par phase), repartir de `origin/main`, pousser, rapport court en français.
- Fusion dans `main` uniquement sur « Merge » de Timothé, puis vérifier que le déploiement Vercel est READY.
- Pas de build dans le bac à sable : `bun build --no-bundle <fichier>` un fichier à la fois, et signaler « non testé à l'écran ».
- Avant d'implémenter un lot : skill `superpowers:brainstorming` puis `superpowers:writing-plans`, approbation de Timothé à chaque étape.
- Migrations Neon appliquées à la main puis ajoutées de façon idempotente à `lib/schema.sql` ; instantané Neon avant toute migration risquée. Ne jamais toucher au projet `platemb`.
- Next.js 16 : lire `node_modules/next/dist/docs/` quand il existe ; les routes n'exportent que des handlers.
- Superdesign : demander à Timothé avant (connexion navigateur, crédits).
