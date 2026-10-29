import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "./dashboard";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { publicErrorMessage } from "@/lib/errors";
import { getCachedSummary } from "@/lib/summary";
import type { Summary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(token))) redirect("/login");

  let initial: Summary | null = null;
  let initialError: string | null = null;
  try {
    initial = await getCachedSummary();
  } catch (error) {
    initialError = publicErrorMessage(error);
  }

  return <Dashboard initial={initial} initialError={initialError} />;
}
