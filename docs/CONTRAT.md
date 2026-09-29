# Contrat à signature électronique (branche `contrat`)

Respecter docs/IDENTITE_VISUELLE.md (aucun emoji, Phosphor, rouille/mousse/miel), AGENTS.md (Next 16 : lire node_modules/next/dist/docs/ au moindre doute ; params/searchParams asynchrones). Pas de build possible : vérifier avec `bun build --no-bundle`. Aucun commit. Réponse finale : 5 lignes max.
Texte du contrat et cases à cocher : lib/contractTemplate.js (déjà écrit, ne pas modifier).

## Données (lib/schema.sql, migrations idempotentes en fin de fichier)
- settings.contract_template TEXT (NULL = modèle par défaut), settings.contract_version INTEGER NOT NULL DEFAULT 1,
  settings.insurance_info TEXT DEFAULT '', settings.mediator_info TEXT DEFAULT ''
- Table contract_signatures : id UUID PK default gen_random_uuid(), client_id UUID NOT NULL REFERENCES clients ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE (sha256 du jeton), version INTEGER NOT NULL, content TEXT NOT NULL (texte final rendu, figé),
  content_hash TEXT NOT NULL (sha256 hex de content), sent_to TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ENVOYE'
  CHECK IN ('ENVOYE','SIGNE','ANNULE'), sent_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL (+14 jours),
  otp_hash TEXT, otp_expires_at TIMESTAMPTZ, otp_attempts INTEGER NOT NULL DEFAULT 0, otp_sent_count INTEGER NOT NULL DEFAULT 0,
  signed_at TIMESTAMPTZ, signer_name TEXT, signer_ip TEXT, signer_user_agent TEXT, checkboxes JSONB,
  emergency_contact TEXT, vet_info TEXT, created_at TIMESTAMPTZ DEFAULT now()
  + index sur client_id.

## lib/contract.js (fonctions serveur)
- renderContract({settings, client, pets}) : remplace les {{variables}} du modèle (settings.contract_template ou défaut) ;
  variables : business_name, legal_form, siret, business_address, contact_email, client_name, client_address, client_email,
  client_phone, insurance_info, mediator_info, animals (liste « Nom - espèce, race - notes » une par ligne),
  tva_mention (= « TVA non applicable, art. 293 B du CGI. » si default_tva_rate = 0, sinon « Prix TTC, TVA au taux de X %. »).
  Valeur manquante -> « [à compléter] » (l'envoi est refusé si business_name/siret/contact_email/insurance_info/mediator_info absents : erreur claire listant les champs).
- newToken() (32 octets aléatoires base64url) + hashToken() (sha256) ; generateOtp() (6 chiffres, crypto.randomInt) + hash avec sel (sha256 de token_hash+code).
- buildContractPdf(signature, client) -> Uint8Array via pdf-lib (texte du contrat paginé, titres en gras, annexe animaux, page finale
  « Preuve de signature » : nom, date/heure Europe/Paris, IP, empreinte SHA-256, version, e-mail, cases cochées, contact d'urgence, vétérinaire).
  Polices StandardFonts (WinAnsi) : remplacer les caractères non supportés.

## API
Admin (requireAdmin) :
- POST /api/clients/[id]/contract : refuse si pas d'email client ; annule les envois ENVOYE précédents ; crée la signature (jeton, expire +14 j) ;
  envoie l'email (Resend, lib/email.js : nouvelle fonction sendContractEmail avec lien `${NEXT_PUBLIC_APP_URL}/contrat/${token}`, vouvoiement, signé Aurore) ;
  renvoie {ok:true}. GET → liste des signatures du client (sans hash).
- GET /api/contracts/[id]/pdf : PDF (admin uniquement, ou le CLIENT propriétaire).
- PATCH /api/settings accepte contractTemplate, insuranceInfo, mediatorInfo ; si contractTemplate change -> contract_version + 1.
Public (aucune session, jeton dans l'URL) — limiter les abus (max 5 codes envoyés par contrat, 5 essais, expiration du code 10 min, comparaisons à temps constant) :
- POST /api/contract/[token]/otp : envoie le code à sent_to (email via Resend) ; réponse générique.
- POST /api/contract/[token]/sign {name, code, checkboxes, emergencyContact, vetInfo} : vérifie jeton non expiré, statut ENVOYE, nom >= 3 caractères,
  case « accept » cochée, contact d'urgence renseigné, code valide ; enregistre signed_at, IP (x-forwarded-for), user-agent, cases ; statut SIGNE ;
  envoie le PDF signé en pièce jointe (base64) au client ET à settings.contact_email ; ne peut jamais être signé deux fois.
- GET /api/contract/[token]/pdf : PDF signé, seulement si SIGNE.

## Pages / UI
- app/contrat/[token]/page.js (publique, sans navigation admin) + composant client : affiche le contrat (titres, paragraphes lisibles, taille de police confortable
  mobile), cases (CONTRACT_CHECKBOXES), champs nom, contact d'urgence, vétérinaire, bouton « Recevoir mon code » puis champ code à 6 chiffres et « Signer le contrat » ;
  états : lien expiré, déjà signé (bouton télécharger le PDF), erreurs claires. Vouvoiement.
- Fiche client (components/ClientInfoCard.jsx ou nouveau components/ClientContractCard.jsx inséré dans app/admin/clients/[id]/page.js) : statut du contrat
  (Non envoyé / En attente de signature (envoyé le…) / Signé le … v N), boutons « Envoyer le contrat » / « Renvoyer », « Télécharger le PDF ».
- Réglages (components/SettingsForm.jsx + app/admin/settings/page.js) : section « Contrat » : assurance RC pro (compagnie + n° de contrat), médiateur de la consommation,
  éditeur du modèle (textarea, bouton « Rétablir le modèle par défaut », aide sur les variables, avertissement « à faire relire par un professionnel »), version courante.
- Portail client (app/portal/page.js) : lien vers le contrat signé si présent.
