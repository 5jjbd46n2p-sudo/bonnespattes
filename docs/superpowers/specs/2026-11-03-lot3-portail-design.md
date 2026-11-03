# Lot 3 : portail client

Date : 2026-11-03. Statut : proposition, à valider par Timothé section par section (aucune conception encore approuvée).
Source : `docs/lots/lot-3-portail-client.md`, lecture du code de `main` (b20afa7), règles Better Design (accessibilité, formulaires multi-étapes, navigation). Rien n'a été vu à l'écran.

## Objectif
Qu'une cliente qui ouvre son espace sache en cinq secondes comment va son animal, ce qu'elle doit éventuellement payer et ce qui est prévu ensuite. Le reste (contrat, puce, parrainage, données) reste accessible sans encombrer.

## Constat
| # | Problème | Preuve | Gravité |
|---|---|---|---|
| 1 | Les visites **à venir** sont mêlées aux comptes rendus, en tête de liste (tri date décroissante, 50 visites, statuts confondus) : le dernier compte rendu peut être sous plusieurs visites « Planifiée ». | `app/portal/page.js:18-22`, `:145` | Élevée |
| 2 | Aucune **prochaine visite** mise en avant ; les visites annulées apparaissent dans le fil. | `app/portal/page.js:145-200` | Élevée |
| 3 | Photos en vignettes de 96 px qui ouvrent le fichier brut dans un nouvel onglet : pas de visionneuse, pas de chargement différé, toutes les photos des 50 visites chargées d'un coup ; texte alternatif identique pour toutes. | `app/portal/page.js:186-197` | Élevée |
| 4 | **Factures en bas de page**, sans reste à payer, sans IBAN ni référence de virement ; lien libellé « PDF ». | `app/portal/page.js:239-271` | Élevée |
| 5 | Pas de navigation : `PortalNav` ne contient que le logo et « Déconnexion » ; « Changer mon mot de passe » est caché dans le pied de page en 12 px ; « Télécharger mes données » est un bouton en tête, au même niveau que le titre. | `components/PortalNav.jsx:16-26`, `app/portal/layout.js:15-27`, `app/portal/page.js:118` | Moyenne |
| 6 | Accord fautif : « 1 sur 3 tâches faite » (le pluriel suit `doneCount`, pas le nom). | `app/portal/page.js:158-159` | Faible |
| 7 | Contrat signé : seulement « Signé le … (version N) », sans résumé ni état « scellé » (dépend du lot 0 B). | `app/portal/page.js:224-237` | Moyenne |
| 8 | `!py-1.5 !px-3` (boutons de 36 px) et `text-xs` (12 px, sous le minimum de 13 px de l'identité). | `app/portal/page.js:118,232`, `app/portal/layout.js:15` | Faible (`rule/touch-target-min-44px`) |
| 9 | Ordre arbitraire : parrainage avant contrat et factures. | `app/portal/page.js:205-239` | Moyenne |

## Approches
1. **Accueil réordonné sur une seule page** (recommandée). Gain : un seul écran, aucun nouveau chemin à apprendre, peu de code ; perte : page longue pour les clientes anciennes (atténuée par l'historique groupé et replié par mois) ; touche : les clientes, Aurore (aucun changement d'usage).
2. **Trois pages** (Nouvelles, Factures, Mon compte) avec onglets. Gain : chaque page courte ; perte : une facture à régler devient un clic plus loin, plus de code et de navigation ; convient si les clientes ont beaucoup de factures, ce qui n'est pas le cas aujourd'hui.
3. **Statu quo + visionneuse seulement**. Gain : rapide ; perte : ne règle ni l'ordre ni les factures.

Recommandation : 1, avec une navigation légère à trois ancres (Nouvelles, Factures, Mon compte) qui défilent vers les sections plutôt que des pages séparées.

## Conception recommandée

### Structure d'écran (ordre)
1. **En-tête** (`PortalNav`) : logo, trois liens « Nouvelles », « Factures », « Mon compte » (ancres sur mobile, liens visibles, 44 px), « Déconnexion » dans « Mon compte ».
2. **« Les nouvelles de {animal} »** (titre existant conservé) puis, si besoin, deux encadrés prioritaires :
   - « Contrat à signer » (existant, inchangé dans son fonctionnement) ;
   - « Facture à régler » : numéro, reste à payer, échéance, IBAN et référence (le numéro de facture) en clair avec bouton « Copier l'IBAN », lien « Voir la facture ». N'apparaît que pour les factures non soldées, non annulées par avoir.
3. **Dernier compte rendu** en grand : date et heure, animal, note d'Aurore, tâches faites (liste à coches existante, accord corrigé : « 3 tâches sur 4 faites »), photos en grand (première photo pleine largeur, suivantes en bande) ouvrant une **visionneuse**.
4. **Prochaine visite** : une ligne « Prochain passage : mardi 12 novembre, vers 9 h » (ou rien s'il n'y en a pas). Les visites planifiées sortent du fil des comptes rendus.
5. **Historique** : visites terminées, groupées par mois (`<details>` par mois, le mois courant ouvert), chaque visite sur une ligne repliable ; les visites annulées sont exclues ; chargement des photos différé (`loading="lazy"`).
6. **Factures** : toutes les factures, la plus récente en tête, libellé « Télécharger la facture F0004 (PDF) ».
7. **Mon compte** : contrat (résumé en trois lignes : prestations, préavis, résiliation, extraites du modèle ; état « Signé le … » puis « Scellé le … » quand le lot 0 B sera en place ; PDF), puce et tatouage (composant existant), parrainage (existant), « Changer mon mot de passe », « Télécharger mes données », « Déconnexion ».

### Composants
- `components/portal/LatestReport.jsx` (serveur) ; `components/portal/PhotoViewer.jsx` (client, `<dialog>` modal, flèches clavier, balayage, compteur « 2 / 5 », bouton Fermer, Échap) ; `components/portal/InvoiceDue.jsx` (serveur + petit bouton client « Copier ») ; `components/portal/MonthHistory.jsx` (serveur, `<details>`).
- `PortalNav` : liens d'ancres, `aria-current` sur la section visible n'est pas nécessaire (ancres simples).

### Données
- Requêtes séparées : dernier compte rendu (`status = 'FAIT'` le plus récent), prochaine visite (`status IN ('PLANIFIE','EN_COURS') AND date >= today` la plus proche), historique (`FAIT`, 12 derniers mois, puis « Voir plus »). Plus de `LIMIT 50` toutes visites confondues.
- Reste à payer = `total_ttc - paid_amount` (déjà calculé `app/portal/page.js:46`), IBAN depuis `settings.iban` (déjà public sur chaque facture, décision prise).
- Aucune migration.

### Accessibilité
- Un seul `h1`, sections `h2` reliées par `aria-labelledby` ; visionneuse en `<dialog>` modal (`rule/dialog-manages-focus`) ; textes alternatifs « Photo {n} de {animal}, visite du {date} » ; cibles ≥ 44 px ; état des tâches par icône + texte, pas par la couleur seule (`rule/no-color-only-meaning`).
- Dépend du lot 1 pour `Field`, focus visible et dialogues ; si le lot 3 passe avant, la visionneuse utilise directement `<dialog>`.

### Vérification
`bun build` par fichier ; tests de la logique pure (regroupement par mois, accord « tâches faites », reste à payer, sélection prochaine visite) ; parcours mobile par Timothé avec un compte client de test : lecture du compte rendu, visionneuse, copie de l'IBAN, signature de contrat.

## Hors périmètre
Paiement en ligne (carte), messagerie avec Aurore, notifications push, refonte du contrat lui-même, sceau (lot 0 B).

## Questions à trancher par Timothé
1. Accueil sur une seule page avec ancres (recommandé) ou trois pages séparées ?
2. Afficher l'IBAN en clair dans le portail avec un bouton « Copier » (recommandé : oui, il figure déjà sur chaque facture) ?
3. Heure de la prochaine visite : afficher l'heure exacte ou un créneau « vers 9 h » (recommandé : « vers », Aurore peut décaler de quelques minutes) ?
4. Historique : 12 derniers mois puis « Voir plus » (recommandé) ou tout l'historique ?
5. Résumé du contrat : extrait automatique du modèle (recommandé) ou texte écrit par Aurore dans les Réglages ?
6. Faire le lot 3 avant ou après le lot 0 B (sceau) ? Recommandé : après, pour afficher directement « Scellé le ».
