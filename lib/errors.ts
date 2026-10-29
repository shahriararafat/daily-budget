export function publicErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Something went wrong";
  if (/private[_ ]key|BEGIN [A-Z ]*KEY|Bearer |DECODER routines|error:1E/i.test(raw)) {
    return "Could not authenticate to Google Sheets";
  }
  return raw.slice(0, 240);
}
