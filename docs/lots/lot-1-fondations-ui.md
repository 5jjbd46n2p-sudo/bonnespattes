# Lot 1 : fondations UI

Objectif : un socle visuel et d'accessibilité commun avant de retoucher les écrans. Aucun changement d'identité : on garde papier, lin, sable, encre, pierre, rouille, mousse, miel, Fraunces et Atkinson Hyperlegible.

## Tâches
1. **Tokens et échelle typographique nommée** dans `app/globals.css` (titres, corps, légende, chiffres), espacements et rayons nommés. Mettre à jour `docs/IDENTITE_VISUELLE.md`.
2. **`:focus-visible` global** : anneau visible sur tous les éléments interactifs, contraste 3:1 minimum.
3. **Bordures de champs** à contraste 3:1 contre le fond (clair et sombre).
4. **Composant `Field`** (label relié par `htmlFor`/`id`, aide, erreur annoncée) et adoption dans `NewVisitForm`, `SettingsForm`, `NewInvoiceForm`, `app/admin/clients/new/page.js`.
5. **États de page** : `loading.js`, `error.js`, `not-found.js` (racine, `app/admin`, `app/portal`), ton « carnet de balade ».
6. **Fin des `alert()` / `confirm()`** : remplacer par une boîte de dialogue et un toast accessibles. Fichiers concernés : `SitePhotosManager`, `ExpensesManager`, `clients/new`, `DeleteInvoiceButton`, `PhotoUploader`, `VisitEditPanel`, `DepositManager`, `ClientLoginManager`, `SendInvoiceButton`, `VisitHistory`, `SettingsForm`, `ClientInfoCard`, `ClientDataExportCard`, `PetManager`, `ClientQuotesCard`, `AdminEvents`, `ClientContractCard`.
7. **Variante `btn-sm`** pour supprimer les `!important` des boutons.
8. **Nettoyage de `globals.css`** : retirer les classes `.ios-*` (4 occurrences) et le bloc sombre dupliqué.

## Vérification
- Navigation au clavier complète sur login, planning, formulaire de visite.
- Contraste vérifié avec Better Design (`get-review-rules`, scope app).
- Aucune régression visuelle sur la vitrine (comparaison avant/après en captures mobiles).

## Hors périmètre
Refonte des écrans eux-mêmes (lots 2 à 4).
