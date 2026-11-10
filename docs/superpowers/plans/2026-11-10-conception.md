# Onglet Conception : plan d'implémentation

Spécification : `docs/superpowers/specs/2026-11-10-conception-design.md`. Branche unique : `conception`.

## Organisation
- **Superviseur** : la session principale. Fait le bloc 0, lance les blocs 1 à 4b en parallèle, puis l'agent d'alignement, répartit les corrections, commite et pousse.
- **Agents de bloc** : chacun ne touche QUE ses fichiers. Aucun agent ne fait de `git commit`, `git push`, ni de migration de base.
- **Agent d'alignement** : relecture finale en lecture seule (interfaces, imports, spec, ton, identité visuelle), puis rapport.

## Règles communes à tous les blocs
- Next.js 16 App Router, React 19, Tailwind v4, Phosphor (`@phosphor-icons/react`, `/ssr` dans les composants serveur). Les fichiers `route.js` n'exportent que des handlers HTTP.
- Interface admin en français, **tutoiement**. Pas d'emoji. Pas de `alert()` / `confirm()` : boîte de dialogue maison.
- Classes de l'identité visuelle : `bg-papier`, `bg-lin`, `bg-sable`, `text-encre`, `text-pierre`, `border-trait`, `text-rouille`, `btn-primary`, `btn-ghost`, `card`, `label`, `font-display` (Fraunces), `font-body` (Atkinson).
- Vérification : `bun build --no-bundle <fichier>` sur chaque fichier créé ou modifié (un fichier à la fois ; les imports `fabric` et `qrcode` ne sont pas installés dans le bac à sable, l'erreur de résolution est attendue et acceptable uniquement pour eux). Tests purs avec `bun test`.
- Fabric.js **v6** : `import { Canvas, StaticCanvas, Textbox, Rect, Circle, Line, Path, FabricImage, ActiveSelection, loadSVGFromString, util } from "fabric"`. `canvas.loadFromJSON(json)` renvoie une promesse. `canvas.toObject(SERIALIZE_PROPS)` pour sérialiser.

## Unités (contrat central)
- Coordonnées des objets Fabric en **unités de conception** : `UNITS_PER_MM = 10`. Une carte (88 × 58 mm avec fond perdu) fait 880 × 580 unités.
- L'origine (0,0) est le coin du **fond perdu**. Trait de coupe à 15 unités du bord, zone de sécurité à 30 unités.
- Export 300 dpi : `multiplier = 300 / 25.4 / UNITS_PER_MM` (≈ 1,1811).
- Tailles de police en unités (1 pt ≈ 3,528 unités).

## Format JSON d'une face (`pages[i]`)
```json
{ "version": "6", "background": "#f7f2ea", "objects": [ ...objets Fabric sérialisés... ] }
```
- Propriétés maison sérialisées (`SERIALIZE_PROPS`) : `abpRole` (`"text" | "shape" | "photo" | "icon" | "qr"`), `abpLocked` (booléen), `abpQrText` (texte du QR).
- `fontFamily` stockée en **nom logique** : `"Fraunces"` ou `"Atkinson Hyperlegible"` (jamais le nom haché de next/font).
- Images : `src` relatif au site, `/api/designs/assets/<id>` ou `/api/site-photos/<slot>?v=<n>`.

## Bloc 0 — Superviseur
- Branche `conception` depuis `conception-spec`.
- `package.json` : `"fabric": "^6.7.1"`, `"qrcode": "^1.5.4"` (pas d'accès au registre npm dans le bac à sable ; le verrou sera régénéré par l'installation Vercel).
- Migration Neon puis ajout idempotent à `lib/schema.sql` :
```sql
CREATE TABLE IF NOT EXISTS designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('CARTE','A5','A4')),
  orientation TEXT NOT NULL DEFAULT 'portrait' CHECK (orientation IN ('portrait','paysage')),
  pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS design_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Bloc 1 — Fondations (logique pure, testée)
Fichiers : `lib/designFormats.js`, `lib/designTemplates.js`, `lib/designFields.js`, `lib/designFonts.js`, `tests/design.test.mjs`.

`lib/designFormats.js`
- `UNITS_PER_MM = 10`, `BLEED_MM = 1.5`, `SAFE_MM = 1.5`, `EXPORT_DPI = 300`, `EXPORT_MULTIPLIER`.
- `FORMATS` : `CARTE` (« Carte de visite », 85 × 55, 2 faces, orientation naturelle `paysage`), `A5` (« Flyer A5 », 148 × 210, 2 faces, `portrait`), `A4` (« Flyer A4 », 210 × 297, 1 face, `portrait`).
- `FACE_LABELS = ["Recto", "Verso"]`.
- `getFormat(key, orientation)` → `{ key, label, faces, orientation, trimMm:{w,h}, bleedMm:{w,h}, safeMm:{w,h}, canvas:{w,h}, trimRect:{x,y,w,h}, safeRect:{x,y,w,h} }` (rectangles en unités) ; largeur et hauteur permutées si `orientation` ≠ orientation naturelle ; `null` si clé inconnue.
- `mmToPx(mm, dpi = 300)` (arrondi), `mmToPt(mm)`, `exportPixelSize(fmt)` → `{w,h}` à 300 dpi de la taille avec fond perdu.
- `isOutsideSafe(bounds, fmt)` : `bounds = {left, top, width, height}` en unités → `true` si dépasse `safeRect`.
- `SERIALIZE_PROPS = ["abpRole", "abpLocked", "abpQrText"]`.
- `PALETTE` : `[{ name: "Papier", hex: "#f7f2ea" }, Lin #fffcf7, Sable #efe7da, Encre #1f1a15, Pierre #6e655a, Rouille #a8481f, Rouille foncé #8a3a18, Mousse #4f6b3a, Miel #d69a4e, Blanc #ffffff]`.

`lib/designFonts.js`
- `FONTS = [{ key: "Fraunces", cssVar: "--font-fraunces", role: "titre" }, { key: "Atkinson Hyperlegible", cssVar: "--font-atkinson", role: "texte" }]`.
- `mapPageFonts(page, mapFn)` → nouvelle face avec `fontFamily` transformé sur chaque objet (récursif pour les groupes) ; pur.
- `browserFontResolver()` → `{ toRuntime(logical), toStored(runtime) }` lisant les variables CSS sur `document.body` (navigateur seulement).
- `ensureFontsLoaded()` → promesse : `document.fonts.load` pour chaque police en 400, 600, 700 et italique.

`lib/designTemplates.js`
- `formatPhoneFR(digits)` : `"33612345678"` → `"06 12 34 56 78"` ; autre → chaîne d'origine ; vide → `""`.
- `designInfo(settings, appUrl)` → `{ name, email, phone, area, instagram: "@auxbonnespattes", site (hôte sans https://), siteUrl, fromPrice }` ; champ vide → texte d'exemple (« ton.email@exemple.fr », « 06 00 00 00 00 », etc.) ; `fromPrice` via `priceRows`/`fromPrice` de `lib/landing.js`.
- `TEMPLATES` : 5 modèles `{ id, label, format, orientation, description, build(info) → pages[] }` : `carte-carnet`, `carte-rouille`, `a5-balade`, `a5-vacances`, `a4-affiche` (contenus de la spec). Nombre de faces = `FORMATS[format].faces`. Textes en `Textbox` dans la zone de sécurité ; un emplacement photo = `Rect` sable avec `abpRole: "photo"` ; QR = objet `Rect` avec `abpRole: "qr"` et `abpQrText` = `siteUrl` (le vrai QR est généré à l'ouverture par le bloc 4b) ; empreinte = `Path` de `PawMark` (`components/Logo.jsx`), mise à l'échelle.
- `blankPages(format)` → faces vides au fond papier.
- `templatesFor(format)` → modèles de ce format.

`lib/designFields.js`
- `MAX_PAGES_BYTES = 2_000_000`, `MAX_THUMBNAIL_CHARS = 80_000`, `NAME_MAX = 80`.
- `parseDesignCreate(body)` → `{ value: { name, format, orientation, templateId } }` ou `{ error }` (nom par défaut « Sans titre », format obligatoire, orientation par défaut = naturelle du format, `templateId` existant et du même format ou `null`).
- `parseDesignPatch(body)` → `{ value: { name?, pages?, thumbnail? } }` ou `{ error }` (au moins un champ ; `pages` tableau de 1 ou 2 objets avec `objects` tableau ; taille JSON ≤ max ; vignette `data:image/(jpeg|png);base64,` ≤ max).

`tests/design.test.mjs` : conversions (carte 1039 × 685 px, 249,4 × 164,4 pt), permutation d'orientation, `isOutsideSafe`, `formatPhoneFR`, `designInfo` avec champs vides, chaque modèle produit le bon nombre de faces et des objets dans la zone de sécurité, `mapPageFonts`, validations de `designFields`.

## Bloc 2 — API (admin uniquement)
Fichiers : `app/api/designs/route.js`, `app/api/designs/[id]/route.js`, `app/api/designs/[id]/duplicate/route.js`, `app/api/designs/assets/route.js`, `app/api/designs/assets/[id]/route.js`, `lib/designData.js` (requêtes partagées).
- Modèle : `app/api/visits/[id]/photos/route.js` (envoi Blob privé, octets magiques) et `app/api/photos/[id]/file/route.js` (lecture Blob privé). `requireAdmin()` partout → 401 ; `isUuid` → 404 ; jamais `e.message` renvoyé ; `console.error` en cas d'erreur.
- `GET /api/designs` → `{ designs: [{ id, name, format, orientation, thumbnail, updated_at }] }` triés par `updated_at` décroissant.
- `POST /api/designs` → `parseDesignCreate` ; pages = `template.build(designInfo(settings, NEXT_PUBLIC_APP_URL))` ou `blankPages` ; → `{ design }` complet, 201.
- `GET /api/designs/[id]` → `{ design }` complet ; `PATCH` → `parseDesignPatch`, met à jour `updated_at = now()` → `{ design: { id, name, updated_at } }` ; `DELETE` → `{ ok: true }`.
- `POST /api/designs/[id]/duplicate` → copie « <nom> (copie) » → `{ design }` sans `pages`, 201.
- `POST /api/designs/assets` (multipart, champ `file`) : JPEG, PNG, WebP uniquement (pas de HEIC : non affichable dans le canvas), 10 Mo, octets magiques via `lib/imageMagic.js`, `put("designs/<horodatage>.<ext>", { access: "private", addRandomSuffix: true })` → `{ asset: { id, src: "/api/designs/assets/<id>" } }`.
- `GET /api/designs/assets/[id]` : admin seulement, flux Blob privé, `Cache-Control: private, max-age=31536000, immutable`.
- `lib/designData.js` : `loadDesign(id)`, `loadDesignSettings()` (ligne `settings`), utilisés par l'API et la page éditeur.

## Bloc 3 — Liste et navigation
Fichiers : `app/admin/conception/page.js`, `app/admin/conception/DesignsList.jsx`, `components/AdminNav.jsx`, `components/MobileNav.jsx`.
- Page serveur : `adminPageGuard()`, requête liste (comme l'API), titre « Conception », sous-titre « Tes cartes de visite et flyers, prêts pour Vistaprint. ».
- `DesignsList` (client) : grille de cartes (vignette ou aplat sable avec le format, nom, format, « modifié le … ») ; bouton « Nouvelle conception » → boîte de dialogue : choix du format (Carte de visite / Flyer A5 / Flyer A4), orientation pour les flyers, puis « Page vierge » ou un modèle de `templatesFor(format)` (label + description) → `POST /api/designs` → redirection vers `/admin/conception/<id>`. Actions par carte : Ouvrir, Dupliquer, Renommer (dialogue), Supprimer (dialogue de confirmation). Sur mobile (< md) : pas de bouton « Nouvelle conception », mention « Création et modification sur ordinateur » ; « Ouvrir » reste (aperçu et téléchargement).
- `AdminNav` : entrée « Conception » (icône `PaintBrush`) avant « Réglages ». `MobileNav` : icône `PaintBrush` vers `/admin/conception` dans la barre du haut, même style que Demandes et Réglages, `aria-label="Conception"`.

## Bloc 4a — Éditeur : cœur
Fichiers : `app/admin/conception/[id]/page.js`, `components/design/EditorLoader.jsx`, `components/design/EditorContext.js`, `components/design/Editor.jsx`, `components/design/Toolbar.jsx`, `components/design/useHistory.js`.
- `page.js` (serveur) : `adminPageGuard()`, `isUuid` sinon `notFound()`, `loadDesign` (bloc 2) sinon `notFound()`, `designInfo(loadDesignSettings(), NEXT_PUBLIC_APP_URL)` ; rend `<EditorLoader design={…} info={…} />`.
- `EditorLoader` (client) : `next/dynamic(() => import("./Editor"), { ssr: false, loading: … })`.
- `EditorContext.js` : `EditorContext` + `useEditor()` qui expose **exactement** :
  - `canvas` : instance Fabric `Canvas` (ou `null` avant montage) ;
  - `fmt` : résultat de `getFormat(design.format, design.orientation)` ;
  - `design` : `{ id, name, format, orientation }` ;
  - `info` : résultat de `designInfo` ;
  - `faceIndex`, `setFaceIndex(i)` ;
  - `addObject(obj, { center = true } = {})` : ajoute, centre dans la zone de sécurité si demandé, sélectionne, `commit()` ;
  - `commit()` : enregistre l'état dans l'historique et programme la sauvegarde ;
  - `getPages()` : tableau de toutes les faces au format stocké (face courante sérialisée depuis le canvas avec `SERIALIZE_PROPS`, polices remises en nom logique) ;
  - `replaceCurrentPage(page)` : charge une face (format stocké) dans le canvas, `commit()` ;
  - `saveState` : `"saved" | "saving" | "error"`.
- `Editor.jsx` : mise en page plein écran dans l'admin (barre du haut : nom modifiable, état d'enregistrement, `<ExportMenu />` du bloc 4b ; à gauche `<LeftPanel />` du bloc 4b ; au centre la toile ; sous la toile les onglets Recto / Verso si 2 faces et le zoom). Canvas Fabric dimensionné à `fmt.canvas`, zoom « ajuster » par défaut. Avant le premier chargement : `ensureFontsLoaded()` puis polices logiques → réelles (`browserFontResolver`). Repères dessinés sur le contexte supérieur après chaque rendu (fond perdu légèrement grisé, trait de coupe pointillé, zone de sécurité fine) : jamais des objets Fabric. Objets texte, icône ou QR hors zone de sécurité : contour rouille et message « Ce texte risque d'être coupé ». Aimantation au centre et aux bords de la coupe et de la zone de sécurité (seuil 3 mm). Raccourcis : Suppr, flèches (1 mm, Maj 5 mm), Ctrl/Cmd + C, V, D, Z, Maj+Z. Objets `abpLocked` non sélectionnables au déplacement (verrou). Sauvegarde automatique 1,5 s après `commit()` : `PATCH /api/designs/<id>` avec `{ pages: getPages(), thumbnail }` (vignette JPEG de la face 0, largeur 240 px, qualité 0,6), nouvelle tentative après erreur, alerte `beforeunload` si non enregistré. Sur écran < md : toile en lecture seule (pas de sélection), panneau gauche et barre d'outils masqués, `ExportMenu` visible, mention « Modification sur ordinateur ».
- `Toolbar.jsx` : barre contextuelle (spec, section Éditeur) : police (`FONTS`), taille, gras, italique, alignement, interligne, espacement, couleur (`PALETTE` + sélecteur libre), remplissage, contour, transparence, premier plan / arrière-plan, verrouiller, dupliquer, supprimer ; photo : zoom et position dans le cadre (clipPath), coins arrondis.
- `useHistory.js` : pile d'états JSON (50), annuler / rétablir.

## Bloc 4b — Éditeur : panneaux et export
Fichiers : `components/design/LeftPanel.jsx`, `components/design/panels/*.jsx`, `components/design/ExportMenu.jsx`, `lib/designExport.js`, `lib/designQr.js`.
- Utilise **uniquement** `useEditor()` (contrat du bloc 4a) ; aucune modification des fichiers du bloc 4a.
- `LeftPanel` : onglets verticaux Modèles, Textes, Photos, Formes, Icônes, QR code.
  - Modèles : `templatesFor(design.format)` ; un clic remplace la face courante par la face correspondante du modèle (`replaceCurrentPage`) après dialogue de confirmation ; option « Page vierge ».
  - Textes : Titre (Fraunces 600, 24 pt), Sous-titre (Fraunces 600, 14 pt), Paragraphe (Atkinson 400, 9 pt) → `Textbox` `abpRole: "text"`, police en nom réel au moment de l'ajout.
  - Photos : photos du site (`/api/site-photos/<slot>`, emplacements de `SITE_PHOTO_SLOTS` qui existent — la page éditeur peut passer `sitePhotos` via `info` si nécessaire, sinon tester le chargement) et envoi (`POST /api/designs/assets`, indicateur d'envoi, erreurs affichées) → `FabricImage` `abpRole: "photo"` dans un cadre (clipPath) ; si un emplacement photo est sélectionné, la photo le remplit.
  - Formes : rectangle (rayon réglable), cercle, ligne → `abpRole: "shape"`, couleurs de `PALETTE`.
  - Icônes : liste du spec, SVG obtenu par `renderToStaticMarkup` des composants Phosphor (poids `regular` et `fill`) → `loadSVGFromString` → groupe `abpRole: "icon"`.
  - QR code : champ adresse (par défaut `info.siteUrl`), `lib/designQr.js` → `qrSvg(text)` via `qrcode` (`toString(text, { type: "svg", margin: 0 })`) → groupe `abpRole: "qr"`, `abpQrText`. À l'ouverture d'une face, tout `Rect` `abpRole: "qr"` venant d'un modèle est remplacé par le vrai QR (même position et taille).
- `ExportMenu` : « PDF pour Vistaprint » et « PNG (réseaux sociaux) », état de progression, erreurs en clair.
- `lib/designExport.js` (navigateur) :
  - `renderFace(page, fmt, { multiplier, trim })` → `Blob` : `StaticCanvas` hors écran à `fmt.canvas`, `ensureFontsLoaded()`, polices logiques → réelles, `loadFromJSON`, attente des images, `toDataURL` (JPEG 0,95 pour le PDF ; PNG pour l'image ; `trim: true` rogne au `trimRect`).
  - `exportPdf(pages, fmt, name)` : pdf-lib, une page par face à `mmToPt(bleedMm)`, image 300 dpi pleine page, téléchargement `<nom>-vistaprint.pdf`.
  - `exportPng(page, fmt, name)` : multiplier 2× écran, rogné à la coupe, téléchargement `<nom>.png`.

## Agent d'alignement (après les blocs)
Lecture seule. Vérifie et rapporte (fichier, ligne, problème, correction proposée) :
1. Chaque import pointe vers un export qui existe, avec la bonne signature (contrats ci-dessus).
2. Contrat `useEditor()` respecté par 4a (fournisseur) et 4b (consommateur) ; unités et `SERIALIZE_PROPS` cohérents ; polices logiques stockées.
3. Couverture de la spec, section par section.
4. Ton (tutoiement admin), absence d'emoji, de `alert`/`confirm`, classes de l'identité visuelle, accessibilité de base (labels, `aria-label` des boutons icônes, focus).
5. Sécurité : `requireAdmin` sur chaque route, `isUuid`, pas de `e.message` renvoyé, limites de taille.
6. `bun build --no-bundle` sur chaque fichier, `bun test`.

## Fin
Superviseur : corrections, commit, push de `conception`, contrôle du déploiement d'aperçu Vercel de la branche (seule vérification du build), rapport à Timothé. Fusion sur « Merge ».
