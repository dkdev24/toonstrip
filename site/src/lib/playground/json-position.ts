/**
 * Map a JSON-pointer instance path (ajv's `/panels/0/camera`) to a line number
 * in the editor's text, so validation errors land on the right line. A tiny
 * position-recording JSON scanner; the documents are small.
 */
export function lineForPath(text: string, instancePath: string): number | null {
  const want = instancePath.split("/").slice(1).map(decodeSegment);
  if (want.length === 0) return 1;
  let i = 0;
  let line = 1;
  const path: (string | number)[] = [];
  let found: number | null = null;

  const peek = () => text[i];
  const advance = () => {
    if (text[i] === "\n") line++;
    i++;
  };
  const skipWs = () => {
    while (i < text.length && /\s/.test(text[i])) advance();
  };
  const matches = () => want.length === path.length && want.every((w, k) => String(w) === String(path[k]));
  const readString = (): string => {
    let out = "";
    advance(); // opening quote
    while (i < text.length && text[i] !== '"') {
      if (text[i] === "\\") {
        advance();
        out += text[i];
      } else out += text[i];
      advance();
    }
    advance(); // closing quote
    return out;
  };
  const value = (): void => {
    if (found !== null) return;
    skipWs();
    if (matches()) {
      found = line;
      return;
    }
    const c = peek();
    if (c === "{") {
      advance();
      skipWs();
      while (peek() !== "}" && i < text.length) {
        skipWs();
        const key = readString();
        skipWs();
        advance(); // colon
        path.push(key);
        value();
        path.pop();
        if (found !== null) return;
        skipWs();
        if (peek() === ",") advance();
        skipWs();
      }
      advance();
    } else if (c === "[") {
      advance();
      skipWs();
      let index = 0;
      while (peek() !== "]" && i < text.length) {
        path.push(index++);
        value();
        path.pop();
        if (found !== null) return;
        skipWs();
        if (peek() === ",") advance();
        skipWs();
      }
      advance();
    } else if (c === '"') {
      readString();
    } else {
      while (i < text.length && !/[,\]}\s]/.test(text[i])) advance();
    }
  };
  try {
    value();
  } catch {
    return null;
  }
  return found;
}

function decodeSegment(s: string): string {
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}
