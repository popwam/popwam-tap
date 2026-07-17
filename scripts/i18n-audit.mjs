import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const flatten = (value, prefix = "", out = {}) => {
  for (const [key, child] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child, name, out);
    else out[name] = child;
  }
  return out;
};
const suspicious = text => /\uFFFD|(?:Ã.|Â.|Ø.|Ù.|â€)/u.test(text);
const xmlStrings = text => new Map([...text.matchAll(/<string\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/string>/g)].map(match => [match[1], match[2]]));

const ar = flatten(JSON.parse(read("apps/web/locales/ar.json")));
const en = flatten(JSON.parse(read("apps/web/locales/en.json")));
const missing = Object.keys(en).filter(key => !(key in ar));
const extra = Object.keys(ar).filter(key => !(key in en));
const malformed = [...Object.entries(ar), ...Object.entries(en)].filter(([, value]) => typeof value === "string" && suspicious(value)).map(([key]) => key);

const androidEn = xmlStrings(read("apps/android/app/src/main/res/values/strings.xml"));
const androidAr = xmlStrings(read("apps/android/app/src/main/res/values-ar/strings.xml"));
const androidMissing = [...androidEn.keys()].filter(key => !androidAr.has(key));
const androidExtra = [...androidAr.keys()].filter(key => !androidEn.has(key));
const androidMalformed = [...androidEn, ...androidAr].filter(([, value]) => suspicious(value)).map(([key]) => key);

const sourceFiles = [
  "apps/web/src/app/page.tsx", "apps/web/src/app/login/page.tsx", "apps/web/src/app/login/phone/page.tsx",
  "apps/web/src/app/(admin-auth)/admin/login/page.tsx", "apps/web/src/app/activate/page.tsx", "apps/web/src/app/download/page.tsx",
  "apps/web/src/components/login-form.tsx", "apps/web/src/components/admin-login-form.tsx", "apps/web/src/components/otp-form.tsx",
];
const hardcoded = [];
for (const file of sourceFiles) {
  const source = read(file);
  for (const match of source.matchAll(/>([^<{]*[A-Za-z\u0600-\u06ff][^<{]*)</gu)) {
    const value = match[1].trim();
    const codeLike = /[={}();]|=>/.test(value);
    const productOrTechnical = /^(?:POP|by POPWAM|POP BY POPWAM|POP by POPWAM(?: · 0\.0\.12)?|POPWAM(?: Tap)?|Tap|Admin Portal|ANDROID(?: APP)?|NFC READY|NFC • QR • Profiles|Android • Secure • Fast|SHA-256|PW •+ \d+|\d+ — NFC \+ QR|Mamdouh)$/i.test(value);
    if (value && !codeLike && !productOrTechnical) hardcoded.push(`${file}: ${value.slice(0, 70)}`);
  }
}

const allSource = fs.readdirSync(path.join(root, "apps/web/src"), { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
  .map(entry => read(path.relative(root, path.join(entry.parentPath || entry.path, entry.name))))
  .join("\n");
const unused = Object.keys(en).filter(key => {
  const parent = key.split(".")[0];
  const leaf = key.split(".").at(-1);
  return !allSource.includes(key) && !allSource.includes(`.${parent}`) && !allSource.includes(`.${leaf}`) && !allSource.includes(`["${leaf}"]`);
});

const errors = [
  ...missing.map(key => `Missing Arabic web key: ${key}`), ...extra.map(key => `Extra Arabic web key: ${key}`),
  ...malformed.map(key => `Possible web mojibake: ${key}`), ...androidMissing.map(key => `Missing Arabic Android key: ${key}`),
  ...androidExtra.map(key => `Extra Arabic Android key: ${key}`), ...androidMalformed.map(key => `Possible Android mojibake: ${key}`),
];

for (const error of errors) console.error(`ERROR ${error}`);
for (const item of hardcoded) console.warn(`WARN possible hardcoded primary UI: ${item}`);
for (const key of unused) console.warn(`WARN possibly unused key: ${key}`);
console.log(`i18n audit: ${Object.keys(en).length} web keys, ${androidEn.size} Android keys, ${hardcoded.length} hardcoded candidates, ${unused.length} unused candidates.`);
if (errors.length) process.exitCode = 1;
