# Page d'accueil publique + demandes + parrainage (branche `vitrine`)

Respecter docs/IDENTITE_VISUELLE.md (carnet de balade : papier/lin/encre, rouille, mousse, miel ; Fraunces + Atkinson ; Phosphor ; zéro emoji ; filets plutôt que cartes).
AGENTS.md : Next 16 (params/searchParams asynchrones). Pas de build : `bun build --no-bundle`. Aucun commit. Réponse finale : 5 lignes max.
Ton public : vouvoiement, chaleureux, sobre, signé Aurore. Aurore est **ancienne assistante vétérinaire**, propose **visites à domicile et promenades pour chiens et chats**,
secteur Viarmes (95270) et environs (~15 km). Ne JAMAIS promettre de soins médicaux ni de diagnostic (dire : « regard attentif, habituée aux animaux de toutes sortes,
je repère ce qui ne va pas et je préviens vite »). Pas de faux avis ni faux chiffres. Tarifs affichés = settings.rate_30/45/60 (à partir de), déplacement selon distance.
Photos : Aurore les fournira plus tard : emplacements /public/photos/hero.jpg, about.jpg, gallery-1.jpg … gallery-6.jpg ; si absent, afficher un bloc de couleur papier/sable
(pas d'image cassée, pas d'onglet vide) — utiliser un composant <Photo src alt> qui gère le repli (onError -> fond sable). Alt en français descriptif.

## Données (lib/schema.sql, migrations idempotentes en fin de fichier)
- clients.referral_code TEXT UNIQUE (8 caractères A-Z2-9 sans ambiguïté, généré à la création du client et rétro-rempli pour les existants : UPDATE ... WHERE referral_code IS NULL)
- settings.referral_credit NUMERIC DEFAULT 10 (crédit offert au parrain ET au filleul, en €), settings.service_area TEXT DEFAULT 'Viarmes et environs (15 km)'
- Table leads : id UUID PK, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, commune TEXT, animals TEXT (chien/chat, nombre, âge), service TEXT ('VISITE'|'PROMENADE'|'LES_DEUX'),
  message TEXT, referral_code TEXT (code du parrain, validé), referrer_client_id UUID REFERENCES clients ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'NOUVEAU' CHECK IN
  ('NOUVEAU','CONTACTE','CLIENT','SANS_SUITE'), client_id UUID REFERENCES clients ON DELETE SET NULL (rempli quand converti), ip_hash TEXT, created_at TIMESTAMPTZ DEFAULT now()
- Table client_credits : id UUID PK, client_id UUID NOT NULL REFERENCES clients ON DELETE CASCADE, amount NUMERIC NOT NULL, reason TEXT NOT NULL, lead_id UUID REFERENCES leads ON DELETE SET NULL,
  used_invoice_id UUID REFERENCES invoices ON DELETE SET NULL, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now() ; UNIQUE (client_id, lead_id) pour interdire un double crédit.

## API
Public :
- POST /api/leads : valide (nom >= 2, email valide, message <= 2000 car., champ piège `website` doit rester vide), limite 3 demandes/heure/IP (via ip_hash = sha256(ip+sel) et comptage en base),
  code parrain optionnel -> retrouver clients.referral_code (insensible à la casse) sinon ignoré sans erreur ; enregistre ; envoie 2 emails via lib/email.js (nouveau helper sendLeadEmails :
  notification à settings.contact_email avec toutes les infos + lien /admin/leads ; accusé de réception au demandeur, vouvoiement, « Aurore vous répond sous 24 h »). Réponse {ok:true}. L'échec d'envoi d'email ne fait pas échouer la demande.
Admin (requireAdmin) :
- GET /api/leads?status= ; PATCH /api/leads/[id] {status} ; POST /api/leads/[id]/convert : crée le client (nom, email, téléphone, adresse vide) + son code de parrainage, lie leads.client_id, statut CLIENT ;
  si referrer_client_id : crée 2 crédits (parrain et filleul, montant settings.referral_credit, raison « Parrainage — {nom} ») dans la même transaction ; renvoie {clientId}.
- Facturation : dans app/api/invoices/from-visits/route.js (contrat existant), ajouter automatiquement une ligne « Crédit parrainage » négative pour les crédits non utilisés du client
  (jamais au-delà du total de la facture), les marquer used_invoice_id/used_at dans la même transaction. Ne rien casser du comportement actuel.
- PATCH /api/settings accepte referralCredit, serviceArea.

## Pages / UI
- app/page.js : si non connecté -> page d'accueil publique (plus de redirection vers /login) ; si connecté -> redirection actuelle. Sections : en-tête sobre (logo, « Espace client » -> /login),
  hero (promesse + bouton « Demander un rendez-vous » ancre #contact + photo), « Ce que je fais » (visite à domicile, promenade, chiens et chats), « Pourquoi me faire confiance »
  (ancienne assistante vétérinaire, comptes rendus avec photos après chaque visite, contrat clair, assurance), « Tarifs » (à partir de, déplacement selon distance, zone),
  « Comment ça se passe » (3 étapes : demande, rencontre gratuite, visites), galerie, formulaire #contact (nom, email, téléphone, commune, animaux, service, message, champ piège, code parrain prérempli
  via ?parrain=CODE avec mention « Recommandé par {prénom} » côté serveur), pied de page (mentions légales, confidentialité, Instagram @auxbonnespattes, lien https://www.instagram.com/auxbonnespattes/).
  Métadonnées SEO soignées (title, description, Open Graph, JSON-LD LocalBusiness/ProfessionalService avec nom, zone, sans note ni avis), lisible mobile en premier, accessible (contrastes, focus).
- app/admin/leads/page.js : liste des demandes par statut (onglets), détail dépliable, boutons « Contactée », « Sans suite », « Créer le client » (POST convert puis redirection vers la fiche) ; badge compteur
  de nouvelles demandes ; entrée « Demandes » dans components/AdminNav.jsx (icône Phosphor) et accès depuis components/MobileNav.jsx sans casser la barre (ex. lien dans l'en-tête ou sur « Aujourd'hui »).
- Portail client (app/portal/page.js) : carte « Parrainez un proche » : lien personnel `${NEXT_PUBLIC_APP_URL}/?parrain=CODE`, bouton copier, texte de l'avantage (crédit de X € pour vous et votre filleul),
  solde de crédits disponibles. Fiche client admin (app/admin/clients/[id]/page.js) : code de parrainage + crédits.
- Réglages (components/SettingsForm.jsx + app/admin/settings/page.js) : montant du crédit de parrainage, zone d'intervention.
