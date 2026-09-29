# Refonte facturation & tarifs (branche `facturation`)

Respecter docs/IDENTITE_VISUELLE.md (rouille/mousse/miel, Phosphor, zéro emoji, tutoiement admin).
Next.js 16 : lire node_modules/next/dist/docs/ si un doute (AGENTS.md). Pas de build possible ici.

## 1. Modèle de données (colonnes ajoutées, migration idempotente dans lib/schema.sql)
- visits.is_free BOOLEAN NOT NULL DEFAULT false ; visits.free_reason TEXT DEFAULT ''
- visits.travel_fee NUMERIC DEFAULT 0  (frais de déplacement, distinct de `price` = prestation)
- clients.distance_km NUMERIC (aller simple, NULL = inconnu) ; clients.travel_minutes INTEGER (aller simple)
- settings.km_rate NUMERIC DEFAULT 0.50 ; settings.travel_time_share NUMERIC DEFAULT 0.5 (part du taux horaire
  appliquée au temps de trajet) ; settings.travel_free_km NUMERIC DEFAULT 4 (franchise, km aller-retour) ;
  settings.rate_30 DEFAULT 15, rate_45 DEFAULT 18, rate_60 DEFAULT 22 (prix prestation par durée)
Montant dû d'une visite = is_free ? 0 : price + travel_fee.

## 2. Formule (lib/pricing.js, fonctions pures, testables)
- basePrice(minutes, s): 30→rate_30, 45→rate_45, 60→rate_60 ; autre durée = rate_60 × minutes/60, min rate_30.
- travelFee({distanceKm, travelMinutes}, s): kmAR = 2×distanceKm ; si kmAR <= travel_free_km → 0 ;
  sinon kmAR×km_rate + (2×travelMinutes/60)×rate_60×travel_time_share. Arrondi à 0,50 €.
- suggestedPrice = { base, travel, total }. Toujours modifiable à la main par l'utilisatrice.

## 3. API (contrats)
- PATCH /api/visits/[id] accepte isFree, freeReason, travelFee, price (en plus des champs actuels).
- POST /api/visits accepte travelFee ; renvoie inchangé sinon.
- POST /api/clients/[id]/travel : géocode l'adresse client et settings.business_address via
  https://api-adresse.data.gouv.fr/search/?q=…&limit=1, distance/durée via
  https://router.project-osrm.org/route/v1/driving/{lon},{lat};{lon},{lat}?overview=false ;
  enregistre distance_km (arrondi 0,1) et travel_minutes sur le client ; renvoie {distanceKm, travelMinutes}.
  Erreurs claires en français (adresse introuvable, adresse pro non renseignée).
- PATCH /api/settings accepte kmRate, travelTimeShare, travelFreeKm, rate30, rate45, rate60.
- POST /api/invoices/from-visits {clientId, visitIds[], tvaRate?, dueDate?} : crée la facture depuis les visites
  (une ligne par visite : « Visite du 14/09/2026 — Tweed (1 h) » qty 1 ; une ligne « Déplacement » si travel_fee>0 ;
  visite offerte = ligne à 0 € libellée « … — offerte » ; TVA = settings.default_tva_rate par défaut),
  marque les visites invoice_id. Réutilise la logique de numérotation/transaction de POST /api/invoices.

## 4. Statut de visite unifié (calculé, pas stocké) — lib/visitBilling.js
billingState(visit, invoice) → 'A_FAIRE' (PLANIFIE/EN_COURS) | 'TERMINEE' (FAIT, sans facture) |
'FACTUREE' (facture BROUILLON/ENVOYEE/EN_RETARD) | 'PAYEE' (facture PAYEE) | 'OFFERTE' (is_free) | 'ANNULEE'.
Une pastille unique dans VisitCard/planning/fiche client.

## 5. Comptabilité (app/admin/accounting/page.js) — 3 onglets via ?tab=
- À facturer : visites FAIT sans facture, non offertes-vides, groupées par client, total, bouton « Créer la facture »
  (POST from-visits pour toutes les visites du groupe, cases à décocher) ; lien « Facture personnalisée » vers l'existant.
- À encaisser : factures ENVOYEE/EN_RETARD/BROUILLON avec reste à payer + bouton « Marquer payée ».
- Payées : historique. Conserver l'export existant.
