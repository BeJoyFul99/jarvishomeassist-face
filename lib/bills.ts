import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────

export interface Property {
  id: number;
  name: string;
  address: string;
  meter_numbers: unknown | null;
  account_number: string;
  provider: string;
  rate_class: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ExtractionStatus = "processing" | "completed" | "needs_review" | "failed";
export type ExtractionMethod = "structured" | "vision_fallback" | "manual";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "overdue";
export type IngestionSource = "manual_upload" | "email_inbound" | "manual_entry";

export interface UtilityBill {
  id: number;
  property_id: number;
  uploaded_by: number;
  file_path: string;
  file_hash: string;
  statement_date: string;
  due_date: string;
  billing_period_start: string;
  billing_period_end: string;
  bill_type: string;
  total_amount: number;
  previous_balance: number;
  payments_received: number;
  balance_forward: number;
  late_fees: number;
  currency: string;
  payment_status: PaymentStatus;
  paid_date: string | null;
  paid_amount: number | null;
  ingestion_source: IngestionSource;
  extraction_status: ExtractionStatus;
  extraction_method: ExtractionMethod | null;
  extraction_model: string | null;
  extraction_confidence: number | null;
  extraction_error: string | null;
  raw_extracted_data: unknown;
  created_at: string;
  updated_at: string;
}

export type UtilityType = "electricity" | "water" | "hvac" | "other";
export type LineItemCategory =
  | "energy" | "delivery" | "regulatory" | "debt_retirement"
  | "hst" | "rebate" | "late_fee";

export interface UtilityBillLineItem {
  id: number;
  bill_id: number;
  utility_type: UtilityType;
  category: LineItemCategory;
  description: string;
  usage_amount: number | null;
  usage_unit: string | null;
  rate: number | null;
  amount: number;
  created_at: string;
}

export interface UtilityBillMeter {
  id: number;
  bill_id: number;
  meter_type: "electric" | "water" | "hvac";
  meter_number: string;
  previous_reading: string;
  previous_read_date: string;
  current_reading: string;
  current_read_date: string;
  usage: number;
  multiplier: number;
  created_at: string;
}

export interface BillDetail {
  bill: UtilityBill;
  line_items: UtilityBillLineItem[];
  meters: UtilityBillMeter[];
}

export interface EnergyBudget {
  id: number;
  month: number;
  year: number;
  budget_kwh: number;
  budget_amount: number;
  currency: string;
  property_id: number | null;
  alert_threshold_pct: number;
  created_at: string;
  updated_at: string;
}

export interface Projection {
  baseline: "yoy" | "trailing_3mo" | "unknown";
  projected: number;
  confidence: string;
  reference_note: string;
}

export interface PaceResponse {
  projection: Projection;
  budget: EnergyBudget;
}

// ── Fetchers ─────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      if (err?.message) msg = err.message;
      else if (err?.error) msg = err.error;
    } catch {
      // non-JSON body — keep the status-line fallback
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Properties ───────────────────────────────────────────────────

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: () => get<Property[]>("/api/v1/properties"),
    staleTime: 60_000,
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      send<void>(`/api/v1/admin/properties/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; address: string; account_number?: string; provider?: string; rate_class?: string }) =>
      send<Property>("/api/v1/admin/properties", "POST", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

// ── Bills ────────────────────────────────────────────────────────

export interface BillListFilter {
  property_id?: number;
  status?: ExtractionStatus;
  date_from?: string;
  date_to?: string;
}

export function useBills(filter: BillListFilter = {}) {
  const params = new URLSearchParams();
  if (filter.property_id) params.set("property_id", String(filter.property_id));
  if (filter.status) params.set("status", filter.status);
  if (filter.date_from) params.set("date_from", filter.date_from);
  if (filter.date_to) params.set("date_to", filter.date_to);
  const qs = params.toString();
  return useQuery({
    queryKey: ["bills", filter],
    queryFn: () => get<UtilityBill[]>(`/api/v1/utility-bills${qs ? "?" + qs : ""}`),
    staleTime: 30_000,
    enabled: filter.property_id !== undefined ? filter.property_id > 0 : true,
  });
}

export function useBill(id: number | null) {
  return useQuery({
    queryKey: ["bill", id],
    queryFn: () => get<BillDetail>(`/api/v1/utility-bills/${id}`),
    enabled: id !== null && id > 0,
    staleTime: 15_000,
  });
}

export function useUploadBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { propertyId: number; file: File }) => {
      const fd = new FormData();
      fd.append("property_id", String(args.propertyId));
      fd.append("file", args.file);
      const res = await fetch("/api/v1/admin/utility-bills/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }
      return res.json() as Promise<{ bill_id: number }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
  });
}

export function useManualCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      property_id: number;
      statement_date?: string;
      due_date?: string;
      billing_period_start?: string;
      billing_period_end?: string;
      bill_type?: string;
      total_amount?: number;
      previous_balance?: number;
      late_fees?: number;
      currency?: string;
    }) => send<UtilityBill>("/api/v1/admin/utility-bills", "POST", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; patch: Partial<UtilityBill> }) =>
      send<UtilityBill>(`/api/v1/admin/utility-bills/${args.id}`, "PATCH", args.patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["bill", vars.id] });
    },
  });
}

export function useUpdateLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { billId: number; lineId: number; patch: Partial<UtilityBillLineItem> }) =>
      send<UtilityBillLineItem>(
        `/api/v1/admin/utility-bills/${args.billId}/line-items/${args.lineId}`,
        "PATCH",
        args.patch,
      ),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["bill", vars.billId] }),
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; paid_amount: number; paid_date?: string }) =>
      send<UtilityBill>(`/api/v1/admin/utility-bills/${args.id}/mark-paid`, "POST", {
        paid_amount: args.paid_amount,
        paid_date: args.paid_date,
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["bill", vars.id] });
    },
  });
}

export function useReextract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      send<{ bill_id: number }>(`/api/v1/admin/utility-bills/${id}/reextract`, "POST"),
    // Optimistic: flip the cached bill to "processing" immediately so the
    // Re-extract click doesn't block on the network round-trip. React Query
    // re-invalidates after the actual 202 comes back, and SSE events finish
    // the update once the worker completes.
    onMutate: async (id: number) => {
      const key = ["bill", id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BillDetail>(key);
      if (prev) {
        qc.setQueryData<BillDetail>(key, {
          ...prev,
          bill: {
            ...prev.bill,
            extraction_status: "processing",
            extraction_error: null,
          },
        });
      }
      return { prev };
    },
    onError: (_err, id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["bill", id], ctx.prev);
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["bill", id] });
    },
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: number; hard?: boolean }) => {
      const qs = args.hard ? "?hard=true" : "";
      const res = await fetch(`/api/v1/admin/utility-bills/${args.id}${qs}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return undefined;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills"] }),
  });
}

export function billPdfUrl(id: number): string {
  return `/api/v1/utility-bills/${id}/pdf`;
}

/** Same endpoint but with attachment disposition — triggers a named download. */
export function billPdfDownloadUrl(id: number): string {
  return `/api/v1/utility-bills/${id}/pdf?download=1`;
}

// ── Budgets ──────────────────────────────────────────────────────

export function useBudgets(propertyId: number | null) {
  return useQuery({
    queryKey: ["utility-budgets", propertyId],
    queryFn: () =>
      get<EnergyBudget[]>(`/api/v1/utility-budgets${propertyId ? `?property_id=${propertyId}` : ""}`),
    enabled: propertyId !== null,
    staleTime: 60_000,
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      month: number;
      year: number;
      property_id?: number;
      budget_kwh?: number;
      budget_amount?: number;
      currency?: string;
      alert_threshold_pct?: number;
    }) => send<EnergyBudget>("/api/v1/admin/utility-budgets", "POST", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["utility-budgets"] }),
  });
}

export function usePace(propertyId: number | null, month?: number, year?: number) {
  const params = new URLSearchParams();
  if (propertyId) params.set("property_id", String(propertyId));
  if (month) params.set("month", String(month));
  if (year) params.set("year", String(year));
  return useQuery({
    queryKey: ["utility-budget-pace", propertyId, month, year],
    queryFn: () => get<PaceResponse>(`/api/v1/utility-budgets/pace?${params.toString()}`),
    enabled: propertyId !== null && propertyId > 0,
    staleTime: 30_000,
  });
}
