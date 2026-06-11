"use client";

import * as React from "react";
import { useTransition } from "react";

import { deleteTransactionAction } from "@/app/actions";
import { TransactionDialog } from "@/components/transaction-dialog";
import {
  TransactionTable,
  type Txn,
} from "@/components/transaction-table";
import { Button } from "@/components/ui/button";

type DashboardClientProps = {
  transactions: Txn[];
  currency: string;
  defaultDate: string;
};

export function DashboardClient({
  transactions,
  currency,
  defaultDate,
}: DashboardClientProps) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Txn | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(t: Txn) {
    if (!window.confirm("Delete this transaction?")) return;
    const fd = new FormData();
    fd.set("id", String(t.id));
    startTransition(async () => {
      await deleteTransactionAction(fd);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add transaction
        </Button>
      </div>

      <TransactionTable
        transactions={transactions}
        currency={currency}
        onEdit={(t) => {
          setEditing(t);
          setOpen(true);
        }}
        onDelete={(t) => handleDelete(t)}
      />

      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        defaultDate={defaultDate}
      />
    </div>
  );
}
