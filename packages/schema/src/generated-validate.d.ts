// Hand-written declaration for the ajv-standalone-generated `generated-validate.js`
// (see scripts/generate-validator.mjs — that file is generated, this one is not).
// Matches the shape ajv's own `ajv.compile()` return value has: a validate
// function with an `errors` property ajv attaches after a failed call.
import type { ErrorObject } from "ajv";
import type { ComicStripDocument } from "./types.js";

declare function validate(data: unknown): data is ComicStripDocument;
declare namespace validate {
	let errors: ErrorObject[] | null | undefined;
}
export default validate;
