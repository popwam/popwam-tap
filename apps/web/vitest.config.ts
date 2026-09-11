import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// API route tests use the same source alias as Next/TypeScript.
export default defineConfig({ resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } } });
