// Numérotation des factures. Les factures réelles suivent F0001, F0002... ; les factures de
// test ont leur propre suite (FT0001...) pour ne jamais créer de trou dans la vraie numérotation.

export async function allocateInvoiceNumber(client, settings, isTest) {
  const prefix = settings.invoice_prefix || "F";
  if (isTest) {
    const seq = settings.next_test_invoice_seq || 1;
    await client.query("UPDATE settings SET next_test_invoice_seq = $1 WHERE id = $2", [seq + 1, settings.id]);
    return `${prefix}T${String(seq).padStart(4, "0")}`;
  }
  const seq = settings.next_invoice_seq;
  await client.query("UPDATE settings SET next_invoice_seq = next_invoice_seq + 1 WHERE id = $1", [settings.id]);
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// Après une suppression ou un passage en « test » : les compteurs redescendent au plus haut numéro
// existant + 1 (jamais plus haut qu'avant), pour ne laisser aucun trou en fin de suite.
export async function resyncInvoiceSequences(client) {
  const st = await client.query("SELECT id, invoice_prefix, next_invoice_seq, next_test_invoice_seq FROM settings LIMIT 1 FOR UPDATE");
  const s = st.rows[0];
  if (!s) return;
  const prefix = s.invoice_prefix || "F";
  const { rows } = await client.query("SELECT number FROM invoices");
  let maxReal = 0;
  let maxTest = 0;
  for (const { number } of rows) {
    if (!number.startsWith(prefix)) continue;
    const rest = number.slice(prefix.length);
    if (/^\d+$/.test(rest)) maxReal = Math.max(maxReal, Number(rest));
    else if (/^T\d+$/.test(rest)) maxTest = Math.max(maxTest, Number(rest.slice(1)));
  }
  const nextReal = Math.min(s.next_invoice_seq, maxReal + 1);
  const nextTest = Math.min(s.next_test_invoice_seq, maxTest + 1);
  if (nextReal !== s.next_invoice_seq || nextTest !== s.next_test_invoice_seq) {
    await client.query("UPDATE settings SET next_invoice_seq = $1, next_test_invoice_seq = $2 WHERE id = $3", [nextReal, nextTest, s.id]);
  }
}
