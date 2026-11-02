import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/api";
import { loadInvoiceWithClient, buildInvoicePdf, invoiceFilename } from "@/lib/invoicePdf";

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non autorisé.", { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return new Response("Facture introuvable.", { status: 404 });

  const invoice = await loadInvoiceWithClient(id);
  if (!invoice) return new Response("Facture introuvable.", { status: 404 });
  // Un client ne voit que ses factures émises (ni brouillon ni facture de test)
  if (
    user.role === "CLIENT" &&
    (invoice.client_id !== user.client_id || invoice.is_test || invoice.status === "BROUILLON")
  ) {
    return new Response("Facture introuvable.", { status: 404 });
  }

  const bytes = await buildInvoicePdf(invoice);
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceFilename(invoice)}"`,
      // Document financier : jamais conservé en cache (navigateur, proxy)
      "Cache-Control": "private, no-store",
    },
  });
}
