export interface ProgramItem {
  time: string | null;
  text: string;
}

export interface ProgramBlock {
  day: string | null;
  items: ProgramItem[];
}

const DAY = /^((?:Viernes \d+|S[áa]bado \d+|Domingo \d+)(?: y (?:s[áa]bado|domingo) \d+)?)\.?\s*(.*)$/i;
const TIME =
  /^((?:De |Desde |A las |A partir de las )?\d{1,2}(?:[:.]\d{2})?(?:\s*h)?(?:(?:\s*(?:,|y|a|–|-)\s*(?:las\s*)?\d{1,2}(?:[:.]\d{2})?(?:\s*h)?)+)?(?:\s*h(?:oras)?)?)\s*[.:]\s+(.+)$/i;

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Turns the guide's free-form program lines into day blocks with optional time labels. */
export function parseProgram(lines: string[]): ProgramBlock[] {
  const blocks: ProgramBlock[] = [];
  let current: ProgramBlock = { day: null, items: [] };
  const push = (text: string) => {
    const m = text.match(TIME);
    if (m) current.items.push({ time: m[1]!.replace(/^A las /i, "").replace(/\s+/g, " ").trim(), text: capitalize(m[2]!) });
    else current.items.push({ time: null, text });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const d = line.match(DAY);
    if (d) {
      if (current.day || current.items.length) blocks.push(current);
      current = { day: capitalize(d[1]!), items: [] };
      if (d[2]) push(d[2]);
      continue;
    }
    push(line);
  }
  if (current.day || current.items.length) blocks.push(current);

  // Collapse exact duplicate lines the PDF sometimes repeats.
  for (const b of blocks) {
    const seen = new Set<string>();
    b.items = b.items.filter((i) => {
      const k = `${i.time}|${i.text}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  return blocks;
}
