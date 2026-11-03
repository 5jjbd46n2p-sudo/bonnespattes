# Lot 4 — Admin mobile : plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche par tâche. Étapes en cases (`- [ ]`).

**Objectif :** qu'Aurore fasse tout au téléphone, à une main : barre d'onglets avec « Plus », actions de visite à 44 px avec libellé « Photo », formulaire de visite en étapes dépliantes, planning lisible, km administratifs du mois dans Charges.

**Architecture :** la configuration de navigation et la logique calculable (récapitulatif de visite, libellé accessible d'un jour, total km) sont extraites en modules purs testés (`lib/adminNav.js`, `lib/visitFormSummary.js`, `lib/planningLabels.js`, `lib/adminKm.js`) ; `NewVisitForm` garde son état et son appel `POST /api/visits` inchangés et délègue l'affichage à quatre composants d'étape.

**Pile :** Next.js 16 App Router, React 19, Tailwind v4, `@phosphor-icons/react`, `pg`.

**Spec :** `docs/superpowers/specs/2026-11-03-lot4-admin-mobile-design.md` (décisions validées le 2026-11-03).

## Dépendances
- **Après `lot1b-field` fusionnée dans `main`** : `NewVisitForm` est modifié par le lot 1 (`Field`, `FieldSet`, `.field-group`). Le lot 4 **repart de `origin/main` après la fusion du lot 1** (branche `lot4-admin-mobile`), jamais d'une branche du lot 1.
- Utilise aussi du lot 1 : `btn-sm` (interdit sur les actions de visite), `useConfirm`/`useToast` (1d) si fusionné ; sinon `<dialog>` direct pour la feuille « Plus ».

## Contraintes globales
- Tutoiement admin, court, factuel ; aucun emoji ; Phosphor `regular` (20 px interface, 24 px barre d'onglets) ; rouille seule couleur d'action ; libellés ≥ 13 px ; cibles ≥ 44 px.
- Aucune modification des données envoyées par `NewVisitForm` (`POST /api/visits`, mêmes champs, mêmes modes visite / garde à domicile / récurrence avec date de fin).
- Pas de build : `bun build --no-bundle <fichier>` ; logique pure par `bun test tests/<fichier>.test.mjs`.
- Aucune migration (`admin_events.travel_km` existe).
- Trailers : `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `Claude-Session: https://claude.ai/code/session_01UDBZYwjhnRcqfgzYGzF2Uu`. Fusion uniquement sur « Merge », **après test terrain par Aurore sur son téléphone**.

## Points d'attention (non couverts tels quels par la spec)
1. **Arrivée depuis le planning avec une date** (`/admin/visits/new?date=…`) ou depuis une fiche client (client fixé) : les étapes déjà connues sont préremplies et affichées comme faites (résumé + « Modifier »).
2. **Retour sur une étape faite** : « Modifier » rouvre l'étape sans perdre les étapes suivantes ; un changement de client réinitialise animal et prix conseillé comme aujourd'hui.
3. **Garde à domicile sans forfait journalier réglé** : l'étape Tarif affiche le message existant et bloque « Continuer » tant que le prix est vide.
4. **Feuille « Plus » ouverte puis navigation** : la feuille se ferme à la navigation ; le compteur de demandes reste lisible au lecteur d'écran.
5. **Mois sans tâche administrative** : « Km administratifs ce mois-ci : 0 km », pas de ligne masquée.

---

### Tâche 1 : barre d'onglets et feuille « Plus »

**Fichiers :** créer `lib/adminNav.js`, `components/MoreSheet.jsx`, `tests/adminNav.test.mjs` ; modifier `components/MobileNav.jsx`, `components/AdminNav.jsx`.

**Interfaces produites :**
- `MOBILE_TABS` : `[{href:"/admin",label:"Aujourd'hui",icon:"Sun",exact:true},{href:"/admin/planning",label:"Planning",icon:"CalendarBlank"},{href:"/admin/visits/new",label:"Planifier",icon:"Plus",primary:true},{href:"/admin/clients",label:"Clients",icon:"PawPrint"},{id:"more",label:"Plus",icon:"DotsThreeOutline"}]`.
- `MORE_ITEMS` : Compta `/admin/accounting` (Receipt), Charges `/admin/accounting?tab=charges` (Wallet), Demandes `/admin/leads` (Tray, compteur), Avis `/admin/avis` (Star), Photos du site `/admin/site-photos` (Image), Réglages `/admin/settings` (GearSix).
- `isMoreActive(pathname): boolean` (vrai sur toute route de `MORE_ITEMS`).
- `<MoreSheet open onClose newLeads />` : `<dialog>` modal ancré en bas, liste à filets, entrées 56 px, titre « Plus » masqué visuellement, fermeture sur Échap, clic hors feuille et navigation.

- [ ] **Étape 1 : tests (échouent)** : chaque dossier de `app/admin/*/page.js` de premier niveau (planning, clients, visits, accounting, leads, avis, site-photos, settings) est atteignable par `MOBILE_TABS` ou `MORE_ITEMS` ; `isMoreActive("/admin/avis") === true`, `isMoreActive("/admin/planning") === false` ; aucune entrée en double.
- [ ] **Étape 2 :** implémenter `lib/adminNav.js` ; tests → PASS.
- [ ] **Étape 3 :** `MobileNav` utilise `MOBILE_TABS`, onglet « Plus » ouvre `MoreSheet` (`aria-expanded`, `aria-controls`), libellés 13 px ; en-tête mobile : logo + recherche seulement. `AdminNav` (ordinateur) liste aussi Avis, Photos du site, Charges.
- [ ] **Étape 4 :** `bun build --no-bundle` sur les fichiers → OK. **Commit** « Admin mobile : onglet Plus ».

### Tâche 2 : actions des visites à 44 px

**Fichiers :** modifier `components/VisitCard.jsx`.

- [ ] **Étape 1 :** boutons Démarrer / Terminer / Photo / Itinéraire à `min-height: 44px` (classes `btn-primary` / `btn-ghost` sans `btn-sm` ni `!py`) ; Photo avec icône Camera + libellé visible « Photo » (« Envoi… » pendant l'envoi) ; ordre : action d'état, Photo, Itinéraire ; carte entière cliquable vers le détail (lien principal), « Détail » retiré ; glissement conservé.
- [ ] **Étape 2 :** contrôle : plus aucun `!py-`/`!px-` dans le fichier ; `bun build` → OK. **Commit** « Admin mobile : actions de visite à 44 px, libellé Photo ».

### Tâche 3 : récapitulatif de visite (logique pure)

**Fichiers :** créer `lib/visitFormSummary.js`, `tests/visitFormSummary.test.mjs`.

**Interface produite :** `visitSummary({ stay, date, stayEnd, startTime, endTime, recurrenceDates, recurrenceDays, price, travel, discountPercent, firstVisit, isFree }): string`.

- [ ] **Étape 1 : tests (échouent)** :
  - visite unique : `"1 visite, mardi 4 novembre à 9 h, 15 € + 2 € de déplacement"` ;
  - récurrence mardi + jeudi sur 4 semaines : `"8 visites, les mardis et jeudis à 9 h, du 4 au 27 novembre, 15 € + 2 € de déplacement chacune"` ;
  - garde du 4 au 7 novembre : `"Garde à domicile, 4 jours du 4 au 7 novembre, 35 € par jour"` ;
  - remise première visite 20 % : suffixe `", -20 % sur la première visite"` ; visite offerte : `", offerte"` ;
  - sans horaire : pas de « à … ».
- [ ] **Étape 2 :** implémenter ; tests → PASS ; `bun build` → OK. **Commit** « Admin mobile : récapitulatif lisible d'une visite à planifier ».

### Tâche 4 : `NewVisitForm` en étapes dépliantes

**Fichiers :** créer `components/visit-form/StepClient.jsx`, `StepWhen.jsx`, `StepPrice.jsx`, `StepSummary.jsx`, `StepFrame.jsx` ; modifier `components/NewVisitForm.jsx`.

**Interfaces :**
- `StepFrame({ index, title, done, summary, open, onEdit, children })` : en-tête « Étape {index} sur 4 — {title} » (`h2`, `tabIndex={-1}`, reçoit le focus à l'ouverture), contenu si `open`, sinon ligne résumé + bouton « Modifier » (44 px).
- `StepClient` (client + animal), `StepWhen` (Visite / Garde à domicile en deux boutons 44 px, dates, horaires, récurrence), `StepPrice` (prix conseillé, déplacement, remise, offerte), `StepSummary` (texte `visitSummary`, tâches et notes repliées dans `<details>`, bouton « Planifier »). Chaque étape reçoit l'état et ses setters depuis `NewVisitForm`, n'en possède aucun.
- `NewVisitForm` : nouvel état `openStep` (1 à 4) ; « Continuer » valide l'étape (mêmes messages qu'aujourd'hui) puis ouvre la suivante ; préremplissage (point d'attention 1) ; `handleSubmit` et le corps envoyé inchangés.

- [ ] **Étape 1 :** extraire chaque bloc existant dans son composant d'étape sans changer sa logique (les `Field`/`FieldSet` posés par le lot 1 sont conservés).
- [ ] **Étape 2 :** ajouter `StepFrame`, `openStep`, validation par étape, gestion du focus.
- [ ] **Étape 3 :** contrôle de non-régression : comparer le corps JSON construit dans `handleSubmit` avant / après (`git diff` sur `handleSubmit` : aucune ligne modifiée) ; `bun build` sur chaque fichier → OK.
- [ ] **Étape 4 : commit** « Admin mobile : formulaire de visite en étapes dépliantes ».

### Tâche 5 : planning lisible

**Fichiers :** créer `lib/planningLabels.js`, `tests/planningLabels.test.mjs` ; modifier `app/admin/planning/page.js`.

**Interface produite :** `dayAriaLabel(isoDate: string, visitCount: number, adminCount: number): string` → « mercredi 12 novembre, 3 visites, 1 tâche administrative » ; « …, rien de prévu » si 0 et 0.

- [ ] **Étape 1 : tests (échouent)** : accords singulier / pluriel, cas vide.
- [ ] **Étape 2 :** implémenter ; tests → PASS.
- [ ] **Étape 3 :** `page.js` : flèches et « Aujourd'hui » en boutons de 44 px ; `aria-label={dayAriaLabel(…)}` sur chaque jour ; pastilles 8 px ; légende dans `<details>` « Légende » listant les quatre statuts (`VISIT_STATUS` : pastille + libellé) puis les types de tâches administratives, en 13 px (corrige la pastille unique « Visite »).
- [ ] **Étape 4 :** `bun build` → OK. **Commit** « Admin mobile : planning, cibles et légende ».

### Tâche 6 : km administratifs du mois

**Fichiers :** créer `lib/adminKm.js`, `tests/adminKm.test.mjs` ; modifier `app/admin/accounting/page.js` (chargement) et `app/admin/accounting/ChargesTab.jsx` (affichage).

**Interfaces produites :** `monthBounds(isoDate: string): { start: string, end: string }` (premier jour inclus, premier jour du mois suivant exclu) ; `loadAdminKm(isoDate): Promise<{ current: number, previous: number }>` (somme de `admin_events.travel_km`, arrondie à 0,1).

- [ ] **Étape 1 : tests (échouent)** : `monthBounds("2026-11-15")` → `{start:"2026-11-01", end:"2026-12-01"}` ; décembre → janvier suivant ; `loadAdminKm` avec base simulée → 0 si aucune ligne (point d'attention 5).
- [ ] **Étape 2 :** implémenter ; tests → PASS.
- [ ] **Étape 3 :** ligne en tête de l'onglet Charges : « Km administratifs ce mois-ci : 84 km (octobre : 62 km) » ; `bun build` → OK.
- [ ] **Étape 4 : commit** « Charges : total mensuel des km administratifs ».

### Tâche 7 : vérification et documentation

- [ ] **Étape 1 :** `bun test tests/` → tout passe ; contrôle : aucun `!py-`/`!px-`, aucun emoji, aucun `alert(`/`confirm(` dans les fichiers touchés.
- [ ] **Étape 2 :** `docs/PROJET.md` : navigation mobile et formulaire en étapes.
- [ ] **Étape 3 : commit** « Admin mobile : documentation ». Push `lot4-admin-mobile`. Rapport : non testé à l'écran ; demander le parcours terrain d'Aurore (démarrer, photo, terminer, visite récurrente, garde à domicile, ouvrir « Plus ») avant « Merge ».
