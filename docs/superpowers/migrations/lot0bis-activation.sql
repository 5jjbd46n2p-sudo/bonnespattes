-- Lot 0 bis, lien d'activation de l'espace client (branche lot0bis-activation).
-- À appliquer sur Neon AU MOMENT DU « Merge », avant le déploiement du code
-- (run_sql_transaction, une instruction par élément). Idempotent.
CREATE TABLE IF NOT EXISTS activation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activation_tokens_user ON activation_tokens(user_id);
