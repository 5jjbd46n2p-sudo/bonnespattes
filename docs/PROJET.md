# Aux Bonnes Pattes — mémo projet

Appli de gestion pet sitting d'Aurore (interface en français). Stack : Next.js 16.2 App Router, React 19.2, Tailwind v4, Postgres Neon (`pg`, lib/db.js avec query()/tx()), Vercel Blob **privé** (photos), Resend (emails via fetch, lib/email.js). Déploiement Vercel : `main` = production, `ui-ux` = branche de travail en aperçu.

- Auth : JWT dans le cookie httpOnly `petsitter_session` (lib/auth.js : requireAdmin/requireClient/getCurrentUser), bcrypt coût 12, verrouillage après 6 échecs, rôles ADMIN/CLIENT. Ne jamais remettre de JWT_SECRET par défaut ni renvoyer `e.message` au client.
- Variables d'env (Vercel) : DATABASE_URL, JWT_SECRET, BLOB_STORE_ID (+ OIDC ; ajouter BLOB_READ_WRITE_TOKEN si l'upload échoue), RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL.
- Schéma : lib/schema.sql, idempotent (bloc ALTER … IF NOT EXISTS en fin de fichier) ; `npm run migrate`, `npm run create-admin`.

## Fonctionnalités
Écran Aujourd'hui (bandeau « prochaine visite », résumé du jour), Planning mois/semaine façon Calendrier iOS, Clients et animaux, Visites (PLANIFIE/EN_COURS/FAIT/ANNULE, tâches, photos), récurrence « semaine type » (jours + nombre de semaines), prix auto = tarif horaire × durée, Compta (factures PDF avec pdf-lib, TVA, paiements, acomptes, export CSV), Réglages (dont mentions légales, apparence, déconnexion).
Planifier : /admin/visits/new → client choisi en premier, formulaire bloqué tant qu'il n'est pas sélectionné.
Composants clés : VisitCard (Démarrer/Terminer, swipe, photo en un tap), MobileNav (barre d'onglets en bas), GlobalSearch (/api/search, ⌘K), ThemeToggle (cookie `theme`), StatusBadge (VISIT_STATUS).
Photos : upload en `access: "private"`, lecture via /api/photos/[id]/file (admin ou client propriétaire uniquement).
Portail client /portal : historique, photos, export RGPD en JSON. Pages publiques /mentions-legales et /confidentialite alimentées par la table settings.

## Conventions
Textes de l'interface en français : tutoiement côté admin, vouvoiement côté client. Commits en français. Identité visuelle : docs/IDENTITE_VISUELLE.md.

## Documents et phrase du jour
Onglet Documents (/admin/documents) : business plan et plan marketing, contenu dans lib/documents.js (blocs p/h3/ul/ol/note/table), chacun avec une checklist. Avancement en base, table `doc_checklist` créée à la première utilisation (lib/docChecklist.js) ; ne jamais renommer un identifiant de case déjà publié. Phrase du jour sous le titre « Aujourd'hui » : 365 phrases rangées par mois dans lib/dailyPhrases.js, choisies par la date de Paris, identiques d'une année sur l'autre (29 février = 28).

## Modèles du plan marketing (onglet Conception)

Six modèles ajoutés dans `lib/designTemplates.js`, en plus des cinq premiers :
- cartes : « Recommandation » (prescripteurs), « Parrainage » (avec la facture), « Avis Google » (fin de garde, QR à remplacer par le lien d'avis) ;
- flyers A5 : « Carnet » (boîtes aux lettres), « Affichette » à languettes (recto vétérinaires et toiletteurs, verso commerces), « Promenades » (campagnes de janvier et de la rentrée).

Chaque QR porte une provenance (`?utm_source=carte`, `parrainage`, `avis`, `flyer`, `affiche`, `flyer-promenades`) pour le bilan par canal. Le SIRET et la mention d'assurance viennent des Réglages (`siret`, `insurance_info`) ; sans SIRET, le flyer affiche « SIRET à compléter ». Aucun de ces modèles n'annonce de soin ni de garde au domicile d'Aurore.
