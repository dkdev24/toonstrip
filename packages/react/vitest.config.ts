import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The only package in the workspace whose tests use JSX — the plugin is
// what gives vitest's esbuild transform a jsx-automatic runtime for .tsx
// test files, independent of whether tsconfig's "include" happens to cover
// the test directory.
export default defineConfig({
  plugins: [react()],
});
