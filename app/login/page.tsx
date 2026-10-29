"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        setError(messageFrom(body) ?? "Wrong passcode");
        setPending(false);
        return;
      }
      window.location.assign("/");
    } catch {
      setError("Could not sign in");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">Daily budget</p>
      <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight">Enter the passcode</h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">Spending stays locked until you do.</p>
      <form onSubmit={onSubmit} className="mt-8">
        <label htmlFor="passcode" className="text-sm font-medium text-ink/80">
          Passcode
        </label>
        <input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="current-password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-line bg-card px-4 py-3 text-base outline-none ring-good/30 focus:ring-4"
        />
        {error ? <p className="mt-3 text-sm text-over">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || passcode.length === 0}
          className="mt-4 w-full rounded-2xl bg-good px-4 py-3 text-base font-medium text-white disabled:opacity-40"
        >
          {pending ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}

function messageFrom(body: unknown): string | null {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  return null;
}
