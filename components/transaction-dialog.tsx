"use client";

import * as React from "react";
import { useTransition } from "react";

import { addTransaction, editTransaction } from "@/app/actions";
import type { Txn } from "@/components/transaction-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, type TxType } from "@/lib/categories";

type TransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Txn | null;
  defaultDate: string;
};

export function TransactionDialog({
  open,
  onOpenChange,
  editing,
  defaultDate,
}: TransactionDialogProps) {
  const [type, setType] = React.useState<TxType>("expense");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(defaultDate);
  const [category, setCategory] = React.useState("");
  const [source, setSource] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setError(null);
    if (editing) {
      setType(editing.type);
      setAmount((editing.amountCents / 100).toFixed(2));
      setDate(editing.date);
      setCategory(editing.category);
      setSource(editing.source ?? "");
      setNote(editing.note ?? "");
    } else {
      setType("expense");
      setAmount("");
      setDate(defaultDate);
      setCategory("");
      setSource("");
      setNote("");
    }
  }, [editing, open, defaultDate]);

  function handleTypeChange(value: string) {
    const next = value as TxType;
    setType(next);
    setCategory("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("type", type);
    fd.set("amount", amount);
    fd.set("date", date);
    fd.set("category", category);
    fd.set("source", source);
    fd.set("note", note);
    if (editing) {
      fd.set("id", String(editing.id));
    }

    startTransition(async () => {
      const res = editing
        ? await editTransaction(fd)
        : await addTransaction(fd);
      if (res.ok) {
        onOpenChange(false);
      } else {
        setError(res.error);
      }
    });
  }

  const categories = CATEGORIES[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit transaction" : "Add transaction"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tx-type">Type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger id="tx-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-amount">Amount</Label>
            <Input
              id="tx-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-date">Date</Label>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="tx-category" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-source">Source</Label>
            <Input
              id="tx-source"
              placeholder="Optional"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-note">Note</Label>
            <Input
              id="tx-note"
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
