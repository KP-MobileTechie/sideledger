import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

export type SummaryCardsProps = {
  netProfitCents: number;
  incomeCents: number;
  expenseCents: number;
  taxSetAsideCents: number;
  currency: string;
};

export function SummaryCards({
  netProfitCents,
  incomeCents,
  expenseCents,
  taxSetAsideCents,
  currency,
}: SummaryCardsProps) {
  const netProfitClass =
    netProfitCents >= 0 ? "text-emerald-600" : "text-red-600";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Net Profit"
        value={formatCents(netProfitCents, currency)}
        valueClassName={netProfitClass}
      />
      <SummaryCard
        label="Income"
        value={formatCents(incomeCents, currency)}
        valueClassName="text-emerald-600"
      />
      <SummaryCard
        label="Expenses"
        value={formatCents(expenseCents, currency)}
        valueClassName="text-red-600"
      />
      <SummaryCard
        label="Set aside for taxes"
        value={formatCents(taxSetAsideCents, currency)}
        valueClassName="text-foreground"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            valueClassName,
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
