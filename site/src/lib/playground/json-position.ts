/**
 * Map a JSON-pointer instance path (ajv's `/panels/0/camera`) to a line number
 * in the editor's text, so validation errors land on the right line. Walks
 * `@codemirror/lang-json`'s own parse tree by pointer segment rather than
 * re-scanning the text by hand.
 */
import { jsonLanguage } from "@codemirror/lang-json";
import type { SyntaxNode } from "@lezer/common";

export function lineForPath(text: string, instancePath: string): number | null {
  const want = instancePath.split("/").slice(1).map(decodeSegment);
  if (want.length === 0) return 1;

  let node: SyntaxNode | null = jsonLanguage.parser.parse(text).topNode.firstChild;
  for (const segment of want) {
    if (!node) return null;
    if (node.type.name === "Object") {
      const prop = node.getChildren("Property").find((p) => propertyName(text, p) === segment);
      node = prop?.lastChild ?? null;
    } else if (node.type.name === "Array") {
      node = arrayItems(node)[Number(segment)] ?? null;
    } else {
      return null;
    }
  }
  return node ? text.slice(0, node.from).split("\n").length : null;
}

function propertyName(text: string, property: SyntaxNode): string | null {
  const name = property.getChild("PropertyName");
  if (!name) return null;
  try {
    return JSON.parse(text.slice(name.from, name.to));
  } catch {
    return null;
  }
}

/** `Array`'s children interleave `[`/`,`/`]` tokens with the value nodes. */
function arrayItems(array: SyntaxNode): SyntaxNode[] {
  const items: SyntaxNode[] = [];
  for (let child = array.firstChild; child; child = child.nextSibling) {
    if (!["[", "]", ","].includes(child.type.name)) items.push(child);
  }
  return items;
}

function decodeSegment(s: string): string {
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}
