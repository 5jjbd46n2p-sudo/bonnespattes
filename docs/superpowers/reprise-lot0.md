# Reprise du lot 0 (pause demandée par Timothé)

Branches poussées (aucune fusionnée) :
- `secu-0b-contrat` : terminée (sceau, vérification au PDF, verrou en base, scellement SQL des contrats existants, privacy, correctif e.message devis). Migration : `docs/superpowers/migrations/secu-0b-contrat.sql`.
- `secu-0c-2fa` : terminée (codes de secours, secret TOTP chiffré, consumeAttempt sur totp/password). Migration : aucune (`secu-0c-2fa.sql` = contrôle).
- `secu-0e-facturation` : WIP. Fait : triggers (testés sur la branche Neon), avoir créé en brouillon puis émis, préfixe figé (route + trigger), journal écrit pour création/émission/paiement/notes/échéance/avoir/remplacement/réglages sensibles. Migration : `docs/superpowers/migrations/secu-0e-facturation.sql`.

Prochaines tâches :
1. Phase E, tâche 11 : purge du journal > 5 ans dans `applyRetention` (tx + `set_config('app.retention','on',true)`), écran `app/admin/journal/page.js` (100 dernières entrées, filtre `?type=`), lien depuis Réglages.
2. Phase F (`secu-0f-acces`) : tâches 12 et 13 du plan ; ajouter au trigger contrat l'exception `sent_to` → '' pour l'anonymisation.
3. Relecture des diffs des quatre branches contre la spec.

Branche Neon de test : `secu-lot0-tests` (br-lucky-resonance-b1wizvt4), contient les triggers B et E et des lignes de test ; à supprimer avec l'accord de Timothé.
Ledger : `docs/superpowers/progress-lot0.md` (copie de `.superpowers/sdd/2026-11-02-securite-lot0/progress.md`).
