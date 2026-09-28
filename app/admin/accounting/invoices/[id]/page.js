import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { formatDateFR, formatEUR } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import InvoiceStatusControl from "@/components/InvoiceStatusControl";
import PaymentRecorder from "@/components/PaymentRecorder";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

async function getInvoice(id) {
  const invRes = await query(
    `SELECT i.*, c.first_name, c.last_name, c.address, c.email AS client_email
     FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.id = $1`,
    [id]
  );
  if (!invRes.rows[0]) return null;
  const itemsRes = await query("SELECT * FROM invoice_items WHERE invoice_id = $1", [id]);
  const paymentsRes = await query("SELECT * FROM payments WHERE invoice_id = $1 ORDER BY date DESC", [id]);
  return { invoice: invRes.rows[0], items: itemsRes.rows, payments: paymentsRes.rows };
}

export default async function InvoiceDetailPage({ params }) {
  const { id } = await params;
  const data = await getInvoice(id);
  if (!data) notFound();
  const { invoice, items, payments } = data;
  const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Number(invoice.total_ttc) - paidAmount;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/admin/accounting" className="text-sm text-muted hover:underline">
          ← Retour à la comptabilité
        </Link>
        <div className="flex items-center gap-2">
          <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
            <Download className="w-4 h-4" strokeWidth={1.9} />
            Télécharger le PDF
          </a>
        </div>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest-dark">{invoice.number}</h1>
          <p className="text-muted text-sm mt-1">
            {invoice.first_name} {invoice.last_name} · Émise le {formatDateFR(invoice.issue_date)}
            {invoice.due_date && ` · Échéance le ${formatDateFR(invoice.due_date)}`}
          </p>
        </div>
        <InvoiceStatusControl invoiceId={id} status={invoice.status} />
      </div>

      <div className="card p-5">
        <div className="scroll-x">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="text-muted text-xs uppercase">
              <tr>
                <th className="text-left pb-2">Description</th>
                <th className="text-right pb-2">Qté</th>
                <th className="text-right pb-2">Prix unit.</th>
                <th className="text-right pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="py-2">{it.description}</td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{formatEUR(it.unit_price)}</td>
                  <td className="py-2 text-right font-medium">{formatEUR(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border mt-3 pt-3 space-y-1 text-sm ml-auto max-w-[220px]">
          <div className="flex justify-between">
            <span>Total HT</span>
            <span>{formatEUR(invoice.total_ht)}</span>
          </div>
          <div className="flex justify-between">
            <span>TVA ({invoice.tva_rate}%)</span>
            <span>{formatEUR(invoice.total_tva)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base">
            <span>Total TTC</span>
            <span>{formatEUR(invoice.total_ttc)}</span>
          </div>
        </div>
      </div>

      <PaymentRecorder invoiceId={id} payments={payments} balance={balance} />
    </div>
  );
}
