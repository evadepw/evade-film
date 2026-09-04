import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests only, and deliberately so: what is covered here is the pure logic
 * the type system cannot check — class-merge conflicts, rating arithmetic,
 * structured-data shape. Rendering and routing stay out, so the suite needs no
 * DOM and runs in well under a second.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
