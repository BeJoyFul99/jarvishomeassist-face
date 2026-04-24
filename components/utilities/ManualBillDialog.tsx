"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { useManualCreateBill } from "@/lib/bills";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: number | null;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

export function ManualBillDialog({ open, onOpenChange, propertyId }: Props) {
  const router = useRouter();
  const create = useManualCreateBill();
  const { toast } = useToast();

  const [statementDate, setStatementDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [billType, setBillType] = useState("REGULAR");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [lateFees, setLateFees] = useState<number>(0);
  const [currency, setCurrency] = useState("CAD");

  useEffect(() => {
    if (open) {
      setStatementDate(todayIso());
      setDueDate("");
      setPeriodStart("");
      setPeriodEnd("");
      setBillType("REGULAR");
      setTotalAmount(0);
      setPreviousBalance(0);
      setLateFees(0);
      setCurrency("CAD");
    }
  }, [open]);

  async function submit() {
    if (!propertyId || totalAmount <= 0) return;
    try {
      const bill = await create.mutateAsync({
        property_id: propertyId,
        statement_date: statementDate || undefined,
        due_date: dueDate || undefined,
        billing_period_start: periodStart || undefined,
        billing_period_end: periodEnd || undefined,
        bill_type: billType || undefined,
        total_amount: totalAmount,
        previous_balance: previousBalance || undefined,
        late_fees: lateFees || undefined,
        currency: currency || undefined,
      });
      toast({ title: "Bill added", description: "Manual entry recorded." });
      onOpenChange(false);
      router.push(`/utilities/${bill.id}`);
    } catch (e) {
      toast({
        title: "Couldn't add bill",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  const disabled = !propertyId || totalAmount <= 0 || create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px] border-white/10 bg-neutral-950 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold tracking-tight">Manual bill entry</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Add a bill without uploading a PDF. Useful for historical backfill or lost originals.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <DateField id="mb-stmt" label="Statement date" value={statementDate} onChange={setStatementDate} />
          <DateField id="mb-due" label="Due date" value={dueDate} onChange={setDueDate} />
          <DateField id="mb-ps" label="Period start" value={periodStart} onChange={setPeriodStart} />
          <DateField id="mb-pe" label="Period end" value={periodEnd} onChange={setPeriodEnd} />

          <TextField id="mb-type" label="Bill type" value={billType} onChange={setBillType} placeholder="REGULAR" />
          <TextField id="mb-cur" label="Currency" value={currency} onChange={setCurrency} placeholder="CAD" />

          <NumberField id="mb-total" label="Total amount *" value={totalAmount} onChange={setTotalAmount} />
          <NumberField id="mb-prev" label="Previous balance" value={previousBalance} onChange={setPreviousBalance} />
          <NumberField id="mb-late" label="Late fees" value={lateFees} onChange={setLateFees} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={disabled}
            onClick={submit}
            className="rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {create.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Saving…</> : "Add bill"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void; }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-neutral-400">{label}</Label>
      <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl bg-white/5 border-white/10 text-white" />
    </div>
  );
}

function TextField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-neutral-400">{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rounded-xl bg-white/5 border-white/10 text-white" />
    </div>
  );
}

function NumberField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void; }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-neutral-400">{label}</Label>
      <Input id={id} type="number" step="0.01" value={value} onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)} className="rounded-xl bg-white/5 border-white/10 text-white tabular-nums" />
    </div>
  );
}
