# Onglet « Conception » : flyers et cartes de visite dans l'admin

Date : 2026-11-10. Statut : conception validée par Timothé à l'oral, spécification à relire.

## Objectif
Aurore crée ses cartes de visite et ses flyers depuis l'admin, comme sur Canva : elle part d'un modèle aux couleurs du site, modifie librement, puis télécharge un PDF qu'elle téléverse sur Vistaprint.

Réussite : un PDF exporté est accepté par Vistaprint sans avertissement de taille, les textes restent dans la zone de sécurité, le rendu imprimé correspond à l'écran.

## Décisions prises
- Liberté : modèles de départ **et** édition libre sur une toile (option « Les deux »).
- Appareil : ordinateur (souris, glisser-déposer). Sur téléphone, liste et téléchargements seulement.
- Impression : Vistaprint, Aurore téléverse elle-même le PDF.
- Technique : approche A, éditeur basé sur Fabric.js (MIT), export raster 300 dpi.

## Formats (règles Vistaprint)
Vistaprint demande le fichier **à la taille avec fond perdu** (1,5 mm de chaque côté), **sans trait de coupe**, textes et logos dans la zone de sécurité (1,5 mm à l'intérieur de la coupe).

| Format | Faces | Taille finie | Fichier (fond perdu) | Zone de sécurité |
|---|---|---|---|---|
| Carte de visite | recto, verso | 85 × 55 mm | 88 × 58 mm | 82 × 52 mm |
| Flyer A5 | recto, verso | 148 × 210 mm | 151 × 213 mm | 145 × 207 mm |
| Flyer A4 | recto | 210 × 297 mm | 213 × 300 mm | 207 × 294 mm |

Orientation portrait ou paysage au choix pour les flyers (on permute largeur et hauteur). Source : pages d'aide Vistaprint France (carte de visite 88 × 58, flyer A5 213 × 151). La taille A4 suit la même règle de 1,5 mm ; à confirmer sur la page produit Vistaprint au moment de l'implémentation, la valeur ne vit qu'à un endroit (`lib/designFormats.js`).

## Parcours
1. Admin → onglet **Conception** (menu ordinateur, icône pinceau). Sur mobile : icône « Conception » dans la barre du haut, à côté de Demandes et Réglages ; la page y est en lecture seule (liste et téléchargements).
2. **Mes conceptions** : vignettes, nom, format, date de modification ; actions Ouvrir, Dupliquer, Renommer, Supprimer (confirmation dans une boîte de dialogue, pas de `confirm()`).
3. **Nouvelle conception** : choisir le format, puis un modèle ou « Page vierge ».
4. **Éditeur** (plein écran dans l'admin) ; sauvegarde automatique.
5. **Télécharger** : « PDF pour Vistaprint » ou « PNG (réseaux sociaux) ».

## Éditeur
- **Toile au centre** avec deux repères affichés à l'écran et jamais exportés : trait de coupe (pointillé) et zone de sécurité (trait fin). Le fond perdu est grisé légèrement à l'écran.
- **Onglets recto / verso** sous la toile pour les formats à deux faces.
- **Panneau gauche** :
  - Modèles (remplacer la page courante, après confirmation) ;
  - Textes : titre (Fraunces), sous-titre, paragraphe (Atkinson Hyperlegible) ;
  - Photos : photos du site (emplacements `site_photos`) et photos envoyées par Aurore ;
  - Formes : rectangle (coins arrondis réglables), cercle, ligne ;
  - Icônes : une sélection Phosphor (patte, chien, chat, maison, téléphone, e-mail, localisation, Instagram, WhatsApp, cœur, étoile, appareil photo) ;
  - QR code : vers l'adresse du site par défaut, adresse modifiable.
- **Barre contextuelle en haut**, selon l'élément sélectionné :
  - texte : police (Fraunces, Atkinson Hyperlegible), taille, gras, italique, alignement, interligne, espacement, couleur ;
  - tous : couleur de remplissage, contour, transparence, premier plan / arrière-plan, verrouiller, dupliquer, supprimer ;
  - photo : recadrage simple (zoom et position dans un cadre), coins arrondis.
- **Couleurs** : palette « carnet de balade » (papier, lin, sable, encre, pierre, rouille, mousse, miel) puis sélecteur libre.
- **Manipulation** : glisser, redimensionner, pivoter, aimantation aux bords, au centre et aux autres éléments, flèches du clavier (1 mm, 5 mm avec Maj), annuler / rétablir (50 étapes), zoom (ajuster, 100 %, +/-), Suppr, Ctrl+C / Ctrl+V / Ctrl+D / Ctrl+Z / Ctrl+Maj+Z.
- **Alerte zone de sécurité** : un texte, une icône ou un QR code qui sort de la zone de sécurité est entouré en rouille, avec le message « Ce texte risque d'être coupé ». L'export reste possible.
- **Sauvegarde automatique** 1,5 s après la dernière modification, indicateur « Enregistré » / « Enregistrement… » / « Hors ligne, non enregistré ».

## Modèles de départ
Cinq modèles définis dans le code (`lib/designTemplates.js`), aux couleurs du site :
- Carte de visite « Carnet » : recto nom + logo patte sur papier, verso coordonnées + QR code.
- Carte de visite « Rouille » : recto aplat rouille avec nom en papier, verso coordonnées.
- Flyer A5 « Balade » : grande photo, accroche, services, tarif « à partir de », QR code.
- Flyer A5 « Vacances » : message « Vous partez ? Je garde vos compagnons », coordonnées.
- Flyer A4 « Affiche » : à poser chez le vétérinaire ou la boulangerie, bandes détachables non prévues (hors périmètre).

Les champs sont préremplis depuis les Réglages : `business_name`, `contact_email`, `whatsapp_number` (affiché au format 06 12 34 56 78), `service_area`, Instagram `@auxbonnespattes`, adresse du site (`NEXT_PUBLIC_APP_URL`), prix « à partir de » (`lib/landing.js`). Champ vide → texte d'exemple à remplacer. Il n'existe pas de numéro de téléphone dans les Réglages : le modèle utilise le numéro WhatsApp, modifiable sur la carte.

## Export
- **PDF pour Vistaprint** : chaque face rendue côté navigateur à 300 dpi (ex. carte 1039 × 685 px), sans les repères, en JPEG qualité 0,95, assemblée avec pdf-lib (déjà présent) en pages à la taille exacte avec fond perdu (mm → points). Une page par face, recto puis verso. Nom du fichier : `<nom>-vistaprint.pdf`.
- **PNG** : face courante, 2× la taille écran, avec fond perdu retiré (rognée à la taille finie).
- Avant rendu : attente du chargement des polices (`document.fonts.load`) et des images.
- Texte en raster : accepté par Vistaprint ; un export vectoriel est hors périmètre.

## Données
Table `designs` (migration idempotente ajoutée à `lib/schema.sql`) :
- `id UUID PK`, `name TEXT NOT NULL` (≤ 80), `format TEXT NOT NULL` (`CARTE`, `A5`, `A4`), `orientation TEXT NOT NULL DEFAULT 'portrait'`, `pages JSONB NOT NULL` (une entrée par face : JSON Fabric), `thumbnail TEXT` (petite image data URL ≤ 60 Ko), `created_at`, `updated_at`.
- Taille maximale de `pages` : 2 Mo (refus sinon, message clair).

Table `design_assets` : `id UUID PK`, `blob_url TEXT`, `content_type TEXT`, `bytes INTEGER`, `created_at`. Photos envoyées depuis l'éditeur, stockées en **privé** sur Vercel Blob (`designs/…`), servies par `/api/designs/assets/[id]` (admin uniquement). Contrôle des octets magiques avec `lib/imageMagic.js` (JPEG, PNG, WebP), 10 Mo maximum. Les JSON Fabric référencent les images par cette adresse interne, jamais par l'URL Blob.

## API (admin uniquement, `requireAdmin`, CSRF déjà géré par `proxy.js`)
- `GET /api/designs` : liste (sans `pages`).
- `POST /api/designs` : création `{ name, format, orientation, templateId? }`.
- `GET /api/designs/[id]`, `PATCH /api/designs/[id]` (`name`, `pages`, `thumbnail`), `DELETE /api/designs/[id]`.
- `POST /api/designs/[id]/duplicate`.
- `POST /api/designs/assets` (multipart), `GET /api/designs/assets/[id]`.
- Validation partagée dans `lib/designFields.js` (les routes n'exportent que des handlers).

## Fichiers
- `lib/designFormats.js` : formats, conversions mm ↔ px ↔ points, zones (logique pure, testée).
- `lib/designTemplates.js` : modèles et préremplissage (logique pure, testée).
- `lib/designFields.js` : validation des entrées.
- `app/admin/conception/page.js` (liste), `app/admin/conception/[id]/page.js` (éditeur), `components/design/*` (Editor, Toolbar, Panels, SafeZoneOverlay, ExportButton).
- `AdminNav` : entrée « Conception » ; `MobileNav` : icône dans la barre du haut.
- Dépendances : `fabric` (v6, MIT), `qrcode` (MIT). Chargées seulement sur la page éditeur (`next/dynamic`, sans rendu serveur).

## Gestion des erreurs
- Échec de sauvegarde : indicateur « Non enregistré », nouvelle tentative automatique, pas de perte locale tant que la page est ouverte ; alerte avant de quitter la page avec des modifications non enregistrées.
- Image trop lourde ou format refusé : message dans le panneau Photos.
- Police non chargée au moment de l'export : export bloqué avec message, nouvelle tentative.
- Conception introuvable : page `not-found`.

## Vérification
- Tests `bun test` : conversions de formats (88 × 58 mm → 1039 × 685 px à 300 dpi, → 249,4 × 164,4 pt), détection hors zone de sécurité, préremplissage des modèles (champ vide → texte d'exemple), validation des entrées (taille, format, nom).
- `bun build --no-bundle` sur chaque fichier modifié.
- Contrôle du PDF produit (dimensions de page lues avec pdf-lib dans un test).
- À l'écran (Timothé ou Aurore) : créer une carte depuis un modèle, modifier, exporter, téléverser sur Vistaprint et vérifier l'aperçu Vistaprint.

## Hors périmètre
Texte courbé, filtres et détourage photo, travail à plusieurs, export vectoriel, commande directe chez Vistaprint, bandes détachables, autres formats (affiche A3, carte postale), polices supplémentaires.

## Risques
- Différence entre l'écran et le PDF : limitée par un rendu unique (Fabric) à deux résolutions.
- Poids de Fabric.js (environ 300 Ko) : chargé uniquement dans l'éditeur.
- Pas de build ni de navigateur dans le bac à sable : l'éditeur ne pourra être validé qu'à l'écran après déploiement ; prévoir un tour de corrections.
