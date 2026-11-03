-- Lot 2 vitrine : numéro WhatsApp entreprise (vide = bouton masqué).
-- À appliquer en base AVANT la fusion dans main (sinon l'enregistrement de Réglages > Site public échoue dès qu'un numéro est saisi).
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
