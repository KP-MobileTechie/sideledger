"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";

type IncomeExpenseChartProps = {
  data: { month: string; incomeCents: number; expenseCents: number }[];
  currency: string;
};

export function IncomeExpenseChart({ data, currency }: IncomeExpenseChartProps) {
  const hasData =
    data.length > 0 &&
    data.some((d) => d.incomeCents !== 0 || d.expenseCents !== 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                strokeOpacity={0.1}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                width={72}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number | string) =>
                  formatCents(Number(value), currency)
                }
              />
              <Tooltip
                formatter={(value) => formatCents(Number(value), currency)}
                cursor={{ fillOpacity: 0.06 }}
              />
              <Legend />
              <Bar
                dataKey="incomeCents"
                name="Income"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expenseCents"
                name="Expenses"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IncomeExpenseChart;
