# Lot 1 : fondations UI

Date : 2026-11-02. Statut : à relire par Timothé avant le plan d'implémentation.
Origine : `docs/lots/lot-1-fondations-ui.md`, conception validée section par section le 2026-11-02.

## Objectif
Un socle visuel et d'accessibilité commun avant de retoucher les écrans (lots 2 à 4) : noms partagés pour les couleurs, tailles et espacements, focus clavier visible, champs lisibles et correctement étiquetés, pages d'attente et d'erreur, fin des fenêtres `alert()` / `confirm()` du navigateur.
Aucun changement d'identité : papier, lin, sable, encre, pierre, trait, rouille, mousse, miel, brique ; Fraunces et Atkinson Hyperlegible ; Phosphor ; aucun emoji.

## Critères de réussite
- Navigation complète au clavier, avec un focus toujours visible, sur la connexion, le planning et le formulaire de visite.
- Bordures de champs et anneau de focus à 3:1 minimum contre leur fond, en clair et en sombre.
- Chaque champ des quatre formulaires a un libellé relié (`htmlFor` / `id`).
- Plus aucun `alert(`, `confirm(` ni `prompt(` dans `app/` et `components/`.
- Aucune régression visuelle sur la vitrine (captures mobiles avant / après, ou contrôle à l'écran par Timothé).

## Hors périmètre
Refonte des écrans (lots 2 à 4) ; validation champ par champ des formulaires ; nouvelles couleurs d'identité.

## Découpage
Quatre branches, chacune partie de `origin/main`, fusionnée seulement sur « Merge » : `lot1a-socle-css`, `lot1b-field`, `lot1c-etats-page`, `lot1d-dialogues`. L'ordre compte : 1b utilise les classes de 1a ; 1d utilise les tokens de 1a.

## 1a. Socle CSS (`app/globals.css`, `docs/IDENTITE_VISUELLE.md`)

### Couleurs
- Chaque couleur est déclarée une seule fois avec `light-dark(<clair>, <sombre>)`. `:root` porte `color-scheme: light dark` ; `:root[data-theme="light"]` porte `color-scheme: light` ; `:root[data-theme="dark"]` porte `color-scheme: dark`. Les deux blocs sombres actuels (media query et `data-theme="dark"`) disparaissent, y compris les surcharges des teintes Tailwind (`amber`, `blue`, `emerald`, `red`, `stone`), converties de la même façon.
- Valeurs inchangées pour toutes les couleurs existantes.
- Nouvelle couleur `bord` (bordures de champs, cases, pilules de saisie) : clair `#8C8174`, sombre `#7D7266`. Contrastes mesurés : clair 3,5:1 sur lin, 3,2:1 sur papier ; sombre 3,7:1 sur lin, 4,0:1 sur papier. `trait` reste pour les filets et cartes.
- `themeColor` de `app/layout.js` inchangé.

### Échelle nommée (exposée à Tailwind via `@theme`)
| Nom | Valeur | Usage |
|---|---|---|
| `text-titre-1` | `clamp(28px, 4vw, 32px)`, interligne 1.15 | titres de page (h1) |
| `text-titre-2` | 20px, interligne 1.25 | titres de section (h2) |
| `text-corps` | 16px, interligne 1.5 | texte courant |
| `text-legende` | 13px, interligne 1.35 | libellés, aide, métadonnées |
| `.chiffres` | `tabular-nums` | heures, prix, compteurs (alias de `.num`, conservé) |

Espacements nommés (base 4px) : `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-6` 24px, `--space-8` 32px. Rayons : `--radius-carte` 8px (cartes, champs, boutons), `--radius-pilule` 999px (avatars, pastilles, pilules, bouton « + »). Les classes existantes `.label`, `.card`, `.input`, `h1`, `h2` utilisent ces noms ; rendu identique.

### Focus
- Règle globale `:focus-visible` sur `a, button, input, select, textarea, summary, [tabindex], .pill-input, .weekday-pill` : `outline: 2px solid var(--color-rouille); outline-offset: 2px;`. Contraste de la rouille : 5,2:1 sur papier clair, 6,2:1 sur papier sombre.
- Les règles `:focus` actuelles (`.input:focus`, `.pill-input:focus`) deviennent `:focus-visible`. Aucun `outline: none` sans remplacement.
- Sur la barre de navigation encre, l'anneau utilise `--color-nav-actif`.

### Boutons
- `.btn-sm` : `min-height: 36px; padding: 0.35rem 0.75rem; font-size: 14px`. Combinable avec `.btn-primary` / `.btn-ghost`.
- `.btn-danger` : comme `.btn-ghost`, texte brique.
- Remplace les 8 usages de `!py-…`, `!px-…`, `!text-brique`, `!min-h-…`, `!pl-…` (NewInvoiceForm, TaskChecklist, DeleteInvoiceButton, PhotoUploader, NewVisitForm ×3, VisitCard). Le `font-size: 16px !important` anti-zoom iOS sur mobile reste.
- Les cibles tactiles restent à 44px minimum sauf `.btn-sm` (36px), réservé aux actions secondaires à côté d'un autre contrôle.

### Nettoyage
`.ios-field-group`, `.ios-field-row`, `.ios-field-label` deviennent `.field-group`, `.field-row`, `.field-row-label` (rendu identique ; seul `NewVisitForm` les utilise). `.input` passe sur `--color-bord`.

### Documentation
`docs/IDENTITE_VISUELLE.md` : tableau des couleurs avec `bord`, échelle nommée, espacements, rayons, règle de focus, `btn-sm` / `btn-danger`.

## 1b. Composant `Field`

### `components/Field.jsx` (client)
- Props : `label` (texte, obligatoire), `hint`, `error`, `required`, `className`, `children` (un seul élément : `input`, `select` ou `textarea`).
- Génère un identifiant avec `useId()` (ou utilise l'`id` déjà présent sur l'enfant) et l'injecte dans l'enfant avec `cloneElement`, ainsi que `aria-describedby` (aide et erreur) et `aria-invalid` quand `error` est présent. `required` est aussi transmis à l'enfant.
- Rendu : `<label htmlFor>` en `text-legende` gras pierre, suivi de « (obligatoire) » en texte normal si `required` ; l'enfant ; l'aide en `text-legende` pierre ; l'erreur en `text-legende` brique précédée de l'icône Phosphor `WarningCircle` (16px, `aria-hidden`), dans un élément `aria-live="polite"`.

### `components/FieldSet.jsx`
- Props : `legend`, `hint`, `error`, `children`. Rendu `<fieldset>` + `<legend>` avec les mêmes styles que `Field`, sans bordure par défaut. Sert aux jours de la semaine, durées, types de prestation et groupes de pilules date / heure (`.field-group`).

### Adoption
`components/NewVisitForm.jsx`, `components/SettingsForm.jsx`, `components/NewInvoiceForm.jsx`, `app/admin/clients/new/page.js` : chaque couple libellé + champ passe par `Field` ; chaque groupe de choix par `FieldSet`. Aucune modification de l'état, des appels d'API ni des données envoyées. Les messages d'erreur globaux existants restent à leur place.

## 1c. États de page

Fichiers (conventions vérifiées dans la documentation de Next.js 16 avant le plan) :
- Racine : `app/loading.js`, `app/error.js`, `app/not-found.js`, `app/global-error.js`.
- Admin : `app/admin/loading.js`, `app/admin/error.js`, `app/admin/not-found.js`.
- Portail : `app/portal/loading.js`, `app/portal/error.js`, `app/portal/not-found.js`.

Contenu :
- **Chargement** : blocs sable statiques (sans animation) imitant un titre et trois lignes de liste, et le texte « Chargement… » pour les lecteurs d'écran (`role="status"`). La navigation de l'admin et du portail reste affichée (le fichier est dans le segment, sous la mise en page).
- **Erreur** : titre « Cette page n'a pas pu s'afficher. », bouton « Réessayer » (relance du segment selon l'API de Next 16), lien de retour (« Aujourd'hui » dans l'admin, accueil du portail, accueil public). Jamais le message de l'erreur ; seulement la référence `digest` en `text-legende` pierre si elle existe. `global-error.js` reprend le même contenu avec ses propres `<html>` et `<body>` et des styles autonomes.
- **Introuvable** : public « Cette page n'existe pas (ou plus). » + liens accueil et « Demander un rendez-vous » (`/#contact`) ; admin « Introuvable. Le client ou la visite a peut-être été supprimé. » + retour « Aujourd'hui » ; portail « Cette page n'existe pas. » + retour à l'espace client.
- Ton : tutoiement admin, vouvoiement public et portail. Aucune illustration (fond papier).

## 1d. Dialogue et notifications

### `components/ui/UiProvider.jsx` (client)
Placé dans `app/admin/layout.js` et `app/portal/layout.js` (et `app/admin/clients/new/page.js` en hérite). Fournit deux crochets :
- `useConfirm()` → `confirmer({ titre, message, action = "Confirmer", annuler = "Annuler", danger = false }): Promise<boolean>`.
- `useToast()` → `{ succes(texte), erreur(texte) }`.

### Boîte de dialogue
- Élément `<dialog>` ouvert par `showModal()` : arrière-plan inerte, Échap = annuler, focus rendu à l'élément d'origine à la fermeture.
- Classe `.modal` existante (lin, rayon 8px, seule ombre autorisée), largeur max 420px, marges 16px sur mobile.
- Titre `text-titre-2` (Fraunces), message `text-corps` (sauts de ligne conservés).
- Boutons : principal `.btn-primary` (ou fond brique si `danger`), « Annuler » `.btn-ghost`. Focus initial sur « Annuler » si `danger`, sinon sur le bouton principal.
- Un seul dialogue à la fois ; un second appel pendant qu'un dialogue est ouvert attend sa fermeture.

### Notifications
- Zone fixe en bas, centrée, au-dessus de la barre d'onglets mobile (respecte `env(safe-area-inset-bottom)`), largeur max 420px.
- Succès : pastille mousse + texte, `role="status"`, disparaît après 5 s. Erreur : pastille brique + texte, `role="alert"`, reste jusqu'à fermeture (bouton « Fermer », icône Phosphor `X`).
- Au plus trois notifications visibles ; les plus anciennes partent d'abord.

### Remplacements (16 fichiers)
`app/admin/accounting/ExpensesManager.jsx`, `app/admin/clients/new/page.js`, `app/admin/site-photos/SitePhotosManager.jsx`, `components/AdminEvents.jsx`, `components/ClientContractCard.jsx`, `components/ClientDataExportCard.jsx`, `components/ClientInfoCard.jsx`, `components/ClientLoginManager.jsx`, `components/ClientQuotesCard.jsx`, `components/DeleteInvoiceButton.jsx`, `components/DepositManager.jsx`, `components/PetManager.jsx`, `components/PhotoUploader.jsx`, `components/SettingsForm.jsx`, `components/VisitEditPanel.jsx`, `components/VisitHistory.jsx`.
- Chaque `confirm(texte)` devient `await confirmer({...})` ; le texte actuel est repris, découpé en titre (première phrase) et message (le reste). `danger: true` pour les suppressions, avoirs et révocations.
- Chaque `alert(texte)` devient `toast.erreur(texte)` ou `toast.succes(texte)` selon le cas, ou un message dans le formulaire s'il en affiche déjà.

## Vérification
- `bun build --no-bundle` sur chaque fichier modifié ou créé.
- Tests `bun test` : contrastes de `bord` et de la rouille calculés depuis les valeurs de `globals.css` (≥ 3:1) ; rendu de `Field` (id, `htmlFor`, `aria-describedby`, `aria-invalid`) ; balayage des 4 formulaires (chaque `input` / `select` / `textarea` dans un `Field`, un `FieldSet` ou avec un `aria-label`) ; absence de `alert(` / `confirm(` / `prompt(`.
- Better Design `get-review-rules` (scope app) sur les composants nouveaux.
- Captures mobiles avant / après de la vitrine et de l'admin sur le déploiement de prévisualisation Vercel de chaque branche, si l'accès est possible depuis la session ; sinon contrôle à l'écran par Timothé, signalé dans le rapport.

## Risques
- `light-dark()` : non reconnu par les navigateurs antérieurs à 2024 (Safari < 17.5). Repli : ces navigateurs verraient le thème clair. Accepté.
- Adoption de `Field` dans `NewVisitForm` (722 lignes) : risque de régression de mise en page ; captures ou contrôle à l'écran obligatoire avant « Merge ».
- `cloneElement` est déconseillé par la documentation React pour les nouvelles API, mais reste supporté ; choisi pour limiter les changements dans les formulaires.
