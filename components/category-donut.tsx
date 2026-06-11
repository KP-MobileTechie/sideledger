"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";

type CategoryDonutProps = {
  data: { category: string; amountCents: number }[];
  currency: string;
};

const PALETTE = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function CategoryDonut({ data, currency }: CategoryDonutProps) {
  const total = data.reduce((sum, d) => sum + d.amountCents, 0);
  const hasData = data.length > 0 && total > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses by category</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="amountCents"
                nameKey="category"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.category}
                    fill={PALETTE[index % PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const cents = Number(value);
                  const pct = total > 0 ? (cents / total) * 100 : 0;
                  return [
                    `${formatCents(cents, currency)} (${pct.toFixed(1)}%)`,
                    name,
                  ];
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            No expenses yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CategoryDonut;
