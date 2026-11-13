// Documents de pilotage consultables dans l'admin (onglet « Documents ») :
// business plan et plan marketing, chacun avec une checklist de suivi.
// Blocs de contenu : { p }, { h3 }, { ul: [...] }, { ol: [...] }, { note }, { table: { head, rows } }.
// Les identifiants de la checklist ne doivent jamais changer une fois publiés
// (ils servent de clé à l'avancement enregistré en base).

const BUSINESS_PLAN = {
  slug: "business-plan",
  title: "Business plan",
  updated: "2026-11-13",
  summary: "Version prudente sur 24 mois : objectif chiffré, trois scénarios, risques et plan d'action 90 jours.",
  sections: [
    {
      title: "L'essentiel",
      blocks: [
        { note: "En vivre à temps plein en douze mois, en partant de moins de cinq clients et avec 50 € par mois, n'est pas l'issue la plus probable. Il faut prévoir de quoi tenir environ deux ans avec un revenu partiel : épargne, autre revenu du foyer, ou emploi à temps partiel compatible avec les créneaux de promenade." },
        { p: "Le site et l'outil de gestion sont déjà au point. Ce qui manque, ce sont les clients : une heure sur le terrain rapporte plus qu'une heure sur le site. Trois leviers, dans cet ordre :" },
        { ol: [
          "Des promenades régulières en semaine. Un client régulier rapporte environ 175 € par mois, contre environ 250 € par an pour un client de vacances. Ce sont aussi les plus longs à trouver : un nouveau tous les trois à quatre mois au début.",
          "Être trouvée localement : fiche Google avec des avis récents, professionnels qui recommandent, groupes d'habitants, plateformes pour amorcer.",
          "Un panier moyen plus élevé : suppléments week-end et jours fériés, deuxième animal, déplacement au-delà de 8 km, forfait de 10 balades.",
        ] },
      ],
    },
    {
      title: "Offre et tarifs",
      blocks: [
        { table: {
          head: ["Prestation", "Prix actuel", "Rôle"],
          rows: [
            ["Visite à domicile, 30 min", "15 €", "Produit d'appel des vacances, très saisonnier."],
            ["Balade, 45 min", "18 €", "Base de revenu stable : 2 à 3 balades par semaine."],
            ["Visite ou balade, 1 h", "22 €", "Chiens actifs, plusieurs animaux, soins plus longs."],
            ["Garde chez toi, la journée", "selon réglage", "Complément rentable, sous réserve du point réglementaire."],
          ],
        } },
        { h3: "À ajouter à la grille" },
        { ul: [
          "Supplément week-end et jours fériés : + 3 à 5 € par passage.",
          "Deuxième animal : + 3 € par passage, + 2 € pour les suivants.",
          "Déplacement inclus jusqu'à 8 km de Viarmes, puis un forfait par zone (par exemple + 2 € de 8 à 12 km, + 4 € de 12 à 15 km).",
          "Forfait 10 balades payé d'avance, avec une balade offerte.",
          "Offre « surveillance attentive » à 22 € pour animaux âgés ou en convalescence : médicaments prescrits par le vétérinaire et compte rendu détaillé, sans soin ni diagnostic.",
        ] },
        { p: "Les prix du marché vont de 15 à 25 € pour une visite ou une heure de promenade. Tu es en bas de la fourchette alors que ton profil justifie le milieu : une hausse de 1 à 2 € sur les nouveaux clients au printemps est raisonnable." },
      ],
    },
    {
      title: "Objectif chiffré",
      blocks: [
        { p: "Le niveau à atteindre pour en vivre, et non ce qui est attendu la première année :" },
        { table: {
          head: ["Un mois à 2 800 € de chiffre d'affaires", ""],
          rows: [
            ["Cotisations sociales (21,2 %)", "− 594 €"],
            ["Voiture : environ 1 000 km à 0,30 €", "− 300 €"],
            ["Assurance, téléphone, petit matériel", "− 65 €"],
            ["Prospection", "− 50 €"],
            ["Reste avant impôt sur le revenu", "≈ 1 790 €"],
          ],
        } },
        { p: "Cela représente environ 165 passages par mois à 17 € en moyenne, proche du maximum pour une personne seule. Il faut pour y arriver une dizaine de clients réguliers et une cinquantaine de clients de vacances actifs : une clientèle de deux à trois ans d'activité." },
        { ul: [
          "Le prix moyen compte autant que le nombre de clients : à 20 € par passage, l'objectif tombe à 140 passages.",
          "Regrouper les tournées par commune et par créneau. Refuser ou surtaxer les demandes isolées à 15 km.",
        ] },
      ],
    },
    {
      title: "Prévisionnel sur 24 mois",
      blocks: [
        { p: "Point de départ : 1 client régulier et 3 clients de vacances en décembre 2026. Chiffre d'affaires mensuel hors effet de saison." },
        { table: {
          head: ["Scénario", "Mois 6", "Mois 12", "Mois 18", "Mois 24"],
          rows: [
            ["Bas (1 nouveau client par mois)", "440 €", "710 €", "970 €", "1 190 €"],
            ["Réaliste (2 à 3 par mois)", "680 €", "1 260 €", "1 800 €", "2 250 €"],
            ["Haut (4 par mois)", "970 €", "1 900 €", "2 780 €", "3 520 €"],
          ],
        } },
        { table: {
          head: ["Reste mensuel moyen, avant impôt", "Année 1", "Année 2"],
          rows: [
            ["Bas", "≈ 220 €", "≈ 560 €"],
            ["Réaliste", "≈ 410 €", "≈ 1 130 €"],
            ["Haut", "≈ 640 €", "≈ 1 820 €"],
          ],
        } },
        { ul: [
          "Même le scénario haut ne permet pas d'en vivre la première année.",
          "Le revenu est irrégulier : dans le scénario réaliste, la première année va d'environ 310 € les mois creux à environ 1 470 € en août.",
          "Hypothèses : 35 % des clients de vacances et 25 % des clients réguliers perdus chaque année, prix inchangés, aucun mois perdu pour maladie ou panne.",
        ] },
        { h3: "Ce qui change vraiment la trajectoire" },
        { ul: [
          "Les prix : 3 € de plus par passage, c'est environ 18 % de chiffre d'affaires en plus sans un client supplémentaire.",
          "La garde chez toi : pas de trajet et un prix à la journée plus élevé.",
          "Le nombre de clients réguliers : un régulier vaut huit clients de vacances.",
          "Un emploi à temps partiel le temps que la clientèle se constitue.",
        ] },
        { note: "Points de décision. Au mois 6 (mai 2027) : moins de 2 clients réguliers et moins de 500 € par mois, c'est la trajectoire basse ; chercher un revenu d'appoint et revoir prix et zone. Au mois 12 (novembre 2027) : moins de 900 € par mois, considérer l'activité comme un complément durable." },
      ],
    },
    {
      title: "Démarcher les professionnels",
      blocks: [
        { p: "Oui, mais comme prescripteurs : aucun n'achètera de prestations, au mieux ils donnent ton nom à leurs clients." },
        { table: {
          head: ["Qui", "Avis"],
          rows: [
            ["Vétérinaires, toiletteurs, éducateurs canins, animaleries", "Priorité 1"],
            ["Agences d'aide à domicile", "À tester sur 5 agences"],
            ["Résidences seniors, infirmières libérales", "À tester"],
            ["CCAS et mairies", "Une visite, et le bulletin municipal"],
          ],
        } },
        { p: "Pour le public âgé ou dépendant, la promenade d'animaux ouvre droit à 50 % de crédit d'impôt, mais seulement chez un prestataire déclaré « services à la personne ». Tu ne l'es pas, donc tu es deux fois plus chère pour ce public. Ne rien restructurer maintenant : tester la demande, puis décider en janvier." },
      ],
    },
    {
      title: "Risques et points à vérifier",
      blocks: [
        { ul: [
          "Réglementation : vérifier auprès de la DDPP du Val-d'Oise que ton titre d'assistante vétérinaire est reconnu, et ce qu'implique la garde à ton domicile (déclaration, registre, conditions d'accueil).",
          "Assurance : la RC professionnelle doit couvrir les visites, les promenades, la garde chez toi et le transport éventuel.",
          "Saisonnalité : les visites se concentrent sur les vacances, les promenades régulières lissent le revenu.",
          "Dépendance à une seule personne : repérer un confrère de confiance pour les remplacements, garder un mois de réserve.",
          "Frais de voiture : ils ne se déduisent pas en micro-entreprise, il faut les facturer via les forfaits de zone.",
        ] },
        { h3: "Cinq indicateurs à suivre chaque mois" },
        { ul: [
          "Demandes reçues, et par quel canal.",
          "Part des demandes devenues clientes.",
          "Nombre de clients réguliers de promenade.",
          "Prix moyen par passage.",
          "Nombre d'avis Google.",
        ] },
        { p: "Les rythmes d'acquisition, les taux de perte et les frais sont des estimations, pas des données mesurées sur le secteur : les trois premiers mois réels doivent les remplacer." },
      ],
    },
  ],
  checklist: [
    {
      title: "Semaines 1 et 2 : remettre les bases d'aplomb",
      items: [
        { id: "bp-resend", label: "Vérifier dans Resend le statut des e-mails de contrat non reçus" },
        { id: "bp-dmarc", label: "Ajouter l'enregistrement DMARC dans Cloudflare" },
        { id: "bp-whatsapp", label: "Renseigner le numéro WhatsApp dans Réglages" },
        { id: "bp-avis-existants", label: "Demander un avis Google à tous les clients actuels et passés" },
        { id: "bp-ddpp", label: "Appeler la DDPP : diplôme reconnu et garde à domicile" },
        { id: "bp-rcpro", label: "Vérifier ce que couvre l'assurance RC pro" },
        { id: "bp-grille", label: "Mettre en place les suppléments et le forfait 10 balades" },
        { id: "bp-fiche-google", label: "Mettre à jour la fiche Google (catégories, communes, photos)" },
      ],
    },
    {
      title: "Semaines 3 à 6 : se faire connaître",
      items: [
        { id: "bp-pros-10", label: "Voir 10 vétérinaires, toiletteurs, éducateurs et animaleries" },
        { id: "bp-agences", label: "Tester 5 agences d'aide à domicile et 2 résidences seniors" },
        { id: "bp-mairie", label: "Se présenter au CCAS et demander le bulletin municipal" },
        { id: "bp-plateforme", label: "Créer un profil sur une plateforme de pet sitting" },
        { id: "bp-noel", label: "Relancer tous les clients pour les vacances de Noël" },
      ],
    },
    {
      title: "Semaines 7 à 13 : mesurer et ajuster",
      items: [
        { id: "bp-decision-sap", label: "Décider si le public âgé justifie une déclaration services à la personne" },
        { id: "bp-site-communes", label: "Site : pages par commune et statistiques de visite" },
        { id: "bp-avis-auto", label: "Site : demande d'avis automatique après facture payée" },
        { id: "bp-fevrier", label: "Relancer tous les clients pour les vacances d'hiver" },
        { id: "bp-pros-2", label: "Deuxième passage chez les professionnels" },
        { id: "bp-bilan-90", label: "Bilan des 90 jours par canal : garder les deux meilleurs" },
        { id: "bp-prix", label: "Décider d'une hausse de prix pour les nouveaux clients" },
      ],
    },
    {
      title: "Jalons",
      items: [
        { id: "bp-5-avis", label: "5 avis Google" },
        { id: "bp-15-avis", label: "15 avis Google" },
        { id: "bp-2-reguliers", label: "2 clients réguliers de promenade" },
        { id: "bp-4-reguliers", label: "4 clients réguliers de promenade" },
        { id: "bp-500", label: "Premier mois à 500 € de chiffre d'affaires" },
        { id: "bp-1000", label: "Premier mois à 1 000 € de chiffre d'affaires" },
        { id: "bp-point-m6", label: "Point de décision du 6e mois (mai 2027)" },
        { id: "bp-point-m12", label: "Point de décision du 12e mois (novembre 2027)" },
      ],
    },
  ],
};

const PLAN_MARKETING = {
  slug: "plan-marketing",
  title: "Plan de démarchage et de marketing",
  updated: "2026-11-13",
  summary: "Devenir le premier nom auquel on pense : routine de la semaine, groupes Facebook, professionnels, calendrier de l'année.",
  sections: [
    {
      title: "Le principe",
      blocks: [
        { p: "On devient « le pet sitter du coin » parce que les mêmes personnes ont vu le même nom, le même visage et la même promesse dix fois, à des endroits différents : chez le vétérinaire, dans le groupe Facebook de la commune, sur une voiture, sur Google, dans la bouche d'un voisin." },
        { ul: [
          "La régularité compte plus que l'intensité : un post par semaine pendant un an vaut mieux que vingt posts en novembre.",
          "Être utile avant de vendre : trois messages utiles pour un message commercial.",
          "Une zone petite et dense : mieux vaut être connue de tout Viarmes, Luzarches et Asnières-sur-Oise que vaguement présente sur trente communes.",
        ] },
        { note: "Il faut six à douze mois de présence régulière avant que ton nom vienne spontanément. Les trois premiers mois donnent peu de demandes : c'est normal, ce n'est pas le signe que ça ne marche pas." },
      ],
    },
    {
      title: "Un seul message, partout",
      blocks: [
        { note: "« Aurore, ancienne assistante vétérinaire, garde et promène vos animaux à Viarmes et alentours. »" },
        { ol: [
          "Diplôme d'assistante vétérinaire et trois ans en clinique.",
          "Contrat écrit et assurance professionnelle.",
          "Compte rendu avec photos après chaque passage.",
        ] },
        { p: "La même photo de toi avec un animal sur Google, Instagram, Facebook, le site, les flyers et les cartes : c'est le visage qu'on retient, pas le logo." },
        { table: {
          head: ["Mois", "Achat", "Budget"],
          rows: [
            ["Novembre", "250 cartes de visite, 500 flyers", "≈ 50 €"],
            ["Décembre", "Deux plaques magnétiques pour la voiture", "≈ 40 €"],
            ["Janvier", "Un gilet floqué au nom de l'activité, 500 flyers", "≈ 55 €"],
            ["Février", "20 affichettes A5 avec QR code, 500 flyers", "≈ 40 €"],
          ],
        } },
      ],
    },
    {
      title: "La routine de la semaine",
      blocks: [
        { p: "Quatre à cinq heures au total. Chaque créneau est court exprès : c'est ce qui permet de tenir un an." },
        { table: {
          head: ["Jour", "Action", "Durée"],
          rows: [
            ["Lundi", "Fiche Google : une photo, une actualité, réponse aux avis.", "20 min"],
            ["Mardi", "Instagram : le portrait de la semaine. À 19 h : un post dans un groupe Facebook.", "30 min"],
            ["Mercredi", "Une semaine sur deux : trois visites à des professionnels. L'autre : affichage dans cinq commerces.", "1 h 30"],
            ["Jeudi", "Instagram : le conseil de saison. À 19 h : un post dans un deuxième groupe.", "30 min"],
            ["Vendredi", "Relances, et message d'avis Google à chaque client de la semaine.", "30 min"],
            ["Dimanche", "À 18 h : Instagram, coulisses ou avis. Préparer la semaine suivante.", "45 min"],
            ["Tous les jours", "Répondre à toute demande dans l'heure. Une story en balade.", "10 min"],
          ],
        } },
        { p: "Le premier lundi du mois : bilan chiffré et flyers dans une commune." },
      ],
    },
    {
      title: "Groupes Facebook et réseaux locaux",
      blocks: [
        { h3: "La liste, une fois pour toutes" },
        { ol: [
          "Chercher le nom de chaque commune de la zone et rejoindre le groupe d'habitants le plus actif, puis les groupes d'animaux perdus du Val-d'Oise et de l'Oise.",
          "Viser huit à douze groupes. Noter pour chacun le nombre de membres et les règles sur la publicité.",
          "Si la publicité est limitée, demander à un administrateur l'autorisation de se présenter une fois.",
          "Activer les notifications et une alerte sur les mots « garde », « pet sitter », « chien », « chat », « vacances ».",
        ] },
        { h3: "Le rythme" },
        { table: {
          head: ["Type de message", "Fréquence", "Quand"],
          rows: [
            ["Présentation", "Une fois par groupe, rappel tous les trois mois au plus", "Mardi ou jeudi, 19 h"],
            ["Conseil de saison", "Deux groupes par semaine, en rotation", "Mardi et jeudi, 19 h"],
            ["Disponibilités avant les vacances", "Un par groupe, 4 à 5 semaines avant", "Dimanche, 18 h"],
            ["Réponse à une demande de garde", "À chaque fois", "Dans l'heure"],
          ],
        } },
        { ul: [
          "Jamais le même texte copié dans dix groupes le même jour.",
          "Publier avec ton profil personnel et ta photo.",
          "Répondre en une phrase en commentaire, puis continuer en message privé. Ne jamais dénigrer un autre gardien.",
          "Demander aux clients satisfaits membres du groupe de commenter.",
          "Aussi : une annonce Leboncoin par commune, Nextdoor, l'application de la commune si elle existe.",
        ] },
      ],
    },
    {
      title: "Instagram et fiche Google",
      blocks: [
        { ul: [
          "Instagram, trois rubriques fixes : le portrait de la semaine (mardi), le conseil de l'ancienne assistante vétérinaire (jeudi), les coulisses ou un avis (dimanche).",
          "Indiquer la commune sur chaque publication. Suivre et commenter les comptes locaux.",
          "Instagram rassure ceux qui hésitent mais apporte peu de demandes : pas plus d'une heure par semaine.",
          "Fiche Google : une photo et une actualité chaque lundi, réponse à chaque avis sous 48 heures.",
          "Objectifs : 15 avis fin février 2027, 30 avis fin 2027. Demander l'avis le soir même de la fin d'une garde.",
        ] },
      ],
    },
    {
      title: "Démarcher les professionnels, pas à pas",
      blocks: [
        { ol: [
          "Lister 25 adresses dans un tableau : nom, commune, personne rencontrée, date du passage, date de relance, clients envoyés.",
          "Passer en personne, en milieu de matinée ou de début d'après-midi. Trois visites par sortie, regroupées par commune.",
          "Dire le texte de 30 secondes, laisser 20 cartes et une affichette, noter le prénom de la personne.",
          "Le soir même : message de remerciement, suivre leur compte.",
          "Rendre la pareille : les citer en story, recommander leurs services.",
          "Repasser tous les deux mois, remercier pour chaque client envoyé.",
          "En décembre : carte de vœux manuscrite aux cinq meilleurs.",
        ] },
        { p: "Sur dix professionnels visités, trois ou quatre recommanderont vraiment. Ceux qui n'ont envoyé personne après deux passages sortent de la tournée." },
        { p: "Presse locale : proposer un portrait à la correspondante du journal du secteur. Un article vaut des milliers de flyers et se partage ensuite dans tous les groupes." },
      ],
    },
    {
      title: "Le terrain et les clients existants",
      blocks: [
        { ul: [
          "Flyers : 500 par mois, une commune à la fois, trois à quatre semaines avant des vacances. Repasser dans la même commune trois mois plus tard.",
          "Affichage : boulangeries, pharmacies, jardineries, supermarchés, salles d'attente, gares. À remplacer tous les deux mois.",
          "Voiture et gilet à chaque sortie, cartes en poche sur les lieux de balade.",
          "Événements : marchés de Noël, vide-greniers, fêtes communales, forums des associations de septembre.",
        ] },
        { table: {
          head: ["Moment", "Action auprès du client"],
          rows: [
            ["Première garde terminée", "Un mot manuscrit et deux cartes : une pour lui, une à donner."],
            ["Le soir de la fin de garde", "Message de remerciement avec le lien d'avis Google."],
            ["À la facture", "Rappel du parrainage."],
            ["4 à 5 semaines avant les vacances", "« Je prends les réservations pour… »"],
            ["Six mois sans nouvelles", "Prendre des nouvelles de l'animal, sans rien vendre."],
          ],
        } },
      ],
    },
    {
      title: "Le calendrier de l'année",
      blocks: [
        { table: {
          head: ["Période", "Dates", "Lancer la relance", "Dernier rappel"],
          rows: [
            ["Noël", "19 déc. 2026 au 4 janv. 2027", "Au plus tard le 27 novembre", "13 décembre"],
            ["Hiver", "6 au 22 février 2027", "10 janvier", "31 janvier"],
            ["Printemps", "3 au 19 avril 2027", "7 mars", "28 mars"],
            ["Ascension", "6 au 9 mai 2027", "11 avril", "2 mai"],
            ["Été", "à partir du 3 juillet 2027", "23 mai, puis 13 juin", "27 juin et 18 juillet"],
            ["Toussaint 2027", "dates à confirmer", "fin septembre", "mi-octobre"],
          ],
        } },
        { h3: "Conseils de saison à publier le jeudi" },
        { ul: [
          "Novembre, décembre : chocolat et restes de fêtes, sapin, pétards du Nouvel An, préparer une absence.",
          "Janvier, février : froid et coussinets, sel de déneigement, antigel, chat d'intérieur qui s'ennuie.",
          "Mars, avril : chenilles processionnaires, tiques, chocolat de Pâques, mue.",
          "Mai, juin : épillets, premières chaleurs, voiture au soleil, préparer l'été.",
          "Juillet, août : canicule, feux d'artifice, hydratation, piqûres.",
          "Septembre, octobre : chien seul à la reprise, champignons et marrons, Halloween.",
        ] },
      ],
    },
    {
      title: "Mesurer, et savoir arrêter",
      blocks: [
        { p: "Poser la même question à chaque nouveau contact : « Comment avez-vous entendu parler de moi ? » Le premier lundi du mois, compter par canal les demandes, les clients gagnés, le temps passé et l'argent dépensé." },
        { table: {
          head: ["Canal", "Ce qu'on peut en attendre", "Arrêter si"],
          rows: [
            ["Fiche Google", "2 à 5 demandes par mois après 15 avis", "Ne jamais arrêter"],
            ["Groupes Facebook", "1 à 3 demandes par mois", "Un groupe sans réaction en trois mois"],
            ["Professionnels", "1 client par mois après six mois", "Aucun retour après deux passages"],
            ["Flyers", "0 à 2 demandes pour 500", "Aucune demande après trois communes"],
            ["Clients existants", "Le meilleur canal à partir de vingt clients", "Ne jamais arrêter"],
          ],
        } },
        { p: "Ces ordres de grandeur sont des estimations de départ, à corriger avec tes résultats au bout de deux mois." },
      ],
    },
  ],
  checklist: [
    {
      title: "Mise en place (à faire une fois)",
      items: [
        { id: "mk-photo", label: "Choisir la photo unique et la mettre partout (Google, Instagram, Facebook, site)" },
        { id: "mk-cartes", label: "Commander 250 cartes de visite et 500 flyers" },
        { id: "mk-lien-avis", label: "Préparer le lien direct d'avis Google et son QR code" },
        { id: "mk-groupes-liste", label: "Rejoindre 8 à 12 groupes Facebook et noter leurs règles" },
        { id: "mk-alertes", label: "Activer les notifications et les alertes de mots-clés" },
        { id: "mk-presentation", label: "Publier la présentation dans chaque groupe" },
        { id: "mk-leboncoin", label: "Publier une annonce Leboncoin par commune principale" },
        { id: "mk-nextdoor", label: "S'inscrire sur Nextdoor et se présenter" },
        { id: "mk-liste-pros", label: "Lister 25 professionnels dans un tableau de suivi" },
        { id: "mk-magnets", label: "Poser les plaques magnétiques sur la voiture" },
        { id: "mk-gilet", label: "Faire floquer un gilet au nom de l'activité" },
        { id: "mk-affichettes", label: "Imprimer 20 affichettes A5 avec QR code" },
      ],
    },
    {
      title: "Premiers pas sur le terrain",
      items: [
        { id: "mk-pros-1", label: "Première tournée : 5 professionnels visités" },
        { id: "mk-pros-2", label: "Deuxième tournée : 10 professionnels visités au total" },
        { id: "mk-mairie", label: "Demander une parution dans le bulletin municipal de Viarmes" },
        { id: "mk-presse", label: "Proposer un portrait à la presse locale" },
        { id: "mk-flyers-1", label: "Flyers distribués dans une première commune" },
        { id: "mk-flyers-3", label: "Flyers distribués dans trois communes" },
        { id: "mk-affichage-10", label: "Affichettes posées dans 10 commerces" },
      ],
    },
    {
      title: "Routine installée",
      items: [
        { id: "mk-routine-4", label: "Routine de la semaine tenue quatre semaines de suite" },
        { id: "mk-insta-rubriques", label: "Les trois rubriques Instagram publiées chaque semaine pendant un mois" },
        { id: "mk-google-lundi", label: "Fiche Google mise à jour chaque lundi pendant un mois" },
        { id: "mk-sequence-client", label: "Séquence client appliquée à chaque garde (mot, avis, parrainage)" },
        { id: "mk-bilan-1", label: "Premier bilan mensuel par canal" },
      ],
    },
    {
      title: "Temps forts de l'année",
      items: [
        { id: "mk-noel", label: "Relance de Noël envoyée (avant le 27 novembre)" },
        { id: "mk-hiver", label: "Relance des vacances d'hiver (10 janvier)" },
        { id: "mk-voeux", label: "Vœux aux prescripteurs et aux clients (janvier)" },
        { id: "mk-printemps", label: "Relance des vacances de printemps (7 mars)" },
        { id: "mk-ascension", label: "Relance du pont de l'Ascension (11 avril)" },
        { id: "mk-ete", label: "Relance de l'été (23 mai et 13 juin)" },
        { id: "mk-forums", label: "Inscription aux forums des associations (juin)" },
        { id: "mk-rentree", label: "Campagne promenades régulières (septembre)" },
        { id: "mk-toussaint", label: "Relance de la Toussaint (fin septembre)" },
        { id: "mk-30-avis", label: "30 avis Google" },
      ],
    },
  ],
};

export const DOCUMENTS = [BUSINESS_PLAN, PLAN_MARKETING];

export function getDocument(slug) {
  return DOCUMENTS.find((d) => d.slug === slug) || null;
}

// Identifiants de toutes les cases d'un document.
export function checklistIds(doc) {
  return doc.checklist.flatMap((g) => g.items.map((i) => i.id));
}

// Avancement : { done, total, percent } à partir de la liste des cases cochées.
export function progressOf(doc, doneIds = []) {
  const ids = checklistIds(doc);
  const set = new Set(doneIds);
  const done = ids.filter((id) => set.has(id)).length;
  return { done, total: ids.length, percent: ids.length ? Math.round((done / ids.length) * 100) : 0 };
}
