"use client";

import type { TxType } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

export type Txn = {
  id: number;
  type: TxType;
  amountCents: number;
  date: string;
  category: string;
  source: string | null;
  note: string | null;
};

export type TransactionTableProps = {
  transactions: Txn[];
  currency: string;
  onEdit: (t: Txn) => void;
  onDelete: (t: Txn) => void;
};

export function TransactionTable({
  transactions,
  currency,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="py-8 text-center text-muted-foreground"
            >
              No transactions this month. Add your first one.
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((t) => {
            const isIncome = t.type === "income";
            const sign = isIncome ? "+" : "−";
            return (
              <TableRow key={t.id}>
                <TableCell className="tabular-nums whitespace-nowrap">
                  {t.date}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={isIncome ? "default" : "outline"}
                    className={
                      isIncome
                        ? "bg-emerald-600 text-white"
                        : "text-muted-foreground"
                    }
                  >
                    {isIncome ? "Income" : "Expense"}
                  </Badge>
                </TableCell>
                <TableCell>{t.category}</TableCell>
                <TableCell className="text-muted-foreground">
                  {t.source ?? "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums whitespace-nowrap",
                    isIncome ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {sign}
                  {formatCents(t.amountCents, currency)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(t)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-600"
                      onClick={() => onDelete(t)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
