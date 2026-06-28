// DRYP Hub CRM — read + EDIT connection from Kaleb OS.
// Uses the existing supabaseDryp client (DRYP_SUPABASE_URL / DRYP_SUPABASE_KEY).
// The service key bypasses RLS, so all calls run server-side only (API routes / server components).
//
// CRM tables (DRYP Hub, repo Kmucius1/v0-supabase-integration-check):
//   leads · accounts · contacts · projects · tasks · prospects · invoices · notes · services ...
// This module exposes typed read + update/insert for the entities Kaleb edits most.

import { supabaseDryp } from "./supabaseDryp";

// ---- Lead stages / statuses (from DRYP Hub schema enums) ----
export type LeadStage =
  | "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost" | "on_hold";

export interface Lead {
  id: string;
  business_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  stage: LeadStage;
  source?: string | null;
  estimated_value?: number | null;
  notes?: string | null;
  next_action?: string | null;
  last_contact_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  id: string;
  business_name: string;
  is_active?: boolean;
  health_status?: string;
  monthly_retainer?: number | null;
  onboarding_status?: string;
}

export interface Task {
  id: string;
  title: string;
  status?: string;
  due_date?: string | null;
  lead_id?: string | null;
  account_id?: string | null;
}

// ============================================================
// READ
// ============================================================
export async function getLeads(opts: { stage?: LeadStage; limit?: number } = {}) {
  let q = supabaseDryp.from("leads").select("*").order("created_at", { ascending: false });
  if (opts.stage) q = q.eq("stage", opts.stage);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(`getLeads: ${error.message}`);
  return (data ?? []) as Lead[];
}

export async function getLead(id: string) {
  const { data, error } = await supabaseDryp.from("leads").select("*").eq("id", id).single();
  if (error) throw new Error(`getLead: ${error.message}`);
  return data as Lead;
}

export async function getAccounts() {
  const { data, error } = await supabaseDryp
    .from("accounts").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`getAccounts: ${error.message}`);
  return (data ?? []) as Account[];
}

export async function getTasks(opts: { status?: string; limit?: number } = {}) {
  let q = supabaseDryp.from("tasks").select("*").order("due_date", { ascending: true });
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(`getTasks: ${error.message}`);
  return (data ?? []) as Task[];
}

// ============================================================
// EDIT (write)
// ============================================================
export async function updateLead(id: string, patch: Partial<Lead>) {
  const { data, error } = await supabaseDryp
    .from("leads")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateLead: ${error.message}`);
  return data as Lead;
}

export async function setLeadStage(id: string, stage: LeadStage) {
  return updateLead(id, { stage });
}

export async function createLead(lead: Partial<Lead> & { business_name: string }) {
  const { data, error } = await supabaseDryp.from("leads").insert(lead).select().single();
  if (error) throw new Error(`createLead: ${error.message}`);
  return data as Lead;
}

export async function updateAccount(id: string, patch: Partial<Account>) {
  const { data, error } = await supabaseDryp
    .from("accounts").update(patch).eq("id", id).select().single();
  if (error) throw new Error(`updateAccount: ${error.message}`);
  return data as Account;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const { data, error } = await supabaseDryp
    .from("tasks").update(patch).eq("id", id).select().single();
  if (error) throw new Error(`updateTask: ${error.message}`);
  return data as Task;
}

// Generic escape hatch for tables not yet wrapped above (notes, invoices, prospects, ...).
export async function crmSelect(table: string, columns = "*") {
  const { data, error } = await supabaseDryp.from(table).select(columns);
  if (error) throw new Error(`crmSelect(${table}): ${error.message}`);
  return data ?? [];
}

export async function crmUpdate(table: string, id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabaseDryp.from(table).update(patch).eq("id", id).select();
  if (error) throw new Error(`crmUpdate(${table}): ${error.message}`);
  return data;
}
