import { redirect } from "next/navigation";

import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const features = [
  "See your real net profit",
  "Know how much to set aside for taxes",
  "Track every month with clear charts",
];

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          side<span className="text-emerald-600 dark:text-emerald-500">ledger</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Free income &amp; expense tracking for freelancers and side-hustlers.
        </p>

        <ul className="mx-auto mt-8 flex max-w-sm flex-col gap-3 text-left">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-1 inline-block size-2 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-500"
              />
              <span className="text-sm text-foreground/90">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-3">
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/dashboard" });
            }}
          >
            <Button
              type="submit"
              size="lg"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-500 dark:hover:bg-emerald-500/90"
            >
              Sign in with GitHub
            </Button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" size="lg" variant="outline" className="w-full">
              Sign in with Google
            </Button>
          </form>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Set-aside figures are estimates, not tax advice.
        </p>
      </div>
    </main>
  );
}
