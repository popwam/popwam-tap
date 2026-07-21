import {describe,expect,it} from "vitest";
import {decryptSecret,encryptSecret} from "./token-vault";
describe("integration token vault",()=>{it("encrypts tokens at rest",()=>{process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY="test-key-with-enough-entropy-for-tests";const encrypted=encryptSecret("secret-token");expect(encrypted.toString()).not.toContain("secret-token");expect(decryptSecret(encrypted)).toBe("secret-token")})})
