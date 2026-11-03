# SDD ledger — plan: docs/superpowers/plans/2026-11-02-securite-lot0.md
Pre-flight: T1 encrypt/decrypt/isEncrypted -> consumed by T8, T12 (match). T2 audit(db,{...}) -> T5,T6,T7,T11,T13 (match). T3 consumeAttempt/clearAttempts -> T7 mfa (match). T5 computeSeal -> T6 script (match). T6 trigger -> T13 adds sent_to exception (planned).
Ruling: spec+plan committed into secu-0a-fondations (copied from secu-lot0) — keeps plan with code on main — cost if wrong: one doc commit.
Task 1: complete (tests: bun test tests/crypto.test.mjs → 6/6 pass)
Task 1: Ruling: pas d'instantané avant-secu-0a (limite 1 sur plan gratuit) — migration A uniquement additive, PITR 6 h — coût si faux : restauration manuelle via historique
Task 1: Ruling: clé montrée en clair à Timothé à sa demande explicite — copie de secours
Task 2: complete (migration appliquée en prod via run_sql_transaction ; bun build lib/audit.js OK ; pas de test unitaire : dépend de pg)
Task 3: complete (tests: bun test tests/rateLimit.test.mjs → 4/4 pass, base simulée)
Task 3: Ruling: consumeAttempt en 2 instructions (INSERT puis COUNT) au lieu d'une CTE — une CTE ne voit pas les insertions concurrentes — coût si faux : aucun (plus strict)
Task 3: Ruling: clearAttempts aussi sur mfa/mfa-ip après succès — sinon 5 connexions/15 min bloquent Aurore — coût si faux : nul
Task 3: Ruling: test Neon de la CTE remplacé par test bun avec base simulée (y compris 50 requêtes parallèles) — évite de polluer la prod — coût si faux : comportement Postgres réel non vérifié
Task 4: complete (tests: bun test tests/ → 18/18 pass ; bun build sur chaque fichier modifié OK)
Task 4: Ruling: requireClient refuse si must_change_password, sans paramètre allowPasswordChange — /api/auth/password utilise getCurrentUser — coût si faux : nul
Task 4: Ruling: les routes partagées admin/client via getCurrentUser (factures, PDF, photos, portal/pets, visits) ne vérifient pas must_change_password — hors périmètre requireClient de la spec ; exposition faible (le mot de passe provisoire donne déjà l'accès) — coût si faux : un client au mot de passe provisoire lit ses propres documents via l'API
Final A: fixed PATCH client bloquant (email ancien invalide / téléphone long) + erreur affichée dans ClientInfoCard — tests/clientPatch.test.mjs RED→GREEN, suite 29/29
Final A: fixed clientPageGuard redirigeait vers /login au lieu de /compte/mot-de-passe — tests/pageGuard.test.mjs RED→GREEN, suite 29/29
Final A: minor (deferred): encrypt(null) stocke "null" ; AAD par ligne possible
Final A: minor (deferred): les requêtes bloquées ajoutent des lignes (blocage prolongé, clé mfa par user id)
Final A: minor (deferred): login-ip compte aussi les succès (IP partagée)
Task 5: complete (branche secu-0b-contrat, tests: bun test tests/contractSeal.test.mjs → 7/7)
Task 5: Ruling: horodatage du sceau = to_char(signed_at UTC, microsecondes) sélectionné en SQL (SIGNED_AT_UTC_SQL), pas la Date JS (ms) — évite les écarts d'arrondi — coût si faux : aucun
Task 6: complete (tests: bun test tests/ → 42/42 ; triggers testés sur branche Neon secu-lot0-tests)
Task 6: Ruling: sceaux des contrats existants calculés en SQL (contract_seal_of) au lieu d'un script JS — équivalence prouvée par tests/contractSealSql.test.mjs — coût si faux : PDF refusés pour les anciens contrats
Task 6: Ruling: client sans facture mais avec contrat signé => anonymisé (pas supprimé) — sinon la cascade est refusée par le verrou
Task B0: correctif devis e.message (message générique)
Task 7+8: complete (branche secu-0c-2fa 32f6882, tests: bun test tests/ → 46/46)
Task 7: Ruling: crypto.encrypt refuse les non-chaînes (mineur différé de la phase A) — coût si faux : nul
Task 7: Ruling: password-change et totp-admin passés à consumeAttempt ; réinitialisation après succès pour password-change
Task 7: Ruling: codes de secours hachés en SHA-256 simple (40 bits d'entropie + limite 5 essais/15 min) — coût si faux : bcrypt serait plus lent pour un attaquant hors ligne
