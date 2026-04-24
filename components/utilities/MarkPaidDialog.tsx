"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { useMarkPaid } from "@/lib/bills";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: number;
  totalAmount: number;
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function MarkPaidDialog({ open, onOpenChange, billId, totalAmount }: Props) {
  const [amount, setAmount] = useState<number>(totalAmount);
  const [paidDate, setPaidDate] = useState<string>(todayIso());
  const mp = useMarkPaid();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setAmount(totalAmount);
      setPaidDate(todayIso());
    }
  }, [open, totalAmount]);

  async function submit() {
    try {
      await mp.mutateAsync({ id: billId, paid_amount: amount, paid_date: paidDate });
      toast({ title: "Marked paid", description: `Recorded $${amount.toFixed(2)} on ${paidDate}.` });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Couldn't record payment",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px] border-white/10 bg-neutral-950 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold tracking-tight">Mark bill paid</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Enter the amount paid. Partial payments are supported.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mp-amount" className="text-xs text-neutral-400">Amount</Label>
            <Input
              id="mp-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number.parseFloat(e.target.value) || 0)}
              className="rounded-xl bg-white/5 border-white/10 text-white tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-date" className="text-xs text-neutral-400">Paid on</Label>
            <Input
              id="mp-date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="rounded-xl bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={mp.isPending || amount <= 0}
            onClick={submit}
            className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
          >
            {mp.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Mark paid</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
