# Lot 4 : admin mobile

Date : 2026-11-03. Statut : proposition, à valider par Timothé section par section (aucune conception encore approuvée).
Source : `docs/lots/lot-4-admin-mobile.md`, lecture du code de `main` (b20afa7), règles Better Design (cibles tactiles, navigation responsive, formulaires en étapes, dialogues). Rien n'a été vu à l'écran.

## Objectif
Qu'Aurore fasse tout au téléphone, à une main, sur le terrain : démarrer, photographier et terminer une visite sans défiler ; planifier une visite ou une garde sans formulaire interminable ; lire son planning d'un coup d'œil.

## Constat
| # | Problème | Preuve | Gravité |
|---|---|---|---|
| 1 | Boutons d'action des visites (Démarrer, Terminer, Photo, Détail) à 36 px de haut, sous les 44 px : ce sont les gestes du terrain. | `components/VisitCard.jsx:226,237,245,262` (`!py-1.5 !px-3`) | Élevée (`rule/touch-target-min-44px`) |
| 2 | `NewVisitForm` : 722 lignes, un seul long formulaire (client, animal, garde, dates, tarif, remise, récurrence, tâches, notes) ; tout est bloqué tant qu'aucun client n'est choisi. | `components/NewVisitForm.jsx:265-722` | Élevée |
| 3 | Pages sans accès mobile : Avis, Photos du site, Charges ne sont pas dans la barre ; Demandes et Réglages sont des icônes de 40 px dans l'en-tête. | `components/MobileNav.jsx:11-17,39,54` ; `components/AdminNav.jsx:12-17` | Moyenne |
| 4 | Calendrier : flèches précédent / suivant de 40 px, « Aujourd'hui » en lien 14 px ; jour annoncé seulement par son chiffre (le nombre de visites n'est que dans `title`). | `app/admin/planning/page.js:164,175,185,239-242` | Moyenne |
| 5 | Légende fausse : une seule pastille « Visite » (`VISIT_COLOR`) alors que les jours affichent jusqu'à quatre couleurs de statut (miel, rouille, mousse, pierre) ; pastilles de 6 px, légende en 12 px. | `app/admin/planning/page.js:260-281` | Moyenne (`rule/no-color-only-meaning`) |
| 6 | Libellés de la barre d'onglets en 11 px, pastille du compteur de demandes en 10 px. | `components/MobileNav.jsx:45,91` | Faible |
| 7 | Total des km administratifs absent de l'onglet Charges alors que `admin_events.travel_km` existe. | `lib/schema.sql:381`, `app/admin/accounting/ChargesTab.jsx` (aucune occurrence de `km`) | Moyenne (demande déjà formulée) |
| 8 | Écran Aujourd'hui : bonne base (une ligne de chiffres, bannière prochaine visite, cartes) ; seul défaut, les actions de carte trop petites (voir 1). | `app/admin/page.js:66-115` | Faible |

## Approches

### Navigation
1. **Onglet « Plus » à la place de « Compta »** (recommandée) : Aujourd'hui, Planning, + Planifier, Clients, Plus. « Plus » ouvre une feuille du bas avec Compta, Charges, Demandes (avec compteur), Avis, Photos du site, Réglages. Gain : tout est atteignable au pouce, en-tête allégé ; perte : Compta à deux gestes ; touche : Aurore (habitude à reprendre).
2. **Garder Compta, mettre « Plus » dans l'en-tête** : moins de changement, mais l'en-tête reste chargé et hors de portée du pouce.

### Formulaire de visite
1. **Étapes sur un seul écran qui se déplie** (recommandée) : chaque étape (Client, Quand, Tarif, Récapitulatif) apparaît sous la précédente une fois validée, avec un résumé modifiable des étapes faites. Gain : contexte toujours visible, pas de perte de saisie, conforme aux principes « progressive disclosure » ; perte : page un peu longue en fin de parcours.
2. **Assistant plein écran, une étape par écran** avec « Étape 2 sur 4 » : plus léger visuellement, mais une étape cachée = un aller-retour pour corriger, et plus de code d'état.
3. **Garder le formulaire, regrouper en sections repliables** : peu de code, gain modeste.

## Conception recommandée

### 1. Barre d'onglets et menu « Plus »
- `MobileNav` : cinq onglets (Aujourd'hui, Planning, Planifier, Clients, Plus), libellés 13 px.
- « Plus » : feuille du bas en `<dialog>` modal (focus piégé, Échap, retour du focus), liste à filets de six entrées 56 px de haut avec icônes Phosphor (Receipt, Wallet, Tray, Star, Image, GearSix), compteur des nouvelles demandes en 13 px.
- En-tête mobile : logo et recherche seulement (Demandes et Réglages passent dans « Plus »). Le menu latéral ordinateur (`AdminNav`) reçoit Avis, Photos du site et Charges s'ils n'y sont pas.

### 2. Cartes de visite et écran Aujourd'hui
- Variante `btn-sm` du lot 1 interdite ici : boutons Démarrer / Terminer / Photo pleine hauteur 44 px, Photo avec libellé visible « Photo » (plus seulement l'icône), Détail en lien de la carte entière.
- Ordre fixe : action d'état (Démarrer ou Terminer) à gauche en primaire, Photo, Itinéraire. Le glissement (swipe) existant est conservé.

### 3. `NewVisitForm` en étapes dépliantes
- Étape 1 « Client et animal » : recherche client (existant), animal ; validée par « Continuer ».
- Étape 2 « Quand » : choix Visite / Garde à domicile en deux gros boutons, puis dates et horaires (pilules existantes) et récurrence (jours, semaines, date de fin) pour les visites.
- Étape 3 « Tarif » : prix conseillé, déplacement, remise première visite, visite offerte.
- Étape 4 « Récapitulatif » : résumé lisible (« 8 visites, les mardis et jeudis à 9 h, du 4 au 28 novembre, 15 € + 2 € de déplacement ») puis tâches et notes (repliées), bouton « Planifier ».
- Chaque étape faite reste visible sous forme d'une ligne résumé avec « Modifier ». Le focus passe au titre de l'étape suivante. Aucune donnée envoyée ne change : même appel `POST /api/visits`.
- Découpage du fichier : `components/visit-form/StepClient.jsx`, `StepWhen.jsx`, `StepPrice.jsx`, `StepSummary.jsx`, état gardé dans `NewVisitForm`.

### 4. Planning
- Flèches et « Aujourd'hui » en boutons de 44 px.
- Chaque jour annonce « 12 novembre, 3 visites, 1 tâche administrative » (`aria-label`).
- Pastilles 8 px ; légende repliable « Légende » (`<details>`) qui liste les quatre statuts avec leur nom, puis les types de tâches administratives.

### 5. Charges : km administratifs du mois
- Ligne « Km administratifs ce mois-ci : 84 km » en tête de l'onglet Charges, avec le mois précédent pour comparaison ; somme de `admin_events.travel_km` sur le mois. Aucune migration.

### Accessibilité
Cibles ≥ 44 px partout dans l'admin mobile ; feuille « Plus » et confirmations en `<dialog>` ; libellés ≥ 13 px ; légende textuelle en plus des couleurs.

### Vérification
`bun build` par fichier ; tests de la logique pure (résumé du récapitulatif, total km mensuel, libellé accessible d'un jour) ; parcours terrain par Aurore ou Timothé sur téléphone : démarrer, photo, terminer, créer une visite récurrente et une garde à domicile, ouvrir « Plus ».

## Hors périmètre
Mode hors ligne, application native, notifications, refonte de la Compta elle-même, changement des règles de tarif.

## Dépendances
Lot 1 (tokens, `btn-sm`, `Field`, dialogues) recommandé avant ; sinon les étapes utilisent directement `<dialog>` et les classes existantes.

## Questions à trancher par Timothé
1. Remplacer l'onglet Compta par « Plus » (recommandé) ou garder Compta et mettre « Plus » dans l'en-tête ?
2. Formulaire de visite : étapes qui se déplient sur un écran (recommandé) ou une étape par écran ?
3. L'ordre des étapes Client, Quand, Tarif, Récapitulatif convient-il, ou Aurore part-elle plutôt de la date (depuis le planning) ? Recommandé : garder Client d'abord, la date venant du planning est préremplie.
4. Libellé visible « Photo » sur le bouton photo (recommandé) ou icône seule ?
5. Km administratifs : total du mois seul (recommandé) ou aussi le montant en euros au barème `km_rate` (dépend de la décision 0,70 € / 0,07 €) ?
6. Faire tester le parcours terrain par Aurore elle-même sur son téléphone avant « Merge » (recommandé) ?
