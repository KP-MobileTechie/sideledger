"use client";

import * as React from "react";
import { useTransition } from "react";
import { Settings } from "lucide-react";

import { updateSettingsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR"] as const;

type SettingsDialogProps = {
  taxSetAsidePercent: number;
  currency: string;
};

export function SettingsDialog({
  taxSetAsidePercent,
  currency,
}: SettingsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [percent, setPercent] = React.useState(String(taxSetAsidePercent));
  const [selectedCurrency, setSelectedCurrency] = React.useState(currency);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    if (open) {
      setError(null);
      setPercent(String(taxSetAsidePercent));
      setSelectedCurrency(currency);
    }
  }, [open, taxSetAsidePercent, currency]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("taxSetAsidePercent", percent);
    fd.set("currency", selectedCurrency);

    startTransition(async () => {
      const res = await updateSettingsAction(fd);
      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Settings">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="settings-tax-percent">Tax set-aside %</Label>
            <Input
              id="settings-tax-percent"
              type="number"
              min={0}
              max={100}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="settings-currency">Currency</Label>
            <Select
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
            >
              <SelectTrigger id="settings-currency" className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            Set-aside is a simple estimate, not tax advice.
          </p>

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
