// Precompiles the ComicStripDocument validator to plain JS (ajv's "standalone"
// mode) instead of shipping runtime schema compilation. Runtime `ajv.compile()`
// generates and executes code via `new Function(...)`, which needs
// `unsafe-eval` in a page's CSP — `danielkimdev-astro`'s deployed CSP has no
// `unsafe-eval`, so `<comic-strip>` hydration threw there (silently: an
// uncaught error inside `@toonstrip/astro`'s client renderer) while working
// fine in `astro dev`, which never sends a CSP header at all. See that repo's
// WORKLOG 2026-09-01 for the diagnosis.
//
// Writes to src/ (consumed directly by vitest/dev) and dist/ (consumed by
// published `.js`, and by downstream packages' own `tsc` builds — which is
// also why the hand-written `generated-validate.d.ts` gets copied alongside
// it: dist ships as the published package, and tsc never emits a `.d.ts` it
// didn't itself compile, so without this copy any consumer's type-check
// would fail to resolve validate.d.ts's import of it). `npm run build`'s
// prebuild hook calls this script before `tsc` runs.
//
// ajv's standalone output isn't fully self-contained: our schema's `minLength`
// keywords pull in a small runtime helper (`ajv/dist/runtime/ucs2length`),
// referenced via a bare CJS `require(...)` even with `code.esm: true` (a
// documented ajv limitation — https://ajv.js.org/standalone.html says to run
// the output through a bundler). A raw `require()` has no meaning in a real
// ESM module: Node's native ESM loader has no `require` in scope (this file
// declares `"type": "module"`), so importing it directly would throw
// `ReferenceError: require is not defined` outside of a bundler context, and
// bundler contexts vary in whether they special-case it. esbuild bundles it
// into one dependency-free ESM file, matching ajv's own recommendation.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import standaloneCode from "ajv/dist/standalone/index.js";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");
const schemaJson = JSON.parse(readFileSync(join(pkgRoot, "src/schema.json"), "utf-8"));

const ajv = new Ajv({ allErrors: true, strict: true, code: { source: true, esm: true } });
const validate = ajv.compile(schemaJson);
const generatedCode = standaloneCode(ajv, validate);

const result = await build({
	stdin: {
		contents: generatedCode,
		resolveDir: pkgRoot,
		sourcefile: "generated-validate-raw.js",
		loader: "js",
	},
	bundle: true,
	format: "esm",
	platform: "neutral",
	target: "es2022",
	write: false,
});
const moduleCode = result.outputFiles[0].text;

for (const outDir of [join(pkgRoot, "src"), join(pkgRoot, "dist")]) {
	mkdirSync(outDir, { recursive: true });
	writeFileSync(join(outDir, "generated-validate.js"), moduleCode);
	copyFileSync(join(pkgRoot, "src/generated-validate.d.ts"), join(outDir, "generated-validate.d.ts"));
}
