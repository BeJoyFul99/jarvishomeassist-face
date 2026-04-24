"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { useCreateProperty } from "@/lib/bills";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (propertyId: number) => void;
}

export function AddPropertyDialog({ open, onOpenChange, onCreated }: Props) {
  const create = useCreateProperty();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [provider, setProvider] = useState("");
  const [rateClass, setRateClass] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setAddress("");
      setAccountNumber("");
      setProvider("");
      setRateClass("");
    }
  }, [open]);

  async function submit() {
    if (!name.trim() || !address.trim()) return;
    try {
      const created = await create.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        account_number: accountNumber.trim() || undefined,
        provider: provider.trim() || undefined,
        rate_class: rateClass.trim() || undefined,
      });
      toast({ title: "Property added", description: created.name });
      onCreated?.(created.id);
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Couldn't add property",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px] border-white/10 bg-neutral-950 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold tracking-tight">Add property</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Service address that receives utility bills.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field id="ap-name" label="Name *" value={name} onChange={setName} placeholder="Home, Cottage…" />
          <Field id="ap-addr" label="Address *" value={address} onChange={setAddress} placeholder="123 Example Ave, City" />
          <Field id="ap-acct" label="Account number" value={accountNumber} onChange={setAccountNumber} placeholder="987654321" />
          <Field id="ap-prov" label="Provider" value={provider} onChange={setProvider} placeholder="powerstream" />
          <Field id="ap-rate" label="Rate class" value={rateClass} onChange={setRateClass} placeholder="Residential" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={create.isPending || !name.trim() || !address.trim()}
            onClick={submit}
            className="rounded-xl font-semibold bg-gradient-to-br from-[#5e5ce6] to-[#a5b4fc] text-black hover:opacity-90"
          >
            {create.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Saving…</> : "Add property"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-neutral-400">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl bg-white/5 border-white/10 text-white"
      />
    </div>
  );
}
