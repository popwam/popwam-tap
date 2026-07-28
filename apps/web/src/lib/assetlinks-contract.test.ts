import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Android Digital Asset Links", () => {
  const statements = JSON.parse(readFileSync("public/.well-known/assetlinks.json", "utf8")) as Array<{
    relation: string[];
    target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
  }>;

  it("declares App Links and login credentials for the current physical debug package and certificate", () => {
    expect(statements).toEqual([
      {
        relation: [
          "delegate_permission/common.handle_all_urls",
          "delegate_permission/common.get_login_creds",
        ],
        target: {
          namespace: "android_app",
          package_name: "com.popwam.pop.debug",
          sha256_cert_fingerprints: [
            "DB:02:C1:E8:0A:FE:AD:CD:E0:A0:F5:7E:4B:2B:9D:F2:85:89:77:92:29:BB:BF:1B:16:12:7E:81:14:1C:E5:30",
          ],
        },
      },
    ]);
  });

  it("has an explicit JSON response header and no middleware auth rule", () => {
    const nextConfig = readFileSync("next.config.ts", "utf8");
    const middleware = readFileSync("src/middleware.ts", "utf8");
    expect(nextConfig).toContain('source: "/.well-known/assetlinks.json"');
    expect(nextConfig).toContain('"Content-Type", value: "application/json; charset=utf-8"');
    expect(middleware).not.toMatch(/well-known[\s\S]{0,120}(?:getToken|login)/);
  });
});
