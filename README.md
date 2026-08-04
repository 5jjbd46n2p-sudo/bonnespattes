# 🐾 Aux Bonnes Pattes — application de gestion pet sitting

Application complète pour gérer ton activité de pet sitting :

- **Planning** du jour / de la semaine, avec **visites récurrentes** (planifie en une fois plusieurs visites, ex. tous les jours pendant 7 jours)
- **Fiches clients** avec animaux, notes, tarif horaire, et bouton **Waze** pour lancer l'itinéraire dès qu'une adresse est renseignée
- **Suivi de visite** : statut (planifiée, en cours, terminée, annulée), liste de tâches à cocher (nourri, promené, litière…) + **photos**
- **Portail client** : chaque client se connecte avec un identifiant que tu crées (et qui peut lui être envoyé automatiquement par email), et voit l'historique de suivi + les photos de son animal
- **Comptabilité** : factures (PDF), TVA, paiements, export CSV pour ton comptable — les visites facturées reprennent automatiquement la durée en heures et le tarif horaire du client

Stack : Next.js (App Router) + Postgres (Neon) + stockage photos (Vercel Blob), déployé sur Vercel.

---

## 1. Créer le dépôt GitHub

1. Va sur [github.com/new](https://github.com/new), crée un dépôt (ex. `patte-de-velours`), **vide** (sans README).
2. En local, dans le dossier du projet :

```bash
cd petsitter-app
git init
git add .
git commit -m "Première version de l'application"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/patte-de-velours.git
git push -u origin main
```

---

## 2. Créer la base de données (Neon)

1. Va sur [neon.tech](https://neon.tech), crée un compte puis un projet (nom libre, ex. `patte-de-velours`).
2. Dans le dashboard du projet, copie la **chaîne de connexion** (Connection string), qui ressemble à :
   ```
   postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   Garde-la précieusement, tu en as besoin à l'étape 4.

*(Alternative : si tu préfères, tu peux aussi créer un Postgres directement depuis Vercel — "Storage → Create Database → Postgres", qui est aussi propulsé par Neon. Dans ce cas tu peux sauter cette étape et récupérer `DATABASE_URL` depuis Vercel à l'étape 3.)*

---

## 3. Déployer sur Vercel

1. Va sur [vercel.com/new](https://vercel.com/new) et importe ton dépôt GitHub `patte-de-velours`.
2. Avant de cliquer sur "Deploy", ouvre **Environment Variables** et ajoute :
   - `DATABASE_URL` → la chaîne de connexion Neon copiée à l'étape 2
   - `JWT_SECRET` → une longue chaîne aléatoire (ex. générée avec `openssl rand -hex 32`)
   - *(optionnel, pour l'envoi automatique des identifiants par email)* `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL` — voir section [Envoi automatique des identifiants par email](#envoi-automatique-des-identifiants-par-email) plus bas
3. Clique sur **Deploy**.
4. Une fois déployé, va dans l'onglet **Storage** du projet Vercel → **Create Database** → choisis **Blob**. Connecte-le au projet : Vercel ajoute automatiquement la variable `BLOB_READ_WRITE_TOKEN` (c'est ce qui permet l'upload des photos). Redéploie si demandé.

---

## 4. Initialiser la base de données

Depuis ton ordinateur, à la racine du projet (après `npm install`) :

```bash
npm install
DATABASE_URL="ta-chaine-de-connexion-neon" npm run migrate
```

Ça crée toutes les tables nécessaires (clients, animaux, visites, factures…).

---

## 5. Créer ton compte administrateur

Toujours en local :

```bash
DATABASE_URL="ta-chaine-de-connexion-neon" npm run create-admin -- toi@exemple.fr "un-bon-mot-de-passe"
```

C'est avec cet email/mot de passe que tu te connecteras sur l'appli en tant qu'administrateur (toi).

➡️ Ouvre ton site Vercel (ex. `https://patte-de-velours.vercel.app`), connecte-toi avec ces identifiants : tu arrives sur le tableau de bord admin.

---

## 6. Utilisation au quotidien

- **Créer un client** : Clients → + Nouveau client. Tu peux directement lui créer un identifiant/mot de passe (généré automatiquement) et cocher "Envoyer automatiquement l'email" pour qu'il reçoive ses accès sans que tu aies à les transmettre toi-même (voir section email plus bas).
- **Planifier une visite** : depuis la fiche client → "Planifier une visite" (date, heure, tâches). Si le client a un tarif horaire renseigné, le prix se calcule automatiquement à partir de la durée (modifiable à la main si besoin). Coche "Répéter cette visite" pour planifier en une fois plusieurs occurrences (ex. tous les jours pendant 7 visites) au lieu de les créer une par une.
- **Pendant la visite** : ouvre la visite depuis le planning, passe le statut en "En cours" quand tu commences, coche les tâches, ajoute des photos depuis ton téléphone (le bouton ouvre directement l'appareil photo), puis marque-la "Terminée" à la fin.
- **Itinéraire** : sur la fiche client, si une adresse est renseignée, clique sur "🧭 Ouvrir dans Waze" — ça ouvre l'appli Waze sur ton téléphone avec le trajet.
- **Facturer** : Comptabilité → Nouvelle facture (les visites terminées non facturées sont proposées automatiquement, avec la quantité en heures et le tarif horaire déjà remplis à partir de la durée de chaque visite), ou depuis une fiche client → "Facturer".
- **Export comptable** : Comptabilité → "Export comptable (CSV)", à donner à ton comptable ou pour ta déclaration.
- **Réglages** : renseigne ton nom d'activité, SIRET, IBAN, taux de TVA — ces infos apparaissent sur tes factures PDF.

---

## Envoi automatique des identifiants par email

Pour que le client reçoive automatiquement son email + mot de passe (au lieu que tu les lui transmettes toi-même) :

1. Crée un compte gratuit sur [resend.com](https://resend.com) et récupère une clé API.
2. Dans Vercel (ou ton `.env.local`), ajoute :
   - `RESEND_API_KEY` → ta clé API Resend
   - `EMAIL_FROM` → l'adresse d'expédition, ex. `Aux Bonnes Pattes <contact@tondomaine.fr>` (tant que tu n'as pas vérifié ton propre domaine sur Resend, tu peux utiliser `onboarding@resend.dev`)
   - `NEXT_PUBLIC_APP_URL` → l'URL publique de ton site (ex. `https://aux-bonnes-pattes.vercel.app`), pour inclure un lien de connexion direct dans l'email
3. Redéploie. La case "Envoyer automatiquement l'email" apparaît alors à la création d'un client et lors de la réinitialisation d'un mot de passe.

Si ces variables ne sont pas configurées, l'application continue de fonctionner normalement : le client est créé et le mot de passe s'affiche à l'écran pour que tu le transmettes toi-même.

---

## Développement local (optionnel)

```bash
npm install
cp .env.example .env.local   # puis remplis DATABASE_URL et JWT_SECRET
npm run migrate
npm run create-admin -- toi@exemple.fr motdepasse
npm run dev
```

L'upload de photos nécessite `BLOB_READ_WRITE_TOKEN` (récupérable dans Vercel → Storage → ton Blob store → onglet `.env.local`), sinon cette fonctionnalité spécifique ne marchera qu'une fois déployé sur Vercel.

---

## Mettre à jour l'application après une modification

```bash
git add .
git commit -m "Description du changement"
git push
```

Vercel redéploie automatiquement à chaque `push` sur la branche `main`.

⚠️ Si le changement touche à la base de données (comme l'ajout du statut "En cours"
et des visites récurrentes), relance aussi la migration une fois après le déploiement :

```bash
DATABASE_URL="ta-chaine-de-connexion-neon" npm run migrate
```

C'est sans risque à rejouer plusieurs fois : elle ne fait qu'ajouter ce qui manque,
sans toucher à tes données existantes.
