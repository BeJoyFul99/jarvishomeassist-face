// Central currency formatting for the whole app.
//
// IMPORTANT: amounts are stored as plain numbers with no currency attached.
// Changing the currency changes how those numbers are *displayed* — it does
// not convert them. There is no FX rate anywhere in this system, and adding a
// symbol is not a conversion.
//
// Locales are pinned per currency rather than left to the browser so the
// symbol is stable regardless of the viewer's machine ("$" not "US$"), and so
// it matches the amounts the Go backend bakes into its prose strings.

export interface CurrencyDef {
  code: string;
  /**
   * Fallback symbol, used only if Intl is unavailable. The live symbol comes
   * from `currencySymbol()`. Mirrored in the Go backend
   * (internal/debt/engine.go) so its prose matches what the UI renders.
   */
  symbol: string;
  label: string;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: "USD", symbol: "$", label: "USD — US Dollar ($)" },
  { code: "CAD", symbol: "$", label: "CAD — Canadian Dollar ($)" },
  { code: "MYR", symbol: "RM", label: "MYR — Malaysian Ringgit (RM)" },
  { code: "SGD", symbol: "$", label: "SGD — Singapore Dollar (S$)" },
  { code: "AUD", symbol: "$", label: "AUD — Australian Dollar ($)" },
  { code: "EUR", symbol: "€", label: "EUR — Euro (€)" },
  { code: "GBP", symbol: "£", label: "GBP — British Pound (£)" },
  { code: "JPY", symbol: "¥", label: "JPY — Japanese Yen (¥)" },
  { code: "INR", symbol: "₹", label: "INR — Indian Rupee (₹)" },
];

export const DEFAULT_CURRENCY = "USD";

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currencyDef(code: string | undefined): CurrencyDef {
  return BY_CODE.get((code || "").toUpperCase()) || BY_CODE.get(DEFAULT_CURRENCY)!;
}

/** Options accepted by the money formatters. */
export interface MoneyOptions {
  /**
   * Show decimals even on whole numbers. Default false, which renders
   * "$700" rather than "$700.00" so headline figures stay scannable.
   */
  alwaysCents?: boolean;
  /** Force a specific number of decimals (e.g. 4 for per-kWh rates). */
  decimals?: number;
  /** Drop the currency symbol, keeping grouped digits only. */
  bare?: boolean;
}

/**
 * One locale is used for every currency, deliberately.
 *
 * Formatting EUR with de-DE yields "6.250 €" — symbol last, dots for
 * thousands. The Go planner writes "€6,250" into the prose it returns, and the
 * two sit side by side in the Debt Rescue panel. Pinning en-US keeps the
 * symbol first and the separators consistent for every currency, so the two
 * sources can't visibly disagree.
 */
const FORMAT_LOCALE = "en-US";

/** How many minor units a currency actually has (JPY has none). */
function naturalDigits(code: string): number {
  try {
    return (
      new Intl.NumberFormat(FORMAT_LOCALE, {
        style: "currency",
        currency: code,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/**
 * Format an amount in the given currency.
 *
 * Zero-decimal currencies are respected: `alwaysCents` on JPY yields "¥1,235",
 * not "¥1,234.50". An explicit `decimals` is always honoured, because per-unit
 * rates legitimately need sub-minor-unit precision in any currency.
 */
export function formatMoney(
  value: number,
  code: string | undefined,
  opts: MoneyOptions = {},
): string {
  const def = currencyDef(code);
  const v = Number.isFinite(value) ? value : 0;

  let min: number;
  let max: number;
  if (opts.decimals !== undefined) {
    min = max = opts.decimals;
  } else {
    const natural = naturalDigits(def.code);
    // Decide "does this need cents?" from the ROUNDED value, not the raw one.
    // 99999.995 is not an integer, but it rounds to 100000 — and the Go
    // planner drops the trailing ".00", so judging the raw value here would
    // print "$100,000.00" beside the backend's "$100,000".
    const pow = Math.pow(10, natural);
    const rounded = Math.round(v * pow) / pow;
    const wanted = opts.alwaysCents || !Number.isInteger(rounded) ? 2 : 0;
    min = max = Math.min(wanted, natural);
  }

  try {
    return new Intl.NumberFormat(FORMAT_LOCALE, {
      style: opts.bare ? "decimal" : "currency",
      currency: def.code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(v);
  } catch {
    // An unsupported currency code should never blank out a financial page.
    return `${opts.bare ? "" : def.symbol}${v.toFixed(max)}`;
  }
}

/**
 * Just the symbol, for input adornments and unit suffixes like "$/kWh".
 *
 * Derived from the same formatter that renders the amounts, so the adornment
 * can never drift from the figure beside it — Intl renders SGD as "$" under
 * narrowSymbol, and a hand-kept "S$" here would contradict it.
 */
export function currencySymbol(code: string | undefined): string {
  const def = currencyDef(code);
  try {
    const part = new Intl.NumberFormat(FORMAT_LOCALE, {
      style: "currency",
      currency: def.code,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value || def.symbol;
  } catch {
    return def.symbol;
  }
}
