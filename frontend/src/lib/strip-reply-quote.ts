/**
 * Returns only the "new" part of an email body for thread view, without the
 * quoted history (since earlier messages are shown as separate cards).
 * Heuristic - matches common English/Danish/German/Outlook reply headers.
 *
 * Gmail often wraps the address so "Den ... skrev ... <mail" is one line and ">:" the next.
 *
 * Signatures are often placed *below* the '>'-quoted block; those lines are kept and
 * appended after the text above the reply header.
 */
export function stripReplyQuote(body: string): string {
  if (!body?.trim()) return body;

  const text = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const patterns: RegExp[] = [
    // Danish (Gmail wrap): "Den ... skrev ... <" then wrapped email ">:" on next line(s)
    /\n\s*Den [^\n]+<\s*\n[^\n]*>:\s*\n/i,
    // Danish (Gmail wrap): line "Den ... skrev ... <...>" then next line ">:" (optional spaces)
    /\n\s*Den [^\n]+\n\s*>\s*:\s*\n/i,
    // Danish single line: "Den ... skrev ...:"
    /\n\s*Den .+ skrev .+:\s*\n/i,
    // English (Gmail wrap): "On ... wrote" with wrapped address
    /\nOn [^\n]+<\s*\n[^\n]*>:\s*\n/i,
    // English: "On ... wrote:" (single line; multiline variants below)
    /\nOn .+ wrote:\s*\n/i,
    // German / French
    /\nAm .+ schrieb .+:\s*\n/i,
    /\nLe .+ a écrit\s*:\s*\n/i,
    /\nLe .+ a écrit :\s*\n/i,
    // Outlook / generic
    /\n-{3,}\s*Original Message\s*-{3,}\s*\n/i,
    /\n-{2,}\s*Forwarded message\s*-{2,}\s*\n/i,
    /\n_{32,}\s*\n/,
  ];

  let best: { index: number; len: number } | null = null;
  for (const re of patterns) {
    const m = re.exec(text);
    if (!m || m.index === undefined) continue;
    if (!best || m.index < best.index) {
      best = { index: m.index, len: m[0].length };
    }
  }

  if (!best) {
    return text.trim();
  }

  const prefix = text.slice(0, best.index).trimEnd();
  const afterHeader = text.slice(best.index + best.len);
  const suffix = trailingUnquotedAfterLastGtBlock(afterHeader);

  if (suffix) {
    return [prefix, suffix].filter(Boolean).join('\n\n').trimEnd();
  }
  return prefix;
}

/** Lines after the last '>'-quoted line are treated as the sender's trailing signature. */
function trailingUnquotedAfterLastGtBlock(afterQuoteHeader: string): string {
  const lines = afterQuoteHeader.split('\n');
  let lastQuotedIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*>/.test(lines[i])) {
      lastQuotedIdx = i;
    }
  }
  if (lastQuotedIdx === -1) {
    return '';
  }
  return lines.slice(lastQuotedIdx + 1).join('\n').replace(/^\n+/, '').trimEnd();
}
