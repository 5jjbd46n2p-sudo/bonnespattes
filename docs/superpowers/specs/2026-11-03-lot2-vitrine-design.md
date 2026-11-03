# Lot 2 : vitrine (direction A « carnet de balade éditorial »)

Date : 2026-11-03. Conception validée par Timothé en trois sections le 2026-11-03.
Maquette de référence : brouillon Superdesign `131b70be-0fc2-419e-b987-901fb34a0557` (mobile). Les textes ci-dessous priment sur ceux de la maquette.

## Objectif
Une page d'accueil qui inspire confiance et ne ressemble pas à un gabarit généré : accroche spécifique, rythme varié (texte, photo pleine largeur, déroulé, citation, liste), textes concrets, une seule action principale.

## 1. Structure et textes (ordre de la page)
1. **En-tête** : logo à gauche, lien « Espace client » à droite.
2. **Ouverture** : h1 « Visites et balades pour vos animaux, à Viarmes et autour. » ; sous-titre « Aurore, ancienne assistante vétérinaire. Un compte rendu avec photos après chaque passage. » ; bouton « Demander un rendez-vous » (ancre `#contact`). Le bouton « Voir les tarifs » est retiré (une seule action principale).
3. **Grande photo pleine largeur** (emplacement `hero`) avec une courte légende.
4. **« Une visite, concrètement »** : déroulé vertical à filets, sans cartes :
   - Arrivée et premier contact ;
   - Eau et repas selon vos consignes ;
   - Litière ou balade ;
   - Jeu et câlins ;
   - Un coup d'œil à la maison ;
   - Compte rendu et photos dans votre espace client.
   Aucune formule creuse (« méticuleux », « dynamique », « privilégié », « immédiatement »).
5. **« À propos »** : environ 60 mots, à la première personne, faits réels uniquement (diplôme d'assistante vétérinaire, trois ans en clinique, chiens, chats et NAC). Citation en exergue « Je repère ce qui ne va pas et je vous préviens vite. — Aurore », suivie de « Je ne pose pas de diagnostic, votre vétérinaire reste votre vétérinaire. » Photo `confiance` à côté si elle existe.
6. **« Pour votre tranquillité »** : liste simple à filets : contrat écrit ; assurance RC professionnelle (seulement si `settings.insurance_info` est renseigné, comme aujourd'hui) ; première rencontre gratuite chez vous ; devis personnalisé sous 24 h.
7. **« Ils me font confiance »** : avis publiés (`loadPublishedTestimonials`), section masquée s'il n'y en a aucun.
8. **Tarifs** : « À partir de {min} » puis petit tableau 30 min / 45 min / 1 h (`rate_30`, `rate_45`, `rate_60`) et la garde au forfait journalier si `rate_day` est réglé ; une ligne sans tarif n'est pas affichée. Zone et frais de déplacement mentionnés une seule fois. Pas de « devis gratuit ».
9. **« Instants de balade »** : galerie en bande de photos de tailles inégales ; seules les photos chargées s'affichent ; section masquée sans photo.
10. **Formulaire** (`#contact`) : `LeadForm` conservé en entier (téléphone facultatif, « Les deux », code de parrainage, onglet devis garde longue). Le lien vers la politique de confidentialité reste. Introduction : « Parlez-moi de vous et de vos compagnons. Je vous réponds sous 24 h. La première rencontre est gratuite. »
11. **Pied de page** : logo, zone, lien « Écrire à Aurore » (`mailto:` vers `settings.contact_email`), bouton WhatsApp si configuré, Instagram, mentions légales, confidentialité, espace client.
12. **Mobile** : barre fixée en bas avec « Demander un rendez-vous », masquée quand le formulaire est à l'écran ; absente sur ordinateur.
La section « Comment ça se passe » (3 étapes) est retirée : rencontre gratuite et devis sous 24 h sont dans « Pour votre tranquillité ». Le formulaire reste en bas de page (décision validée) : le bouton d'ouverture et la barre fixe y mènent.

## 2. Réalisation technique
- `app/page.js` réécrit dans cet ordre en conservant : redirection des personnes connectées, code de parrainage `?parrain=`, JSON-LD `ProfessionalService` (sans note ni avis), photos, avis, tarifs.
- Composants `components/landing/` : `VisitTimeline`, `TrustList`, `PriceTable`, `Testimonials`, `StickyContactBar` (client), `SiteFooter`. `Gallery` passe en bande asymétrique. `Photo`, `Logo`, `LeadForm` conservés (LeadForm : aucun changement de champs ni d'envoi).
- Données lues en base : tarifs, `service_area`, photos (`hero` en grande photo, `confiance` pour « À propos » ; `services` n'est plus utilisé mais reste dans l'admin), `contact_email`.
- Nouveau réglage **« WhatsApp entreprise »** : colonne `settings.whatsapp_number TEXT` (vide par défaut), champ dans Réglages > Site public, validé par `PATCH /api/settings` (chiffres, `+` initial facultatif, espaces tolérés, 8 à 15 chiffres ; vide = désactivé). Le bouton `https://wa.me/<chiffres>?text=<message encodé>` n'apparaît que si le numéro est renseigné. Message prérempli : « Bonjour Aurore, je vous contacte depuis le site Aux Bonnes Pattes. »
- Barre fixe mobile : composant client, `IntersectionObserver` sur `#contact`, `env(safe-area-inset-bottom)`, `md:hidden`.
- SEO : titre et description alignés sur la nouvelle accroche ; JSON-LD conservé.
- Accessibilité : un seul h1, sections reliées à leur titre (`aria-labelledby`), focus visible sur les liens et boutons de la page, textes alternatifs en français. Le socle global (bordures de champs, composant Field) relève du lot 1.
- Contact : formulaire et e-mail uniquement, aucun numéro de téléphone affiché.

## 3. Vérification et livraison
- Branche `lot2-vitrine` partie de `main`, fusionnée seulement sur « Merge ».
- Migration : `ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;` dans `lib/schema.sql` et `docs/superpowers/migrations/lot2-vitrine.sql`, appliquée en base au moment du « Merge ».
- `bun build --no-bundle` sur chaque fichier ; tests : ligne de tarif vide masquée, lien WhatsApp seulement si numéro et message encodé, absence d'emoji et de numéro de téléphone dans la page, présence de tous les champs actuels du formulaire.
- Better Design `check-comprehension` sur les textes visibles.
- Contrôle visuel sur l'aperçu Vercel mobile par Timothé avant « Merge » (la session n'a pas de navigateur qui atteint le site).
- Rapport : vérifié, non vérifié, photos qu'Aurore peut ajouter (galerie).
