# Identité visuelle — Aux Bonnes Pattes

Source : compte Instagram @auxbonnespattes (Aurore, pet sitter certifiée : balades quotidiennes et visites à domicile, surtout des chiens, aussi des chats).
Ce qui s'en dégage : photos au smartphone en lumière naturelle, portraits de chiens à hauteur d'yeux, rien de mis en scène. Beaucoup d'automne (feuilles rousses), d'herbe et de jardins, des robes miel/caramel, noires et blanches. Ton chaleureux et personnel : c'est une personne, pas une agence.

**Direction : « carnet de balade »**. Chaleureux, artisanal, humain et sobre. On garde l'automne, la terre et le pelage ; on supprime tout ce qui fait « template généré ».

## Couleurs (variables CSS dans app/globals.css)
| Rôle | Nom | Clair | Sombre |
|---|---|---|---|
| Fond de page | papier | #F7F2EA | #15120F |
| Surface (cartes, listes) | lin | #FFFCF7 | #1E1A16 |
| Surface secondaire / survol | sable | #EFE7DA | #29241F |
| Texte | encre | #1F1A15 | #EFE7DA |
| Texte secondaire | pierre | #6E655A | #A89E91 |
| Filets / bordures de cartes | trait | #E3D9C9 | #3A332C |
| Bordures de champs, cases, pilules de jours (3:1 minimum) | bord | #8C8174 | #7D7266 |
| **Accent principal** (actions, liens, sélection) | rouille | #A8481F | #E0784A |
| Survol accent | rouille foncée | #8A3A18 | #EE8E62 |
| Accent secondaire (succès, "terminée") | mousse | #4F6B3A | #9DBB84 |
| Détail chaud (surlignage, compteurs) | miel | #D69A4E | #E2AE6A |
| Erreur | brique | #B3261E | #F08A80 |

Règles :
- La rouille est la seule couleur d'action : boutons principaux, onglet actif, date sélectionnée. Le vert forêt actuel est retiré, la mousse sert au succès et à « terminée ».
- Couleurs de statut : Planifiée = miel · En cours = rouille · Terminée = mousse · Annulée = pierre. Elles restent centralisées dans `VISIT_STATUS` (components/StatusBadge.jsx).
- Barres de navigation (latérale et mobile) : fond encre (#1F1A15 en clair, #0F0D0B en sombre), texte papier, onglet actif en rouille.
- Aucun dégradé, aucune ombre portée, sauf une ombre très légère sur les fenêtres modales.
- Déclaration technique : chaque couleur est écrite une seule fois avec `light-dark(<clair>, <sombre>)` dans `:root` ; le thème suit le système (`color-scheme: light dark`) et Réglages le force avec `data-theme="light"` ou `"dark"` sur `<html>`. Classes Tailwind correspondantes : `bg-papier`, `text-encre`, `border-bord`…
- Contrastes vérifiés par test (`tests/tokens.test.mjs`) : `bord` et `rouille` à 3:1 minimum sur lin et papier, dans les deux thèmes.

## Typographie (via next/font/google : les fichiers sont hébergés par le site, aucune requête vers Google, compatible RGPD)
- **Titres : Fraunces** (poids 500 et 600, axe `SOFT` à 100 et `opsz` automatique). Ce serif doux et un peu « fait main » rappelle le lettrage des stories à la une. Réservé aux h1/h2 et au logo.
- **Texte et interface : Atkinson Hyperlegible Next**, ou à défaut Atkinson Hyperlegible, en 400 et 700. Très lisible sur téléphone en extérieur, et pas une police « par défaut ».
- Chiffres (heures, prix, compteurs) : `font-variant-numeric: tabular-nums`.
- Tailles : h1 28–32px, h2 20px, texte 16px (15px minimum), libellés 13px. Pas de MAJUSCULES espacées : les libellés sont en casse normale, graisse 700, couleur pierre.
- Échelle nommée (classes Tailwind) : `text-titre-1` (28–32px, interligne 1.15), `text-titre-2` (20px, 1.25), `text-corps` (16px, 1.5), `text-legende` (13px, 1.35) ; `.chiffres` (alias de `.num`) pour les chiffres alignés.

## Icônes et logo
- Supprimer tous les emojis de l'interface (navigation, boutons, badges, titres, messages, pages légales, emails). Garder éventuellement un emoji seulement dans le contenu saisi par l'utilisatrice.
- Un seul jeu d'icônes : **Phosphor** (`@phosphor-icons/react`), poids « regular », 20px dans l'interface et 24px dans la barre d'onglets, couleur `currentColor`. Correspondance : Aujourd'hui = Sun · Planning = CalendarBlank · Planifier = Plus · Clients = PawPrint · Compta = Receipt · Réglages = GearSix · Recherche = MagnifyingGlass · Photo = Camera · Waze/itinéraire = NavigationArrow · Tâches = CheckSquare · Adresse = MapPin · Téléphone = Phone.
- **Logo** : mot-symbole « Aux Bonnes Pattes » en Fraunces 600, précédé d'une empreinte de patte en SVG (4 ovales et un coussinet, remplissage rouille), dans components/Logo.jsx. Il existe en deux versions : horizontale (barres de navigation, connexion, PDF) et empreinte seule (favicon `app/icon.svg`, `apple-icon`).

## Formes et mise en page
- Rayons : 8px pour les cartes et champs, 999px uniquement pour les avatars, pastilles de statut, pilules date/heure iOS et bouton central « + ».
- Moins de cartes. Les listes (visites, clients, factures) deviennent des lignes séparées par un filet `trait`, dans une seule surface « lin », façon liste groupée iOS.
- Supprimer les pointillés « laisse » (.leash-divider), les ombres au survol et les effets de translation.
- Badges de statut : pastille ronde de 8px suivie du texte (13px, graisse 700), sans fond coloré ni majuscules.
- Accueil : remplacer la rangée de 4 cartes de chiffres par une seule ligne discrète (« 3 visites · 2 à facturer (84 €) · 120 € impayés »).
- Espacements généreux (multiples de 4px) et largeur de lecture limitée à environ 720px pour les formulaires. Variables nommées : `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-6` 24px, `--space-8` 32px. Rayons nommés : `rounded-carte` (8px), `rounded-pilule` (999px).

## Interaction et accessibilité (lot 1)
- **Focus clavier** : un seul anneau pour tout élément interactif, `outline: 2px solid rouille`, décalé de 2px, visible seulement au clavier (`:focus-visible`) ; sur les barres de navigation encre, l'anneau prend la rouille claire (`nav-actif`). Ne jamais écrire `outline: none` sans remplacement.
- **Boutons** : `btn-primary` (rouille, action principale), `btn-ghost` (secondaire), `btn-danger` (suppression, texte brique), et la variante compacte `btn-sm` (36px) à combiner avec les autres pour une action secondaire placée à côté d'un autre contrôle. Cibles tactiles de 44px minimum sinon. Pas d'utilitaire Tailwind en `!important`.
- **Champs** : `.input` (bordure `bord`), variantes `input--auto`, `input--etroit`, `input--icone`, `input--compact`. Rangées de saisie groupées (date, heure) : `.field-group` > `.field-row` > `.field-row-label`.

## Ton des textes
- **Espace admin (Aurore)** : tutoiement, court, factuel. « Aujourd'hui », « Prochaine visite dans 20 min », « 3 visites sur 4 terminées ». Pas de « Bonjour ! », de « bravo ! » ni d'« Astuce : » : l'aide passe en texte secondaire, sans préfixe.
- **Portail client et emails** : vouvoiement, chaleureux et personnel, signé « Aurore ». Exemples : titre « Les nouvelles de {animal} », écran vide « Pas encore de visite. Vous retrouverez ici le compte rendu et les photos après chaque passage. », email « Bonjour {prénom}, voici vos accès à l'espace Aux Bonnes Pattes… Aurore ».
- Vocabulaire métier : visite, balade, passage, compte rendu.

## Photos (plus tard, fournies par Aurore)
Utiliser ses propres photos Instagram, dont elle est l'autrice : lumière naturelle, automne, portraits à hauteur d'yeux. Emplacements prévus : page de connexion (photo à gauche, formulaire à droite ; photo en bandeau sur mobile), accueil du portail client, écrans vides. Formats WebP, environ 1600px de large au maximum, `next/image`. En attendant, pas d'illustration : des aplats papier/sable suffisent.
