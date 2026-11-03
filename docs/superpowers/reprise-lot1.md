# Reprise du lot 1 (pause du 2026-11-03)

Spec : `docs/superpowers/specs/2026-11-02-lot1-fondations-ui-design.md` · plan : `docs/superpowers/plans/2026-11-03-lot1-fondations-ui.md` (branche `lot1-spec`).

## État
- `lot1a-socle-css` (depuis main) : terminée et poussée (tâches 1 à 3 : light-dark, `bord`, échelle nommée, focus visible, btn-sm/btn-danger, fin des `!important` dans 18 fichiers, `.field-*`, doc).
- `lot1c-etats-page` (depuis main) : terminée et poussée (tâche 4 : loading/error/not-found/global-error, `retry` de Next 16.3).
- `lot1b-field` (depuis lot1a) : tâche 5 faite (`Field`, `FieldSet`, 7 tests). Tâche 6 commencée : test `tests/forms-labels.test.mjs` écrit, échoue (6/8) — commit « WIP ».
- `lot1d-dialogues` : pas commencée.

## Prochaine tâche
Tâche 6 : adopter `Field` dans `app/admin/clients/new/page.js` (renommer le `Field` local en `TextField` qui délègue au `Field` partagé ; textarea « Notes » et mot de passe dans `Field`), `SettingsForm.jsx` (même principe + textarea du contrat), `NewInvoiceForm.jsx`, `NewVisitForm.jsx` (pilules dans `FieldSet` avec `aria-label`). Ne pas toucher aux données envoyées. Puis tâches 7-8 (`lot1d-dialogues` depuis lot1a, 17 fichiers dont `TestimonialsManager.jsx`).

## Ordre de fusion
1a, 1c, 1b, 1d.

## Tests
Dépendent de react, react-dom, @phosphor-icons/react installés (`npm install`), et Tailwind 4.3.3 pour compiler le CSS.
