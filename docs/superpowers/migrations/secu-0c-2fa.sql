-- Migration secu-0c-2fa (sécurité lot 0, phase C)
-- Aucune instruction à appliquer : la table backup_codes existe déjà (phase A).
-- Les secrets TOTP encore en clair sont chiffrés automatiquement à la prochaine
-- connexion (lib/security.js, readTotpSecret). Contrôle après une connexion d'Aurore :
SELECT left(totp_secret, 3) AS prefixe FROM users WHERE role = 'ADMIN' AND totp_secret IS NOT NULL; -- attendu : v1:
