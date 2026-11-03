-- Migration secu-0e-facturation (sécurité lot 0, phase E) — à appliquer en
-- production au moment du « Merge », dans cet ordre, après un instantané Neon.

-- 1. Factures émises : ni suppression, ni modification des montants, du numéro,
--    de la date, du client, de la TVA, ni retour en brouillon. Les brouillons et
--    les factures de test restent libres. notes, due_date, statut de paiement et
--    envoi par e-mail restent modifiables (journalisés par l'application).
CREATE OR REPLACE FUNCTION invoices_lock() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT OLD.is_test AND OLD.status <> 'BROUILLON' THEN
      RAISE EXCEPTION 'facture émise % : suppression interdite (établir un avoir)', OLD.number USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF NOT OLD.is_test AND OLD.status <> 'BROUILLON' THEN
    IF NEW.number IS DISTINCT FROM OLD.number
       OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.total_ht IS DISTINCT FROM OLD.total_ht
       OR NEW.total_tva IS DISTINCT FROM OLD.total_tva
       OR NEW.total_ttc IS DISTINCT FROM OLD.total_ttc
       OR NEW.tva_rate IS DISTINCT FROM OLD.tva_rate
       OR NEW.is_test IS DISTINCT FROM OLD.is_test
       OR NEW.credit_note_of IS DISTINCT FROM OLD.credit_note_of
       OR NEW.status = 'BROUILLON' THEN
      RAISE EXCEPTION 'facture émise % : modification interdite (établir un avoir)', OLD.number USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invoices_lock ON invoices;
CREATE TRIGGER invoices_lock BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_lock();

-- 2. Lignes d'une facture émise : figées (ajout, modification, suppression).
CREATE OR REPLACE FUNCTION invoice_items_lock() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  inv_ids uuid[];
BEGIN
  IF TG_OP = 'INSERT' THEN inv_ids := ARRAY[NEW.invoice_id];
  ELSIF TG_OP = 'DELETE' THEN inv_ids := ARRAY[OLD.invoice_id];
  ELSE inv_ids := ARRAY[OLD.invoice_id, NEW.invoice_id];
  END IF;
  IF EXISTS (SELECT 1 FROM invoices WHERE id = ANY(inv_ids) AND NOT is_test AND status <> 'BROUILLON') THEN
    RAISE EXCEPTION 'lignes d''une facture émise : modification interdite' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invoice_items_lock ON invoice_items;
CREATE TRIGGER invoice_items_lock BEFORE INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION invoice_items_lock();

-- 3. Préfixe de facturation figé dès qu'une vraie facture existe.
CREATE OR REPLACE FUNCTION settings_invoice_prefix_lock() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invoice_prefix IS DISTINCT FROM OLD.invoice_prefix
     AND EXISTS (SELECT 1 FROM invoices WHERE NOT is_test) THEN
    RAISE EXCEPTION 'préfixe de facturation figé : des factures ont déjà été émises' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS settings_invoice_prefix_lock ON settings;
CREATE TRIGGER settings_invoice_prefix_lock BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION settings_invoice_prefix_lock();

-- 4. Journal d'audit en ajout seul ; seule la purge de conservation (app.retention = 'on')
--    peut supprimer les entrées de plus de 5 ans.
CREATE OR REPLACE FUNCTION audit_log_lock() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND COALESCE(current_setting('app.retention', true), '') = 'on'
     AND OLD.at < now() - interval '5 years' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'journal d''audit : modification interdite' USING ERRCODE = 'check_violation';
END;
$$;
DROP TRIGGER IF EXISTS audit_log_lock ON audit_log;
CREATE TRIGGER audit_log_lock BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_lock();
