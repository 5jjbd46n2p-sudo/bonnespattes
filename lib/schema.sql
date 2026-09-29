-- Pet Sitter App - schema complet
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'Mon activité de pet sitting',
  business_address TEXT DEFAULT '',
  siret TEXT DEFAULT '',
  tva_number TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  default_tva_rate NUMERIC DEFAULT 0,
  invoice_prefix TEXT DEFAULT 'F',
  next_invoice_seq INTEGER DEFAULT 1,
  -- Champs utilisés pour les pages publiques "Mentions légales" et
  -- "Politique de confidentialité" (conformité LCEN / RGPD).
  legal_form TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  hourly_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','CLIENT')),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  -- Anti-brute-force : verrouillage temporaire du compte après plusieurs
  -- mots de passe erronés consécutifs (voir /api/auth/login).
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT DEFAULT '',
  breed TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'BROUILLON' CHECK (status IN ('BROUILLON','ENVOYEE','PAYEE','EN_RETARD')),
  tva_rate NUMERIC DEFAULT 0,
  total_ht NUMERIC DEFAULT 0,
  total_tva NUMERIC DEFAULT 0,
  total_ttc NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT DEFAULT 'Virement',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Acomptes versés par un client avant qu'une facture existe. Une fois utilisé
-- sur une facture, invoice_id est renseigné et un paiement correspondant est
-- créé automatiquement sur cette facture (voir /api/invoices POST).
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT DEFAULT 'Virement',
  notes TEXT DEFAULT '',
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'PLANIFIE' CHECK (status IN ('PLANIFIE','EN_COURS','FAIT','ANNULE')),
  notes TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  recurrence_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(date);
CREATE INDEX IF NOT EXISTS idx_visits_client ON visits(client_id);
CREATE INDEX IF NOT EXISTS idx_visits_recurrence ON visits(recurrence_id);
CREATE INDEX IF NOT EXISTS idx_pets_client ON pets(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_deposits_client ON deposits(client_id);
CREATE INDEX IF NOT EXISTS idx_deposits_invoice ON deposits(invoice_id);

INSERT INTO settings (business_name) SELECT 'Mon activité de pet sitting' WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Migrations idempotentes pour les bases déjà existantes (créées avant l'ajout
-- du statut "En cours" et des visites récurrentes) :
ALTER TABLE visits ADD COLUMN IF NOT EXISTS recurrence_id UUID;
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;
ALTER TABLE visits ADD CONSTRAINT visits_status_check CHECK (status IN ('PLANIFIE','EN_COURS','FAIT','ANNULE'));

-- Migrations idempotentes pour le durcissement sécurité / RGPD :
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS legal_form TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT '';

-- Migrations idempotentes : refonte facturation & tarifs (déplacement, visites offertes) :
ALTER TABLE visits ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS free_reason TEXT DEFAULT '';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS travel_fee NUMERIC DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS distance_km NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS travel_minutes INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS km_rate NUMERIC DEFAULT 0.50;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS travel_time_share NUMERIC DEFAULT 0.5;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS travel_free_km NUMERIC DEFAULT 4;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS rate_30 NUMERIC DEFAULT 15;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS rate_45 NUMERIC DEFAULT 18;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS rate_60 NUMERIC DEFAULT 22;

-- Migrations idempotentes : vitrine publique, demandes (leads) et parrainage :
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_referral_code ON clients(referral_code);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS referral_credit NUMERIC DEFAULT 10;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS service_area TEXT DEFAULT 'Viarmes et environs (15 km, au-delà sur devis)';

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  commune TEXT,
  animals TEXT,
  service TEXT CHECK (service IS NULL OR service IN ('VISITE','PROMENADE','LES_DEUX')),
  message TEXT,
  referral_code TEXT,
  referrer_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'NOUVEAU' CHECK (status IN ('NOUVEAU','CONTACTE','CLIENT','SANS_SUITE')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_ip ON leads(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS client_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  used_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_client_credits_client ON client_credits(client_id);

-- Rétro-remplissage des codes de parrainage (8 car. sans ambiguïté, A-Z sauf I/O + 2-9).
DO $$
DECLARE
  r RECORD;
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INT;
BEGIN
  FOR r IN SELECT id FROM clients WHERE referral_code IS NULL LOOP
    LOOP
      code := '';
      FOR i IN 1..8 LOOP
        code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM clients WHERE referral_code = code);
    END LOOP;
    UPDATE clients SET referral_code = code WHERE id = r.id AND referral_code IS NULL;
  END LOOP;
END $$;

-- Demandes de devis (garde longue ou régulière) :
ALTER TABLE leads ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'CONTACT' CHECK (kind IN ('CONTACT','DEVIS'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote JSONB;

-- Migrations idempotentes : contrat à signature électronique :
ALTER TABLE settings ADD COLUMN IF NOT EXISTS contract_template TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS contract_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS insurance_info TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS mediator_info TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  sent_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ENVOYE' CHECK (status IN ('ENVOYE','SIGNE','ANNULE')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  otp_hash TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INTEGER NOT NULL DEFAULT 0,
  otp_sent_count INTEGER NOT NULL DEFAULT 0,
  signed_at TIMESTAMPTZ,
  signer_name TEXT,
  signer_ip TEXT,
  signer_user_agent TEXT,
  checkboxes JSONB,
  emergency_contact TEXT,
  vet_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_client ON contract_signatures(client_id);

-- Photos de la page d'accueil (ajoutées depuis l'admin) :
CREATE TABLE IF NOT EXISTS site_photos (
  slot TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Factures de test (numéro FT, hors comptabilité) :
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS next_test_invoice_seq INTEGER NOT NULL DEFAULT 1;

-- Fiche animal : stérilisé, identifié, âge, alimentation, pathologies :
ALTER TABLE pets ADD COLUMN IF NOT EXISTS sterilized BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS identified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS age_info TEXT NOT NULL DEFAULT '';
ALTER TABLE pets ADD COLUMN IF NOT EXISTS diet TEXT NOT NULL DEFAULT '';
ALTER TABLE pets ADD COLUMN IF NOT EXISTS health_conditions TEXT NOT NULL DEFAULT '';

-- Numéro de puce ou de tatouage (facultatif, conseillé) :
ALTER TABLE pets ADD COLUMN IF NOT EXISTS identification_number TEXT NOT NULL DEFAULT '';

-- Sécurité : révocation des sessions, changement de mot de passe imposé,
-- double authentification (TOTP) pour l'administrateur :
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last_step BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Limitation des tentatives par adresse IP (connexion, codes de signature…).
-- On ne stocke qu'une empreinte de l'IP, jamais l'IP elle-même.
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id BIGSERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits ON rate_limit_hits(bucket, key_hash, created_at);

-- RGPD : client anonymisé (droit à l'effacement ou fin de la durée de
-- conservation) tout en gardant ses factures, que la loi impose de conserver.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Obligation comptable : une facture ne doit jamais disparaître avec la fiche
-- client. La suppression d'un client ayant des factures passe par
-- l'anonymisation (voir lib/privacy.js).
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

-- Avoirs : une facture émise s'annule par une facture d'avoir (montants
-- négatifs, même suite de numéros), jamais par suppression.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_note_of UUID REFERENCES invoices(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_credit_note_of ON invoices(credit_note_of) WHERE credit_note_of IS NOT NULL;
