# Lot 3 — Portail client : plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche par tâche. Étapes en cases (`- [ ]`).

**Objectif :** un espace client qui répond d'abord à « comment va mon animal ? », met en avant la facture à régler et la prochaine visite, et range le reste dans « Mon compte ».

**Architecture :** la page `app/portal/page.js` devient un assemblage de composants serveur alimentés par un chargeur de données unique (`lib/portalData.js`) ; toute la logique de présentation calculable (regroupement par mois, libellés, reste à payer, résumé du contrat) vit dans `lib/portal.js`, pur et testé ; seuls la visionneuse photo et le bouton « Copier » sont des composants client.

**Pile :** Next.js 16 App Router (lire `node_modules/next/dist/docs/` si présent), React 19, Tailwind v4, `@phosphor-icons/react`, `pg`.

**Spec :** `docs/superpowers/specs/2026-11-03-lot3-portail-design.md` (décisions validées le 2026-11-03).

## Dépendances
- **Après `secu-0b-contrat`** (lot 0 phase B, sceau) fusionnée dans `main` : colonnes `contract_signatures.sealed_at`, `seal_legacy`, `seal_hash` utilisées pour l'état « Scellé le ».
- Après le lot 1 si possible (`Field`, focus visible, `<dialog>` commun). Sinon la visionneuse utilise `<dialog>` directement.
- Branche `lot3-portail` partie de `origin/main` à jour au moment du démarrage.

## Contraintes globales
- Vouvoiement, signé Aurore ; aucun emoji ; icônes Phosphor `regular` 20 px ; couleurs et classes de `app/globals.css` uniquement ; libellés ≥ 13 px ; cibles tactiles ≥ 44 px.
- Titre conservé : « Les nouvelles de {animal} » (liste d'animaux « A, B et C » comme aujourd'hui).
- Le client ne voit jamais : brouillons, factures de test, visites annulées, accès (clés, digicode), notes internes.
- Pas de build : `bun build --no-bundle <fichier>` sur chaque fichier ; logique pure par `bun test tests/<fichier>.test.mjs` (sans import de `lib/db.js` direct ; `mock.module("../lib/db.js")` si besoin, comme `tests/rateLimit.test.mjs`).
- Routes : handlers seulement ; dates SQL en `::text` vers le client.
- Aucune migration.
- Trailers : `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `Claude-Session: https://claude.ai/code/session_01UDBZYwjhnRcqfgzYGzF2Uu`. Fusion uniquement sur « Merge ».

## Points d'attention (non couverts tels quels par la spec)
1. **Client sans animal** ou animal supprimé : titre « Les nouvelles de vos compagnons », pas de plantage dans le compte rendu (jointure `LEFT JOIN pets`).
2. **Visite terminée sans tâche, sans note et sans photo** : le compte rendu affiche « Visite faite le … » et rien de vide (pas de liste vide, pas de bloc photo vide).
3. **Facture partiellement payée ou annulée par avoir** : un avoir ou une facture soldée par avoir n'apparaît jamais dans « Facture à régler » ; un acompte réduit le reste à payer.
4. **IBAN non renseigné** dans les Réglages : l'encadré dit « Coordonnées bancaires sur la facture » sans bouton Copier.
5. **Presse-papiers indisponible** (navigateur ancien, contexte non sécurisé) : le bouton Copier affiche l'IBAN sélectionné et « Copiez-le manuellement ».

---

### Tâche 1 : logique pure du portail

**Fichiers :** créer `lib/portal.js`, `tests/portal.test.mjs`.

**Interfaces produites :**
- `groupVisitsByMonth(visits: {date: string}[]): {key: string, label: string, visits: object[]}[]` — clé `YYYY-MM`, libellé « novembre 2026 », ordre du plus récent au plus ancien, ordre des visites conservé.
- `tasksDoneLabel(done: number, total: number): string` — « 3 tâches sur 4 faites », « 1 tâche sur 1 faite », « 1 tâche sur 3 faite » ; `""` si `total === 0`.
- `approxTimeLabel(time: string|null): string` — `"09:00:00"` → « vers 9 h », `"09:30"` → « vers 9 h 30 », `null` → `""`.
- `amountDue(totalTtc, paid): number` — arrondi au centime, jamais négatif.
- `isInvoiceDue(inv: {credit_note_of, settled, status, total_ttc, paid_amount}): boolean` — vrai si pas un avoir, pas soldée par avoir, statut `ENVOYEE` ou `EN_RETARD`, et `amountDue > 0`.
- `contractSummary(content: string): {title: string, text: string}[]` — pour les articles « Prestations », « Annulation et modification par le Client », « Durée et résiliation » (repérés par `## Article N - <titre>`), la première phrase du paragraphe ; tableau vide si le modèle n'a pas ces titres.

- [ ] **Étape 1 : tests (échouent)** : regroupement de visites sur deux mois dans le bon ordre ; les trois cas d'accord de `tasksDoneLabel` ; `approxTimeLabel` sur `09:00:00`, `09:30`, `null`, `"14:05"` (« vers 14 h 05 ») ; `amountDue(84, 30) === 54`, `amountDue(84, 90) === 0` ; `isInvoiceDue` faux pour avoir, soldée, payée, brouillon ; `contractSummary(DEFAULT_CONTRACT_TEMPLATE)` renvoie 3 entrées non vides ; `contractSummary("texte libre")` renvoie `[]`.
- [ ] **Étape 2 :** `bun test tests/portal.test.mjs` → échec (module absent).
- [ ] **Étape 3 :** implémenter `lib/portal.js` (aucune dépendance base).
- [ ] **Étape 4 :** `bun test tests/portal.test.mjs` → PASS ; `bun build --no-bundle lib/portal.js` → OK.
- [ ] **Étape 5 : commit** « Portail : logique de présentation (mois, tâches, reste à payer, résumé du contrat) ».

### Tâche 2 : chargeur de données

**Fichiers :** créer `lib/portalData.js`, `tests/portalData.test.mjs`.

**Interfaces :**
- Consomme : `query` (`lib/db.js`), `SETTLED_BY_CREDIT_NOTE_SQL` (`lib/invoiceNumber.js`), `isInvoiceDue` (tâche 1).
- Produit : `loadPortalData(clientId: string, { fullHistory = false } = {}): Promise<{ pets, latestReport, nextVisit, history, historyHasMore, invoices, dueInvoices, iban, pendingContract, signedContract, referral }>` où :
  - `latestReport` : dernière visite `status = 'FAIT'` avec `tasks`, `photos` (id seulement), `pet_name`, ou `null` ;
  - `nextVisit` : visite `PLANIFIE` ou `EN_COURS` avec `date >= aujourd'hui (Europe/Paris)`, la plus proche, ou `null` ;
  - `history` : visites `FAIT` hors `latestReport`, 12 derniers mois (ou toutes si `fullHistory`), avec tâches et photos ; `historyHasMore` vrai s'il en existe de plus anciennes ;
  - `signedContract` : `{ id, version, signed_at, sealed_at, seal_legacy, content }` ;
  - `referral` : `{ code, link, credit, balance }` ou `null` (même tolérance qu'aujourd'hui).
  - Toutes les dates renvoyées en texte (`::text`).

- [ ] **Étape 1 : tests (échouent)** avec `mock.module("../lib/db.js")` : la requête de l'historique filtre `status = 'FAIT'` et exclut l'id du dernier compte rendu ; `nextVisit` ignore une visite `ANNULE` ; `dueInvoices` n'inclut ni avoir ni facture soldée ; `historyHasMore` vrai quand une visite a plus de 12 mois et `fullHistory` faux.
- [ ] **Étape 2 :** implémenter ; `bun test tests/portalData.test.mjs` → PASS ; `bun build` → OK.
- [ ] **Étape 3 : commit** « Portail : chargeur de données (compte rendu, prochaine visite, historique, factures) ».

### Tâche 3 : visionneuse photo et bouton Copier

**Fichiers :** créer `components/portal/PhotoViewer.jsx` (client), `components/portal/CopyIban.jsx` (client).

**Interfaces produites :**
- `<PhotoViewer photos={[{id, alt}]} />` : affiche la première photo pleine largeur et les suivantes en bande (`loading="lazy"`, `/api/photos/{id}/file`) ; un clic ouvre un `<dialog>` modal (`showModal`) avec la photo en grand, « Précédente » / « Suivante » (boutons 44 px, flèches gauche/droite au clavier, balayage horizontal), compteur « 2 sur 5 », bouton « Fermer » (icône X + texte masqué), Échap ferme, focus rendu à la vignette d'origine.
- `<CopyIban iban="FR76…" />` : bouton « Copier l'IBAN » ; succès « IBAN copié » (`role="status"`) ; échec : sélection du texte et « Copiez-le manuellement ».

- [ ] **Étape 1 :** implémenter les deux composants (pas de test unitaire : rendu client ; vérifié à l'écran).
- [ ] **Étape 2 :** `bun build --no-bundle` sur chacun → OK.
- [ ] **Étape 3 : commit** « Portail : visionneuse photo et copie de l'IBAN ».

### Tâche 4 : sections de la page

**Fichiers :** créer `components/portal/LatestReport.jsx`, `NextVisit.jsx`, `InvoiceDue.jsx`, `MonthHistory.jsx`, `InvoiceList.jsx`, `AccountSection.jsx` (tous serveur).

**Interfaces :** consomment les sorties de `loadPortalData` (tâche 2) et les fonctions de la tâche 1.
- `LatestReport({ report })` : `h2` « Dernier passage » ; date longue, heure, animal ; note (`whitespace-pre-line`) ; tâches (icône + texte, `tasksDoneLabel`) ; `PhotoViewer`. Rien de vide affiché (point d'attention 2).
- `NextVisit({ visit })` : « Prochain passage : mardi 12 novembre, vers 9 h » ; rien si `null`.
- `InvoiceDue({ invoices, iban })` : un encadré par facture due : numéro, reste à payer, échéance, IBAN + `CopyIban`, référence « Indiquez F0004 en libellé du virement », lien « Voir la facture F0004 (PDF) » (points d'attention 3 et 4).
- `MonthHistory({ months, hasMore })` : `<details>` par mois (mois courant ouvert), chaque visite en ligne repliable ; lien « Voir plus » → `/portal?historique=tout#nouvelles`.
- `InvoiceList({ invoices })` : toutes les factures, libellés « Télécharger la facture F0004 (PDF) », badges existants.
- `AccountSection({ signedContract, pets, referral })` : contrat (résumé `contractSummary` en trois lignes ; état « Signé le {date} » + « Scellé le {sealed_at} » si `seal_legacy`, sinon « Signé et scellé le {date} » ; lien PDF), `PortalPetIdentification` existant, parrainage existant, liens « Changer mon mot de passe », « Télécharger mes données », bouton Déconnexion.

- [ ] **Étape 1 :** implémenter ; `bun build --no-bundle` sur chaque fichier → OK.
- [ ] **Étape 2 : commit** « Portail : sections compte rendu, prochaine visite, factures, historique, compte ».

### Tâche 5 : page, navigation et mise en page

**Fichiers :** modifier `app/portal/page.js` (réécriture), `components/PortalNav.jsx`, `app/portal/layout.js`.

- [ ] **Étape 1 :** `page.js` : `clientPageGuard`, `searchParams` asynchrone (`historique === "tout"`), `loadPortalData`, ordre : `h1` → contrat à signer (existant) → `InvoiceDue` → `LatestReport` → `NextVisit` → section `#nouvelles` (`MonthHistory`) → section `#factures` (`InvoiceList`) → section `#compte` (`AccountSection`). Écran vide existant conservé (« Pas encore de visite… »).
- [ ] **Étape 2 :** `PortalNav` : logo + trois liens d'ancre « Nouvelles », « Factures », « Mon compte » (44 px, 13 px minimum, focus visible) ; la déconnexion passe dans `AccountSection`.
- [ ] **Étape 3 :** `layout.js` : pied de page en 13 px (`text-legende` si le lot 1 est fusionné, sinon `text-[13px]`), lien « Changer mon mot de passe » retiré (déplacé dans Mon compte).
- [ ] **Étape 4 :** `bun build --no-bundle` sur les trois fichiers → OK ; `bun test tests/` → tout passe.
- [ ] **Étape 5 : commit** « Portail : accueil centré sur les nouvelles, factures et compte ».

### Tâche 6 : vérification et documentation

- [ ] **Étape 1 :** contrôle automatique : aucun `alert(`/`confirm(`, aucun emoji, aucun `!py-`/`!px-` dans `app/portal` et `components/portal`.
- [ ] **Étape 2 :** `docs/PROJET.md` : paragraphe portail mis à jour.
- [ ] **Étape 3 : commit** « Portail : documentation ». Push `lot3-portail`. Rapport : ce qui n'est pas testé à l'écran ; demander à Timothé le parcours mobile avec un compte client de test (connexion, compte rendu, visionneuse, copie de l'IBAN, contrat, « Voir plus »).
