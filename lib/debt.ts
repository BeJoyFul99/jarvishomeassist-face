// Shared types + API client for Debt Rescue Mode.
// Server counterpart: jarvisHomeAssist-brain/internal/handlers/debt.go
// Plan maths:        jarvisHomeAssist-brain/internal/debt/engine.go
//
// Every figure in Plan is computed server-side by a deterministic amortization
// engine. The AI brief is written on top of those numbers and never replaces
// them — so nothing here should ever be recalculated in the browser.

import { formatMoney } from "@/lib/currency";

export type Strategy = "avalanche" | "snowball";

export interface DebtEntry {
  name: string;
  balance: number;
  apr: number;
  min_payment: number;
}

/** The inputs the user maintains. Stored server-side as JSONB. */
export interface DebtInputs {
  monthly_income: number;
  fixed_expenses: number;
  available_cash: number;
  strategy: Strategy;
  payment_override: number;
  debts: DebtEntry[];
}

export interface SurvivalBudget {
  monthly_income: number;
  fixed_expenses: number;
  minimum_payments: number;
  essentials: number;
  disposable: number;
  safety_buffer: number;
  free_to_allocate: number;
  emergency_reserve: number;
  lump_sum_deployed: number;
  shortfall: number;
}

export interface OrderItem {
  position: number;
  name: string;
  balance: number;
  apr: number;
  min_payment: number;
  monthly_cost: number;
  payoff_month: number;
  payoff_date: string;
  never_pays_off: boolean;
}

export interface MonthRow {
  month: number;
  date: string;
  balance: number;
  interest: number;
  principal: number;
}

export interface StrategySummary {
  strategy: Strategy;
  months: number;
  total_interest: number;
  debt_free_date: string;
  converged: boolean;
}

export interface Plan {
  feasible: boolean;
  strategy: Strategy;
  /** Currency the backend wrote `summary` and `warnings` prose with. */
  currency: string;
  survival: SurvivalBudget;
  total_debt: number;
  monthly_payment_target: number;
  order: OrderItem[];
  months_to_freedom: number;
  debt_free_date: string;
  total_interest: number;
  baseline_interest: number;
  baseline_months: number;
  baseline_capped: boolean;
  interest_saved: number;
  months_saved: number;
  comparison: StrategySummary[];
  schedule: MonthRow[];
  warnings: string[];
  summary: string;
}

export interface CatalogModel {
  id: string;
  name: string;
  capabilities: string[];
  description: string;
}

export function emptyInputs(): DebtInputs {
  return {
    monthly_income: 0,
    fixed_expenses: 0,
    available_cash: 0,
    strategy: "avalanche",
    payment_override: 0,
    debts: [],
  };
}

export function emptyDebt(): DebtEntry {
  return { name: "", balance: 0, apr: 0, min_payment: 0 };
}

/** Fill in missing fields so old or partial server data never breaks the UI. */
export function normalizeInputs(raw: unknown): DebtInputs {
  const base = emptyInputs();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<DebtInputs>;
  return {
    monthly_income: num(r.monthly_income),
    fixed_expenses: num(r.fixed_expenses),
    available_cash: num(r.available_cash),
    strategy: r.strategy === "snowball" ? "snowball" : "avalanche",
    payment_override: num(r.payment_override),
    debts: Array.isArray(r.debts)
      ? r.debts.map((d) => ({
          name: typeof d?.name === "string" ? d.name : "",
          balance: num(d?.balance),
          apr: num(d?.apr),
          min_payment: num(d?.min_payment),
        }))
      : [],
  };
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * Currency for display. The server sends already-rounded figures.
 *
 * Delegates to the app-wide formatter so a debt plan renders in the same
 * currency as everything else — and, critically, in the same currency the Go
 * planner used for the prose in `summary` and `warnings`. A mix of "$700" and
 * "RM700" inside one panel reads as a bug.
 */
export function money(v: number, currency: string): string {
  return formatMoney(v, currency);
}

/** "9 months" → "9 months"; 14 → "1 yr 2 mo" for longer horizons. */
export function duration(months: number): string {
  if (months <= 0) return "—";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} yr` : `${y} yr ${m} mo`;
}

/** "2026-10" → "Oct 2026". Falls back to the raw string if unparseable. */
export function monthLabel(iso: string): string {
  if (!iso) return "—";
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

// ── API helpers (auth cookies attach automatically; 401s auto-refresh) ──

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { message?: string; error?: string }).message ||
      (data as { error?: string }).error ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function fetchDebtInputs(): Promise<DebtInputs> {
  const res = await fetch("/api/v1/debt/profile");
  const data = await jsonOrThrow<{ data: unknown }>(res);
  return normalizeInputs(data.data);
}

export async function saveDebtInputs(inputs: DebtInputs): Promise<void> {
  const res = await fetch("/api/v1/debt/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });
  await jsonOrThrow(res);
}

// The currency travels with the request rather than being stored on the
// profile: it's a display preference that can change independently of the
// figures, and the backend needs it to write its prose in the right symbol.
export async function computePlan(
  inputs: DebtInputs,
  currency: string,
): Promise<Plan> {
  const res = await fetch("/api/v1/debt/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...inputs, currency }),
  });
  const data = await jsonOrThrow<{ plan: Plan }>(res);
  return data.plan;
}

export async function fetchCoachBrief(
  inputs: DebtInputs,
  currency: string,
  model?: string,
): Promise<{ plan: Plan; brief: string }> {
  const res = await fetch("/api/v1/debt/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...inputs, currency, model }),
  });
  return jsonOrThrow<{ plan: Plan; brief: string }>(res);
}

export async function fetchDebtModels(): Promise<{
  models: CatalogModel[];
  defaultModel: string;
}> {
  const [modelsRes, settingsRes] = await Promise.all([
    fetch("/api/v1/debt/models"),
    fetch("/api/settings"),
  ]);
  const data = await jsonOrThrow<{ models: CatalogModel[] }>(modelsRes);
  const settings: Record<string, string> = settingsRes.ok
    ? await settingsRes.json().catch(() => ({}))
    : {};
  const chatModels = (data.models || []).filter((m) =>
    m.capabilities.includes("chat"),
  );
  return {
    models: chatModels,
    defaultModel: settings["ai_debt_model"] || chatModels[0]?.id || "",
  };
}
