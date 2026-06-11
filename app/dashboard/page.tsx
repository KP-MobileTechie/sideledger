import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getMonthlyTotals,
  getSettings,
  getTransactionsForMonth,
} from "@/lib/db/queries";
import {
  categoryBreakdown,
  netProfit,
  taxSetAside,
  totals,
} from "@/lib/finance";
import { SummaryCards } from "@/components/summary-cards";
import { IncomeExpenseChart } from "@/components/income-expense-chart";
import { CategoryDonut } from "@/components/category-donut";
import { MonthSelector } from "@/components/month-selector";
import { DashboardClient } from "@/components/dashboard-client";
import type { Txn } from "@/components/transaction-table";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  const now = new Date();
  const currentMonth =
    month && MONTH_RE.test(month)
      ? month
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultDate = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const userId = await requireUserId();

  const settings = await getSettings(db, userId);
  const txRows = await getTransactionsForMonth(db, userId, currentMonth);
  const monthly = await getMonthlyTotals(db, userId, 6, currentMonth);

  const txns: Txn[] = txRows.map((t) => ({
    id: t.id,
    type: t.type,
    amountCents: t.amountCents,
    date: t.date,
    category: t.category,
    source: t.source,
    note: t.note,
  }));

  const { income, expense } = totals(txRows);
  const net = netProfit(txRows);
  const tax = taxSetAside(txRows, settings.taxSetAsidePercent);
  const expenseByCat = categoryBreakdown(txRows, "expense");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            side
            <span className="text-emerald-600 dark:text-emerald-500">
              ledger
            </span>
          </h1>
          <MonthSelector month={currentMonth} />
        </header>

        <section className="mt-6">
          <SummaryCards
            netProfitCents={net}
            incomeCents={income}
            expenseCents={expense}
            taxSetAsideCents={tax}
            currency={settings.currency}
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IncomeExpenseChart data={monthly} currency={settings.currency} />
          <CategoryDonut data={expenseByCat} currency={settings.currency} />
        </section>

        <section className="mt-6">
          <DashboardClient
            transactions={txns}
            currency={settings.currency}
            defaultDate={defaultDate}
          />
        </section>
      </div>
    </main>
  );
}
