# Lot 1 fondations UI : plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans (choisi : exécution « Native » par l'agent Lot 1). Étapes en cases à cocher.

**Objectif :** socle visuel et d'accessibilité commun (tokens, focus, bordures, `Field`, états de page, dialogue/notifications) sans changer l'identité « carnet de balade ».

**Architecture :** tokens CSS dans `app/globals.css` via `light-dark()` exposés à Tailwind v4 par `@theme inline` ; deux composants de formulaire (`Field`, `FieldSet`) ; fichiers de convention Next 16 par segment ; un fournisseur client (`UiProvider`) qui expose `useConfirm()` et `useToast()` dans l'admin et le portail.

**Pile :** Next.js 16.3.7 App Router, React 19.2, Tailwind v4, @phosphor-icons/react.

**Spécification :** `docs/superpowers/specs/2026-11-02-lot1-fondations-ui-design.md`.

## Contraintes globales
- Quatre branches parties de `origin/main` : `lot1a-socle-css`, `lot1b-field`, `lot1c-etats-page`, `lot1d-dialogues`. 1b et 1d dépendent des classes de 1a (`.field-row`, `text-legende`, `btn-danger`) : elles partent de `lot1a-socle-css` ; 1c part de `origin/main` (aucune dépendance). Ordre de fusion : 1a, 1c, 1b, 1d.
- Ne jamais toucher `app/page.js` ni `components/landing/*` (vitrine refaite en parallèle).
- Aucune modification des données envoyées par les formulaires ; couleurs inchangées sauf `bord` (#8C8174 clair / #7D7266 sombre).
- `bun build --no-bundle <fichier>` sur chaque fichier modifié ou créé ; tests `bun test tests/` (dépendances de test React installées hors dépôt, `node_modules` ignoré par git).
- Textes : tutoiement admin, vouvoiement public et portail, aucun emoji, icônes Phosphor.
- Conventions Next 16.3 (vérifiées dans `next@16.3.7/dist/docs`) : `error.js` / `global-error.js` = `"use client"`, props `{ error, retry }` (`retry()` stable depuis 16.3) ; `error.digest` à afficher ; `global-error.js` rend `<html lang="fr"><body>`, pas de `metadata` (utiliser `<title>`), pas de styles globaux (styles en ligne) ; `not-found.js` et `loading.js` sans props, composants serveur ; `app/not-found.js` sert aussi les URL inconnues.
- Commits en français avec trailers `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` et `Claude-Session: https://claude.ai/code/session_01UDBZYwjhnRcqfgzYGzF2Uu`. Push sans jamais fusionner dans `main`.

## Points d'attention
1. **Thème forcé** : `data-theme="light"` doit donner les couleurs claires même si le système est sombre, et `data-theme="dark"` l'inverse. Test : le CSS contient `:root[data-theme="light"]{color-scheme:light}` et `:root[data-theme="dark"]{color-scheme:dark}`, et aucune couleur n'est redéclarée dans une media query.
2. **Champ déjà doté d'un `id`** dans `Field` : l'`id` existant est conservé et le `htmlFor` le reprend. Test dans `tests/field.test.mjs`.
3. **Champs groupés sans libellé texte** (pilules date/heure, jours) : chaque contrôle reçoit un `aria-label` explicite. Test de balayage des formulaires.
4. **Dialogue ouvert pendant un second appel** : le second attend la fermeture du premier (file). Test sur la file de `UiProvider` (logique extraite dans `lib/uiQueue.js`).
5. **Erreur serveur sans message** : `error.js` n'affiche jamais `error.message`, seulement `digest`. Test de contenu des fichiers.

---

## Branche `lot1a-socle-css` (depuis origin/main)

### Tâche 1 : tokens `light-dark()`, `bord`, échelle nommée
**Fichiers :** `app/globals.css`, `tests/tokens.test.mjs`.
- [ ] Test (échoue) : lit `app/globals.css` ; extrait chaque `--color-<nom>: light-dark(<clair>, <sombre>)` ; vérifie que `papier`, `lin`, `sable`, `encre`, `pierre`, `trait`, `rouille`, `rouille-fonce`, `mousse`, `miel`, `brique` gardent les valeurs actuelles (clair et sombre) ; `bord` = `#8c8174` / `#7d7266` ; contraste (formule WCAG) de `bord` ≥ 3 sur `lin` et `papier` dans chaque thème ; `rouille` ≥ 3 sur `papier` et `lin` dans chaque thème ; aucune déclaration `--color-papier` sous `@media (prefers-color-scheme` ; présence de `:root[data-theme="light"]` avec `color-scheme: light` et `:root[data-theme="dark"]` avec `color-scheme: dark`.
- [ ] Implémenter : `:root { color-scheme: light dark; --color-x: light-dark(a, b); … }` pour toutes les couleurs, y compris les teintes Tailwind sombres (`amber-*`, `blue-*`, `emerald-*`, `red-*`, `stone-*` : `light-dark(<valeur Tailwind par défaut>, <valeur sombre actuelle>)`) ; `--shadow-modal` en `light-dark` impossible (pas une couleur) : deux variables `--shadow-modal-clair` / `--shadow-modal-sombre` et sélection par `[data-theme]` + media query limitée à cette seule propriété. Suppression des deux blocs sombres. `@theme inline` : `--color-bord`, `--text-titre-1` (clamp(28px, 4vw, 32px)), `--text-titre-1--line-height: 1.15`, `--text-titre-2` 20px / 1.25, `--text-corps` 16px / 1.5, `--text-legende` 13px / 1.35, `--radius-carte: 8px`, `--radius-pilule: 999px`, `--spacing-*` non redéfini (Tailwind en base 4px) ; variables `--space-1…8` dans `:root`. `.chiffres` alias de `.num`.
- [ ] `bun test tests/tokens.test.mjs` → PASS ; commit « Socle CSS : couleurs en light-dark(), bordure de champ à 3:1, échelle nommée ».

### Tâche 2 : focus, boutons, nettoyage
**Fichiers :** `app/globals.css`, `components/NewInvoiceForm.jsx`, `components/TaskChecklist.jsx`, `components/DeleteInvoiceButton.jsx`, `components/PhotoUploader.jsx`, `components/NewVisitForm.jsx`, `components/VisitCard.jsx`, `tests/css-cleanup.test.mjs`.
- [ ] Test (échoue) : aucune classe `!py-`, `!px-`, `!text-`, `!min-h-`, `!pl-` dans `components/` et `app/` (hors `app/page.js` et `components/landing/`) ; aucune occurrence de `ios-field` ; `globals.css` contient une règle `:focus-visible` avec `outline: 2px solid var(--color-rouille)` et `outline-offset: 2px`, `.btn-sm`, `.btn-danger`, `.field-group`, `.field-row`, `.field-row-label` ; `.input` utilise `var(--color-bord)`.
- [ ] Implémenter selon la spec §1a (Focus, Boutons, Nettoyage). Remplacements : `!py-1 !px-3` / `!py-1.5 !px-3` / `!px-3` → `btn-sm` ; `!text-brique` → `btn-danger` ; `input !min-h-[40px] !pl-10` → classe `input input-icone` (`min-height: 40px; padding-left: 2.5rem`). Barre de navigation : `.tabbar :focus-visible, nav[data-nav] :focus-visible { outline-color: var(--color-nav-actif) }` (vérifier les sélecteurs réels d'AdminNav/MobileNav).
- [ ] `bun test` → PASS ; `bun build` de chaque fichier ; commit « Socle CSS : focus visible, btn-sm et btn-danger, classes field-* ».

### Tâche 3 : documentation
- [ ] `docs/IDENTITE_VISUELLE.md` : ajouter `bord`, échelle nommée, espacements, rayons, focus, `btn-sm` / `btn-danger`, `light-dark()`. Commit « Identité visuelle : socle du lot 1 ». Push.

## Branche `lot1c-etats-page` (depuis origin/main)

### Tâche 4 : chargement, erreur, introuvable
**Fichiers :** `app/{loading,error,not-found,global-error}.js`, `app/admin/{loading,error,not-found}.js`, `app/portal/{loading,error,not-found}.js`, `components/PageStates.jsx`, `tests/page-states.test.mjs`.
- [ ] Test (échoue) : les 10 fichiers existent ; `error.js` et `global-error.js` commencent par `"use client"`, utilisent `retry` et `digest`, n'affichent jamais `error.message` ; `global-error.js` contient `<html lang="fr">` et `<body` ; `loading.js` contient `role="status"` et « Chargement… » ; textes exacts de la spec §1c (admin tutoiement « Introuvable. Le client ou la visite a peut-être été supprimé. », public « Cette page n'existe pas (ou plus). », portail « Cette page n'existe pas. », erreur « Cette page n'a pas pu s'afficher. ») ; aucun emoji.
- [ ] Implémenter : `components/PageStates.jsx` exporte `LoadingBlocks()` (serveur), `ErrorState({ digest, onRetry, backHref, backLabel })` (client), `NotFoundState({ title, text, links })` ; chaque fichier de convention les compose. `global-error.js` : styles en ligne avec les valeurs papier/encre/rouille, sans import CSS.
- [ ] `bun test` → PASS ; `bun build` ×11 ; commit « États de page : chargement, erreur et page introuvable (racine, admin, portail) ». Push.

## Branche `lot1b-field` (depuis lot1a-socle-css)

### Tâche 5 : composants `Field` et `FieldSet`
**Fichiers :** `components/Field.jsx`, `components/FieldSet.jsx`, `tests/field.test.mjs`.
- [ ] Test (échoue, rendu `react-dom/server`) : `<Field label="Nom"><input className="input"/></Field>` produit un `<label for=X>` et un `<input id=X>` identiques ; avec `hint` → `aria-describedby` contient l'id de l'aide ; avec `error` → `aria-invalid="true"`, l'id de l'erreur dans `aria-describedby`, un élément `aria-live="polite"` contenant le texte ; `required` → texte « (obligatoire) » et attribut `required` sur l'enfant ; enfant avec `id="perso"` → `for="perso"` ; `FieldSet` rend `<fieldset>` + `<legend>`.
- [ ] Implémenter selon la spec §1b (`useId`, `cloneElement`, `WarningCircle` 16px `aria-hidden`). Commit « Composants Field et FieldSet ».

### Tâche 6 : adoption dans les quatre formulaires
**Fichiers :** `components/SettingsForm.jsx` (le `Field` local délègue au composant partagé ; libellé du modèle de contrat), `components/NewInvoiceForm.jsx`, `app/admin/clients/new/page.js`, `components/NewVisitForm.jsx`, `tests/forms-labels.test.mjs`.
- [ ] Test (échoue) : pour chaque fichier, chaque `<input`, `<select`, `<textarea` (hors `type="hidden"`) est soit enfant direct d'un `<Field` (contrôle : la balise ouvrante précédente non fermée la plus proche est `<Field`), soit porteur d'un `aria-label=`, soit dans un `<FieldSet` avec `aria-label` ; aucun `<label` sans `htmlFor` restant.
- [ ] Implémenter sans toucher à l'état, aux handlers ni aux corps de requête ; `bun build` ×4 ; vérifier par `git diff` qu'aucune ligne `fetch(`, `JSON.stringify(` ou `useState(` n'a changé. Commit « Formulaires : libellés reliés via Field ». Push.

## Branche `lot1d-dialogues` (depuis lot1a-socle-css)

### Tâche 7 : `UiProvider`
**Fichiers :** `lib/uiQueue.js`, `components/ui/UiProvider.jsx`, `app/admin/layout.js`, `app/portal/layout.js`, `tests/ui-queue.test.mjs`.
- [ ] Test (échoue) sur `lib/uiQueue.js` (pur) : `createDialogQueue()` → `enqueue(opts)` renvoie une promesse ; deux appels successifs : le second n'est présenté qu'après `resolveCurrent(true|false)` du premier ; `createToastStore({ max: 3 })` → `push({type, text})` conserve au plus 3 entrées (plus anciennes retirées), `dismiss(id)` ; durée 5000 ms pour `succes`, `null` pour `erreur`.
- [ ] Implémenter `UiProvider` : `<dialog>` + `showModal()`, `aria-labelledby`/`aria-describedby`, focus initial (« Annuler » si `danger`), Échap = `false`, focus rendu ; zone de notifications `role="status"` / `role="alert"`, bouton « Fermer » (`X`), `bottom: calc(env(safe-area-inset-bottom) + 72px)` sur mobile (au-dessus de la barre d'onglets), 16px sur ordinateur. Exporte `useConfirm`, `useToast`. Placé dans les deux mises en page. Commit « Dialogue de confirmation et notifications accessibles ».

### Tâche 8 : remplacement des 17 fichiers
- [ ] Test (échoue) `tests/no-native-dialogs.test.mjs` : aucune occurrence de `alert(`, `confirm(`, `prompt(` (appel, hors commentaires et hors `confirmer(`) dans `app/` et `components/` (hors `app/page.js` et `components/landing/`).
- [ ] Remplacer selon la spec §1d (titre = première phrase, message = reste, `danger` pour suppression / avoir / révocation ; `alert` → `toast.erreur` ou `toast.succes`). `bun build` ×17. Commit « Fin des alert() et confirm() ». Push.

## Fin
- [ ] Relecture de chaque branche contre la spec ; correctifs importants avec test qui échoue d'abord. Rapport.

## Couverture de la spec
§1a → tâches 1-3 · §1b → 5-6 · §1c → 4 · §1d → 7-8 · Vérification → tests de chaque tâche ; captures et Better Design : à l'écran, hors session (réseau).
