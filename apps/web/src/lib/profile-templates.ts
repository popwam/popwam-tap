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
  const config = configuration as Record<string, unknown>;
  const pick=(key:string,allowed:string[],fallback:string)=>typeof config[key]==="string"&&allowed.includes(config[key] as string)?config[key] as string:fallback;
  const layout=pick("linkLayout",["grid","compact","list"],"list");
  const avatar=pick("avatarPosition",["start","center","end"],"start");
  const header=pick("headerAlign",["start","center","end"],"start");
  const cover=pick("coverStyle",["full","inset","banner","minimal"],"full");
  const contacts=pick("contactLayout",["grid","row","list"],"grid");
  const desktop=pick("desktopLayout",["narrow","wide","split"],"narrow");
  return `template-${layout} template-avatar-${avatar} template-header-${header} template-cover-${cover} template-contacts-${contacts} template-desktop-${desktop}`;
}
