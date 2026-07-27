export type ReadinessIssue = { level: "BLOCKER" | "WARNING"; message: string };
export function derivePlatformReadiness(input: { defaultValid: boolean; enabledCountries: number; localeLegal: Array<{ code: string; ready: boolean }>; translationWarnings: number }) {
  const issues: ReadinessIssue[] = [];
  if (!input.defaultValid) issues.push({ level: "BLOCKER", message: "No enabled, published default locale is configured." });
  if (!input.enabledCountries) issues.push({ level: "BLOCKER", message: "No phone authentication countries are enabled." });
  input.localeLegal.filter(locale => !locale.ready).forEach(locale => issues.push({ level: "BLOCKER", message: `${locale.code}: required published/effective Terms and Privacy are incomplete.` }));
  if (input.translationWarnings) issues.push({ level: "WARNING", message: `${input.translationWarnings} published locale translation value(s) fall back to English.` });
  return { ready: !issues.some(issue => issue.level === "BLOCKER"), issues };
}
