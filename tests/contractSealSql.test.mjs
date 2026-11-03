import { test, expect } from "bun:test";
import { computeSeal } from "../lib/contractSeal.js";

// Contrat fictif inséré sur la branche Neon de test « secu-lot0-tests » ; la
// fonction SQL contract_seal_of() (docs/superpowers/migrations/secu-0b-contrat.sql)
// y a donné l'empreinte ci-dessous. Le code JS doit produire la même : c'est ce
// qui garantit que les contrats scellés par la migration se vérifient ensuite.
test("le sceau JS est identique au sceau calculé en SQL par la migration", () => {
  const sig = {
    id: "8b0e2c4a-1111-4222-8333-444455556666",
    client_id: "998a908a-edcf-42e9-a452-6e2e6fa25b94",
    version: 2,
    content: 'Contrat "test"\n## Article\tà é ç 🐾 \\ fin\u001f',
    content_hash: "abc123",
    signer_name: "Christine Loosen",
    signer_ip: "203.0.113.7",
    signer_user_agent: null,
    checkboxes: { photos: false, accept: true },
    emergency_contact: "Paul",
    vet_info: null,
    signed_at_utc: "2026-11-02T17:32:54.256140Z",
  };
  expect(computeSeal(sig)).toBe("413c06589c643f678c2b0e3e1b9189a4147379fb783effabbf3994f6106ef78a");
});
