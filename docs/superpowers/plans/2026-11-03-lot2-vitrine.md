# Lot 2 vitrine : plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans. Étapes à cases (`- [ ]`).

**Objectif :** réécrire la page d'accueil selon la direction A (structure, textes, WhatsApp facultatif, barre fixe mobile) sans toucher au formulaire de demande.
**Architecture :** logique pure (tarifs, WhatsApp) dans `lib/landing.js`, testée par `bun test` ; sections en petits composants `components/landing/*` ; `app/page.js` assemble et charge les données.
**Pile :** Next.js 16 App Router, React 19, Tailwind v4, Phosphor (`@phosphor-icons/react/ssr` côté serveur).
**Spécification :** `docs/superpowers/specs/2026-11-03-lot2-vitrine-design.md`.

## Contraintes globales
- Textes : vouvoiement, signé Aurore, aucun emoji, aucun numéro de téléphone, aucune promesse nouvelle.
- `app/globals.css` : pas de modification (lot 1 en parallèle). `LeadForm.jsx` : aucun changement de champ ni d'envoi.
- Vérification par `bun build --no-bundle <fichier>` un par un ; `bun test tests/landing.test.mjs`.
- Commits en français avec les trailers de session. Branche `lot2-vitrine`, jamais fusionnée sans « Merge ».

## Points d'attention
1. Tous les tarifs vides : la section Tarifs affiche seulement le texte sur la zone (pas de « À partir de NaN »).
2. Numéro WhatsApp saisi avec espaces ou `+33` : normalisé en chiffres ; saisie invalide refusée avec un message clair.
3. Aucune photo chargée : grande photo et galerie masquées, pas de bloc vide géant.
4. `contact_email` vide : pas de lien « Écrire à Aurore ».
5. Lien `?parrain=` : toujours transmis au formulaire.

---

### Tâche 1 : logique pure `lib/landing.js`
**Fichiers :** créer `lib/landing.js`, `tests/landing.test.mjs`.
**Produit :**
- `priceRows(settings): {key, label, amount}[]` — dans l'ordre 30 min, 45 min, 1 h, journée (`rate_day`, libellé « Garde chez Aurore, la journée ») ; lignes à montant absent, nul ou non numérique exclues.
- `fromPrice(rows): number|null` — minimum des lignes 30/45/60, `null` si aucune.
- `normalizeWhatsapp(input): {value: string|null} | {error: string}` — vide → `{value: null}` ; retire espaces, points, tirets ; accepte `+` initial ; `0X…` français à 10 chiffres → `33X…` ; 8 à 15 chiffres sinon `{error: "Numéro WhatsApp invalide."}`.
- `whatsappHref(number): string|null` — `https://wa.me/<chiffres>?text=<encodeURIComponent(WHATSAPP_MESSAGE)>`, `null` si vide.
- `WHATSAPP_MESSAGE = "Bonjour Aurore, je vous contacte depuis le site Aux Bonnes Pattes."`
- [ ] Tests (échouent) : lignes vides masquées ; `fromPrice` ignore la journée ; `normalizeWhatsapp("06 12 34 56 78")` → `33612345678` ; `"+33 6 12 34 56 78"` → `33612345678` ; `"abc"` → erreur ; `""` → `null` ; `whatsappHref(null)` → `null` ; lien encodé contient `Bonjour%20Aurore`.
- [ ] Implémenter ; tests verts ; `bun build`. Commit.

### Tâche 2 : réglage WhatsApp
**Fichiers :** `lib/schema.sql`, `docs/superpowers/migrations/lot2-vitrine.sql`, `app/api/settings/route.js`, `components/SettingsForm.jsx` (`PublicSettingsForm` seulement).
- [ ] Migration idempotente `ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;` (non appliquée en base avant « Merge »).
- [ ] `PATCH /api/settings` accepte `whatsappNumber` → `whatsapp_number` via `normalizeWhatsapp` (400 si erreur).
- [ ] Champ « WhatsApp entreprise (facultatif) » avec aide « Laissez vide tant qu'il n'y a pas de numéro professionnel. Le bouton n'apparaît sur le site que s'il est rempli. »
- [ ] `bun build` sur chaque fichier. Commit.

### Tâche 3 : composants de section
**Fichiers :** créer `components/landing/VisitTimeline.jsx`, `TrustList.jsx`, `PriceTable.jsx`, `Testimonials.jsx`, `StickyContactBar.jsx` (client), `SiteFooter.jsx` ; modifier `Gallery.jsx` (bande asymétrique, défilement horizontal sur mobile, grille irrégulière sur ordinateur).
- [ ] Textes exactement ceux de la spécification (§1). `PriceTable` consomme `priceRows`/`fromPrice` ; `SiteFooter` consomme `whatsappHref`.
- [ ] `bun build` sur chaque fichier. Commit.

### Tâche 4 : page d'accueil
**Fichiers :** `app/page.js`.
- [ ] Réécrire selon l'ordre de la spécification ; métadonnées alignées ; JSON-LD conservé ; un seul h1 ; `aria-labelledby` sur chaque section ; focus visible (`focus-visible:outline-*`) sur liens et boutons de la page.
- [ ] Test de contenu `tests/landing.test.mjs` : aucun emoji ni numéro de téléphone (regex `0[1-9]( ?\d\d){4}`) dans `app/page.js` et `components/landing/*` ; `LeadForm.jsx` contient toujours `name`, `email`, `phone`, `commune`, `animals`, `service`, `message`, `referralCode`, `website`, et l'onglet devis.
- [ ] `bun build`. Commit.

### Tâche 5 : vérification
- [ ] Better Design `check-comprehension` sur les textes visibles ; corriger.
- [ ] Relecture de la branche contre la spécification ; push ; rapport.
