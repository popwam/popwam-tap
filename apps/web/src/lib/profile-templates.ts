const COLOR = /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i;
const LENGTH = /^\d+(\.\d+)?(px|rem)$/;

export function templateCssVariables(configuration: unknown): Record<string, string> {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return {};
  const config = configuration as Record<string, unknown>;
  const result: Record<string, string> = {};
  const colors: Array<[string, string]> = [["background", "--profile-bg"], ["panel", "--profile-panel"], ["text", "--profile-text"], ["muted", "--profile-muted"], ["accent", "--profile-accent"]];
  for (const [key, variable] of colors) if (typeof config[key] === "string" && COLOR.test(config[key])) result[variable] = config[key];
  const lengths: Array<[string, string]> = [["radius", "--profile-radius"], ["itemRadius", "--item-radius"], ["buttonRadius", "--profile-button-radius"], ["spacing", "--template-spacing"]];
  for (const [key, variable] of lengths) if (typeof config[key] === "string" && LENGTH.test(config[key])) result[variable] = config[key];
  return result;
}

export function templateLayoutClass(configuration: unknown) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return "template-list";
  const layout = (configuration as Record<string, unknown>).linkLayout;
  return layout === "grid" ? "template-grid" : layout === "compact" ? "template-compact" : "template-list";
}
