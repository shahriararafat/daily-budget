"use client";

import { useEffect, useState } from "react";
import { formatShortDate, formatTaka, formatWeekday } from "@/lib/format";
import type { Summary, Transaction } from "@/lib/types";

export function Dashboard({ initial, initialError }: { initial: Summary | null; initialError: string | null }) {
  const [summary, setSummary] = useState(initial);
  const [error, setError] = useState(initialError);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let pending = false;

    async function refresh() {
      if (!active || pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await fetch("/api/summary", { cache: "no-store" });
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        const body: unknown = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok || !isSummary(body)) {
          setError(response.ok ? "Could not load spending" : messageFrom(body));
          return;
        }
        setSummary(body);
        setError(null);
      } catch {
        if (active) setError("Could not load spending");
      } finally {
        pending = false;
      }
    }

    function onFocus() {
      void refresh();
    }

    setNow(Date.now());
    void refresh();
    const poll = window.setInterval(() => void refresh(), 15_000);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      active = false;
      window.clearInterval(poll);
      window.clearInterval(clock);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  async function lock() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 -mx-5 flex items-start justify-between gap-3 bg-paper/95 px-5 py-4 backdrop-blur">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">Daily budget</p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="font-display text-[1.7rem] leading-none tracking-tight">Spending</h1>
            {summary?.source === "fixture" ? (
              <span className="rounded-full bg-good/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-good">
                Sample
              </span>
            ) : null}
          </div>
        </div>
        <div className="pt-1 text-right">
          <p className="text-xs text-ink/50" aria-live="polite">
            {summary ? ageLabel(summary.generatedAt, now) : ""}
          </p>
          <button type="button" onClick={() => void lock()} className="mt-1 px-1 py-1 text-xs font-medium text-ink/70">
            Lock
          </button>
        </div>
      </header>

      {error && summary ? <p className="mb-3 rounded-2xl bg-over/10 px-3 py-2 text-sm text-over">{error}</p> : null}

      {summary ? (
        <>
          <TodayCard summary={summary} />
          <MonthCard summary={summary} />
          <Categories summary={summary} />
          <Recent summary={summary} />
        </>
      ) : (
        <p className="py-16 text-center text-sm text-ink/60">{error ?? "Loading spending…"}</p>
      )}
    </main>
  );
}

function TodayCard({ summary }: { summary: Summary }) {
  const planned = summary.today.planned;
  const remaining = summary.today.remaining;
  const over = remaining !== null && remaining < 0;

  return (
    <section className="rounded-[28px] border border-line bg-card px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink/60">Today</p>
        <p className="text-sm text-ink/60">{formatWeekday(summary.today.date)}</p>
      </div>
      <p className="mt-3 font-display text-5xl leading-none tracking-tight tabular-nums">
        {formatTaka(summary.today.spend)}
      </p>
      <p className="mt-2 text-sm text-ink/60">spent</p>
      {planned === null ? (
        <p className="mt-4 text-sm text-ink/60">No planned budget for this day</p>
      ) : (
        <>
          <p className={`mt-4 text-sm font-medium ${over ? "text-over" : "text-good"}`}>
            {over
              ? `${formatTaka(Math.abs(remaining ?? 0))} over ${formatTaka(planned)}`
              : `${formatTaka(remaining ?? 0)} left of ${formatTaka(planned)}`}
          </p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-line"
            role="meter"
            aria-label="Today's spend against the daily budget"
            aria-valuemin={0}
            aria-valuenow={summary.today.spend}
            aria-valuemax={Math.max(planned, summary.today.spend, 0)}
          >
            <div
              className={`h-full rounded-full ${over ? "bg-over" : "bg-good"}`}
              style={{ width: `${spentRatio(summary.today.spend, planned) * 100}%` }}
            />
          </div>
        </>
      )}
    </section>
  );
}

function MonthCard({ summary }: { summary: Summary }) {
  return (
    <section className="mt-3 rounded-[28px] border border-line bg-card px-5 py-5">
      <p className="text-sm text-ink/60">{summary.month.label}</p>
      <p className="mt-3 font-display text-4xl leading-none tracking-tight tabular-nums">
        {formatTaka(summary.month.spend)}
      </p>
      <p className="mt-2 text-sm text-ink/60">spent this month</p>
      <p className="mt-4 text-sm font-medium text-good tabular-nums">{formatTaka(summary.month.income)} income</p>
    </section>
  );
}

function Categories({ summary }: { summary: Summary }) {
  const max = summary.categories.reduce((highest, category) => Math.max(highest, category.amount), 0);
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-ink/60">By category</h2>
      {summary.categories.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">No expenses this month.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {summary.categories.map((category) => (
            <li key={category.category}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="capitalize">{category.category}</span>
                <span className="tabular-nums">{formatTaka(category.amount)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-good"
                  style={{ width: `${max > 0 ? Math.max(0, (category.amount / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Recent({ summary }: { summary: Summary }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-ink/60">Recent</h2>
      {summary.recent.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">No transactions yet.</p>
      ) : (
        <ul className="mt-2">
          {summary.recent.map((transaction, index) => (
            <RecentRow key={`${transaction.date}-${transaction.id}-${index}`} transaction={transaction} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentRow({ transaction }: { transaction: Transaction }) {
  const income = transaction.type === "income";
  return (
    <li className={`flex items-start justify-between gap-3 rounded-2xl px-3 py-2.5 ${income ? "bg-good/10" : ""}`}>
      <div className="min-w-0">
        <p className="truncate text-sm">
          <span className="capitalize">{transaction.category}</span>
          {transaction.note ? <span className="text-ink/60"> · {transaction.note}</span> : null}
        </p>
        <p className="text-xs text-ink/50">{formatShortDate(transaction.date)}</p>
      </div>
      <p className={`shrink-0 text-sm tabular-nums ${income ? "font-semibold text-good" : "text-ink"}`}>
        {income ? `+${formatTaka(transaction.amount)}` : formatTaka(-Math.abs(transaction.amount))}
        {transaction.currency !== "BDT" ? <span className="ml-1 text-xs font-normal text-ink/50">{transaction.currency}</span> : null}
      </p>
    </li>
  );
}

function spentRatio(spend: number, planned: number): number {
  if (planned <= 0) return spend > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, spend / planned));
}

function ageLabel(generatedAt: string, now: number | null): string {
  if (now === null) return "Updated just now";
  const then = Date.parse(generatedAt);
  if (Number.isNaN(then)) return "Updated just now";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 5) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  return `Updated ${Math.floor(minutes / 60)}h ago`;
}

function isSummary(body: unknown): body is Summary {
  if (!body || typeof body !== "object") return false;
  return "today" in body && "month" in body && "categories" in body && "recent" in body;
}

function messageFrom(body: unknown): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  return "Could not load spending";
}
