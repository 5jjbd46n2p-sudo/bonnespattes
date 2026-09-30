// Modèle de contrat par défaut (texte brut). Lignes "## " = titre d'article.
// Variables {{...}} remplacées à l'envoi (lib/contract.js). Le texte envoyé est
// figé dans la signature ; modifier ce modèle n'altère jamais un contrat déjà signé.
// ATTENTION : modèle fourni à titre indicatif, à faire relire par un professionnel
// (assureur, CCI, juriste) avant usage.
export const DEFAULT_CONTRACT_TEMPLATE = `CONTRAT DE PRESTATION DE SERVICES DE PET-SITTING

Entre :
Le prestataire : {{business_name}}, {{legal_form}}, SIRET {{siret}}, {{business_address}}, contact : {{contact_email}} (ci-après « le Prestataire »),
Et :
Le client : {{client_name}}, demeurant {{client_address}}, email {{client_email}}, téléphone {{client_phone}} (ci-après « le Client »).

## Article 1 - Objet
Le présent contrat définit les conditions dans lesquelles le Prestataire assure, au domicile du Client ou en promenade, la garde, les visites et les soins courants des animaux du Client désignés en annexe (fiche animaux).

## Article 2 - Prestations
Les prestations (visite, promenade, nourrissage, eau fraîche, litière, soins courants, jeux, compte rendu avec photos) sont réalisées selon les tâches indiquées pour chaque visite dans l'espace client. Le Prestataire n'est tenu qu'à une obligation de moyens. Il n'assure pas de soins médicaux, hormis l'administration d'un traitement prescrit et clairement détaillé par écrit par le Client.

## Article 3 - Réservation et horaires
Les visites sont planifiées d'un commun accord et visibles dans l'espace client. Les horaires sont indicatifs : un décalage raisonnable (jusqu'à 30 minutes) dû aux conditions de circulation ou à l'allongement d'une visite précédente ne constitue pas un manquement. Le Prestataire prévient le Client dès qu'un retard plus important est prévisible.

## Article 4 - Tarifs
Le prix de chaque visite dépend de sa durée et de la distance à parcourir ; il est communiqué au Client avant confirmation et repris sur la facture. Les frais de déplacement sont indiqués séparément. {{tva_mention}} Toute prestation supplémentaire demandée en cours de garde fait l'objet d'un accord préalable sur son prix.

## Article 5 - Facturation et paiement
Le Prestataire émet une facture après réalisation des visites. Elle est payable sous 30 jours par virement, espèces ou tout moyen convenu. En cas de retard de paiement, des intérêts sont dus au taux d'intérêt légal, sans préjudice des frais de recouvrement autorisés par la loi. Le Prestataire peut suspendre les visites à venir tant qu'une facture échue reste impayée après mise en demeure restée sans effet.

## Article 6 - Annulation et modification par le Client
Toute annulation ou modification doit être notifiée au Prestataire par message ou par téléphone. Annulation plus de 48 heures avant la visite : sans frais. Entre 48 heures et 24 heures : 50 % du prix de la visite reste dû. Moins de 24 heures avant, ou absence du Client empêchant la visite : 100 % du prix reste dû, ainsi que les frais de déplacement engagés.

## Article 7 - Annulation par le Prestataire
En cas d'empêchement (maladie, accident, cas de force majeure), le Prestataire prévient le Client au plus vite et s'efforce de proposer une solution de remplacement. Les visites non réalisées de son fait ne sont pas facturées.

## Article 8 - Accès au domicile
Le Client remet au Prestataire les clés, badges ou codes nécessaires et l'informe de toute alarme, de tout système de vidéosurveillance et des consignes d'accès. Le Prestataire utilise ces accès aux seules fins de la prestation, n'en fait aucune copie, les conserve en sécurité et les restitue à la fin du contrat. Le Client signale toute présence de caméras dans le logement. En cas de perte de clés ou de déclenchement d'alarme non imputable à une erreur du Prestataire, le coût de remplacement ou d'intervention reste à la charge du Client.

## Article 9 - Santé, sécurité et urgences
Le Client déclare que ses animaux sont identifiés et vaccinés à jour, l'informe de tout problème de santé et de tout comportement à risque (peur, agressivité, fugue, morsure). Les chiens de première ou deuxième catégorie doivent être déclarés au Prestataire avant tout début de garde. En cas d'urgence, le Prestataire est autorisé à contacter le vétérinaire du Client ou, à défaut, le vétérinaire le plus proche, et à faire transporter l'animal. Les frais vétérinaires sont avancés par le Client, ou remboursés au Prestataire sur justificatif s'il les a avancés. Le Client indique ci-dessous sa personne à prévenir en cas d'urgence, joignable pendant la garde.

## Article 10 - Obligations du Client
Le Client fournit les informations exactes et à jour sur ses animaux, la nourriture, le matériel et les traitements nécessaires. Il prévient le Prestataire de toute présence d'un tiers au domicile (ménage, voisin, famille). Il s'assure que son animal peut être promené sans danger pour les tiers. Il reste responsable des dommages causés par son animal, dans les limites de la loi.

## Article 11 - Assurance et responsabilité
Le Prestataire déclare être couvert par une assurance de responsabilité civile professionnelle : {{insurance_info}}. Sa responsabilité est engagée en cas de faute prouvée, dans les limites de la loi. Elle ne peut être recherchée pour les conséquences d'une maladie ou d'un état préexistant non signalé, d'une fugue liée à une porte, une clôture ou un équipement défectueux appartenant au Client, ni en cas de force majeure. Rien dans ce contrat ne limite la responsabilité du Prestataire en cas de dommage corporel, de faute lourde ou de dol.

## Article 12 - Photos et données personnelles
Le Prestataire prend des photos des animaux pour le compte rendu de visite ; elles sont accessibles dans l'espace client. Il ne les publie sur les réseaux sociaux qu'avec l'accord exprès du Client (case dédiée ci-dessous). Les données personnelles du Client sont traitées uniquement pour exécuter le contrat et la facturation, conservées pendant la durée légale et jamais vendues. Le Client peut exercer ses droits d'accès, de rectification et de suppression en écrivant à {{contact_email}}. Voir la page Confidentialité du site.

## Article 13 - Droit de rétractation
Le contrat étant conclu à distance avec un consommateur, le Client dispose de 14 jours à compter de la signature pour se rétracter, sans motif, par message au Prestataire. Si le Client demande expressément que la prestation commence avant la fin de ce délai (case dédiée ci-dessous), il devra payer un montant proportionnel aux visites déjà réalisées lorsqu'il se rétracte.

## Article 14 - Durée et résiliation
Le contrat est conclu pour une durée indéterminée. Chaque partie peut y mettre fin par message avec un préavis de 7 jours ; les visites déjà planifiées restent dues, sauf accord contraire. Le Prestataire peut le résilier sans préavis en cas de manquement grave (impayé après mise en demeure, animal dangereux non déclaré, accès dangereux ou impossible, comportement irrespectueux).

## Article 15 - Force majeure
Aucune des parties n'est responsable d'un manquement causé par un événement de force majeure (intempéries exceptionnelles, catastrophe, grève des transports, maladie grave, décision administrative).

## Article 16 - Réclamation et médiation
Toute réclamation est d'abord adressée au Prestataire à {{contact_email}}, qui répond sous un mois. À défaut de solution amiable, le Client consommateur peut recourir gratuitement à un médiateur de la consommation : {{mediator_info}}.

## Article 17 - Loi applicable et juridiction
Le contrat est soumis au droit français. À défaut d'accord amiable, le litige relève des tribunaux compétents selon les règles légales, notamment celles protégeant le consommateur.

## Article 18 - Signature électronique et preuve
Les parties conviennent que la signature électronique du présent contrat, réalisée par le Client connecté à son espace personnel (identifiant et mot de passe) ou, à défaut, à l'aide d'un code à usage unique envoyé à son adresse email, par saisie de son nom et acceptation des conditions, vaut signature manuscrite. Les données de la signature (date et heure, adresse IP, empreinte numérique du texte signé) sont conservées comme preuve. Un exemplaire PDF signé est envoyé aux deux parties. Le Client reconnaît avoir pris connaissance de l'intégralité du contrat.

## Article 19 - Modification du contrat
Toute modification du contrat fait l'objet d'une nouvelle version soumise à la signature du Client. Les tarifs peuvent être révisés avec un préavis d'un mois, sans nouvelle signature.

## Annexe - Animaux et contacts
{{animals}}
Personne à prévenir en cas d'urgence et vétérinaire habituel : à compléter par le Client au moment de la signature.
`;

// Cases à cocher présentées au Client à la signature (id, texte, obligatoire).
export const CONTRACT_CHECKBOXES = [
  { id: "accept", label: "J'ai lu et j'accepte l'intégralité du contrat.", required: true },
  {
    id: "withdrawal_waiver",
    label:
      "Je demande que les visites commencent avant la fin du délai de rétractation de 14 jours et je reconnais devoir un montant proportionnel aux visites réalisées si je me rétracte.",
    required: false,
  },
  {
    id: "photos_social",
    label: "J'autorise la publication de photos de mes animaux sur les réseaux sociaux du Prestataire.",
    required: false,
  },
];
