// DRYP Ledger financials for the CFO view. Cash-basis (payments received).
import { supabaseLedger } from "./supabaseLedger";

export interface RevenueSnapshot {
  cashIn: number;        // all-time cash received
  thisMonth: number;     // cash received this calendar month
  invoiced: number;      // total invoiced
  outstanding: number;   // invoiced but not yet paid
  recent: { client_name: string; engagement: string; amount: number; status: string; date: string }[];
}

export async function getRevenueSnapshot(): Promise<RevenueSnapshot> {
  const [{ data: payments }, { data: invoices }] = await Promise.all([
    supabaseLedger.from("invoice_payments").select("amount, payment_date"),
    supabaseLedger.from("invoices").select("client_name, engagement, amount_invoiced, status, invoice_date").order("invoice_date", { ascending: false }),
  ]);

  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const cashIn = (payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const thisMonth = (payments ?? [])
    .filter(p => (p.payment_date ?? "").startsWith(ym))
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const invoiced = (invoices ?? []).reduce((s, i) => s + Number(i.amount_invoiced ?? 0), 0);
  const outstanding = (invoices ?? [])
    .filter(i => i.status !== "paid")
    .reduce((s, i) => s + Number(i.amount_invoiced ?? 0), 0);
  const recent = (invoices ?? []).slice(0, 6).map(i => ({
    client_name: i.client_name, engagement: i.engagement,
    amount: Number(i.amount_invoiced ?? 0), status: i.status, date: i.invoice_date,
  }));

  return { cashIn, thisMonth, invoiced, outstanding, recent };
}
