-- Migration secu-0b-contrat (sécurité lot 0, phase B) — à appliquer en production
-- au moment du « Merge », dans cet ordre, après un instantané Neon.
-- Les colonnes seal_hash / sealed_at / seal_legacy existent déjà (phase A).

-- 1. Fonction de calcul du sceau, identique à lib/contractSeal.js (computeSeal) :
--    SHA-256 du JSON canonique (clés triées, sans espaces) du dossier signé.
CREATE OR REPLACE FUNCTION contract_seal_of(s contract_signatures) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(
    '{"checkboxes":' || COALESCE((
        SELECT '{' || COALESCE(string_agg(to_json(e.key)::text || ':' || e.value::text, ',' ORDER BY e.key COLLATE "C"), '') || '}'
          FROM jsonb_each(s.checkboxes) e
      ), 'null')
    || ',"client_id":' || COALESCE(to_json(s.client_id::text)::text, 'null')
    || ',"content":' || COALESCE(to_json(s.content)::text, 'null')
    || ',"content_hash":' || COALESCE(to_json(s.content_hash)::text, 'null')
    || ',"emergency_contact":' || COALESCE(to_json(s.emergency_contact)::text, 'null')
    || ',"id":' || COALESCE(to_json(s.id::text)::text, 'null')
    || ',"signed_at":' || COALESCE(to_json(to_char(s.signed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))::text, 'null')
    || ',"signer_ip":' || COALESCE(to_json(s.signer_ip)::text, 'null')
    || ',"signer_name":' || COALESCE(to_json(s.signer_name)::text, 'null')
    || ',"signer_user_agent":' || COALESCE(to_json(s.signer_user_agent)::text, 'null')
    || ',"version":' || COALESCE(s.version::text, 'null')
    || ',"vet_info":' || COALESCE(to_json(s.vet_info)::text, 'null')
    || '}', 'UTF8')), 'hex')
$$;

-- 2. Scellement des contrats déjà signés (mention « scellé le [date] » dans le PDF).
UPDATE contract_signatures
   SET seal_hash = contract_seal_of(contract_signatures), sealed_at = now(), seal_legacy = true
 WHERE status = 'SIGNE' AND seal_hash IS NULL;

-- 3. Verrou : un contrat signé ne se modifie plus et ne se supprime que par la
--    purge de conservation (paramètre de session app.retention = 'on').
CREATE OR REPLACE FUNCTION contract_signatures_lock() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'SIGNE' AND COALESCE(current_setting('app.retention', true), '') <> 'on' THEN
      RAISE EXCEPTION 'contrat signé : suppression interdite (conservation légale)' USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'SIGNE' THEN
    -- Seule exception : la pose du premier sceau (colonnes de sceau vides avant).
    IF OLD.seal_hash IS NULL
       AND (to_jsonb(NEW) - 'seal_hash' - 'sealed_at' - 'seal_legacy')
         = (to_jsonb(OLD) - 'seal_hash' - 'sealed_at' - 'seal_legacy') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'contrat signé : modification interdite' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS contract_signatures_lock ON contract_signatures;
CREATE TRIGGER contract_signatures_lock
  BEFORE UPDATE OR DELETE ON contract_signatures
  FOR EACH ROW EXECUTE FUNCTION contract_signatures_lock();

-- 4. Contrôle : doit renvoyer 0.
SELECT count(*) AS contrats_signes_sans_sceau FROM contract_signatures WHERE status = 'SIGNE' AND seal_hash IS NULL;
