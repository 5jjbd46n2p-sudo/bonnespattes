# Lot 0 bis : sécurité de second rang

À lancer après le lot 0. Chaque point devient une tâche courte avec sa branche.

1. **Lien d'activation** à la place du mot de passe provisoire envoyé par e-mail : jeton à usage unique, durée limitée, choix du mot de passe par le client.
2. **CSP sans `unsafe-inline`** : nonces dans le middleware (`proxy.js`), retirer les styles et scripts inline restants. Vérifier la vitrine, le portail et les PDF.
3. **Politique de confidentialité** : mentionner OSRM (calcul d'itinéraire) et api-adresse.data.gouv.fr (adresses) comme destinataires de données.
4. **Export RGPD complet** : ajouter devis, photos et contrat à l'export ; version PDF lisible en plus du JSON.
5. **Cookies `__Host-`** pour la session et le CSRF (secure, path `/`, sans domaine).
6. **Lien PDF public du contrat** : durée de validité limitée, jeton non devinable, journalisation des accès.
7. **Dépendances** : `npm audit`, Dependabot (npm + GitHub Actions), politique de mise à jour mensuelle.

Critères de réussite : en-têtes de sécurité vérifiés sur la production, aucun avertissement CSP dans la console, export RGPD contenant toutes les données du client.
