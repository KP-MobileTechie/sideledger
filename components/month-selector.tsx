"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type MonthSelectorProps = { month: string };

function shiftMonth(month: string, delta: number): string {
  const [yearStr, monthStr] = month.split("-");
  let year = Number(yearStr);
  // monthStr is 1-12; convert to 0-based index
  let index = Number(monthStr) - 1 + delta;
  year += Math.floor(index / 12);
  index = ((index % 12) + 12) % 12;
  return `${year}-${String(index + 1).padStart(2, "0")}`;
}

export function MonthSelector({ month }: MonthSelectorProps) {
  const router = useRouter();

  const [yearStr, monthStr] = month.split("-");
  const monthIndex = Number(monthStr) - 1;
  const label = `${MONTH_NAMES[monthIndex] ?? ""} ${yearStr}`;

  function go(delta: number) {
    const target = shiftMonth(month, delta);
    router.push(`/dashboard?month=${target}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Previous month"
        onClick={() => go(-1)}
      >
        ‹
      </Button>
      <span className="min-w-32 text-center text-sm font-medium tabular-nums">
        {label}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Next month"
        onClick={() => go(1)}
      >
        ›
      </Button>
    </div>
  );
}
