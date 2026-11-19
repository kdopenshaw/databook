export type CodexJobStatus = 'draft' | 'running' | 'needs_input' | 'done' | 'error';

export type CodexEventSummary = {
  sessionId?: string;
  lastMessage?: string;
  needsInput: boolean;
  error?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

function collectText(node: unknown, into: string[]): void {
  const rec = asRecord(node);
  if (!rec) return;
  const text = pickString(rec, ['text', 'message', 'content']);
  if (text) into.push(text);
  const item = rec.item;
  if (item) collectText(item, into);
  const payload = rec.payload;
  if (payload) collectText(payload, into);
}

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (
    /\b(please (choose|confirm|clarify|answer)|which (of|one)|i need (you )?to (confirm|choose|clarify)|waiting (on|for) (your )?(input|answer)|open (the )?session)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  const last = t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .at(-1);
  return Boolean(last && /\?\s*$/.test(last));
}

export function parseCodexJsonl(raw: string): CodexEventSummary {
  const summary: CodexEventSummary = { needsInput: false };
  const messages: string[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const rec = asRecord(parsed);
    if (!rec) continue;

    const type = typeof rec.type === 'string' ? rec.type : '';
    const session =
      pickString(rec, ['thread_id', 'session_id', 'threadId', 'sessionId']) ??
      pickString(asRecord(rec.payload) ?? {}, ['session_id', 'id', 'thread_id']);
    if (session) summary.sessionId = session;

    const item = asRecord(rec.item);
    const itemType = typeof item?.type === 'string' ? item.type : '';
    if (
      type.includes('error') ||
      itemType === 'error' ||
      type === 'turn.failed'
    ) {
      summary.error =
        pickString(rec, ['message', 'error']) ??
        pickString(item ?? {}, ['text', 'message']) ??
        summary.error;
    }

    if (
      itemType.includes('user_input') ||
      type.includes('user_input') ||
      type.includes('approval') ||
      itemType.includes('approval')
    ) {
      summary.needsInput = true;
    }

    if (itemType === 'agent_message' || type === 'agent_message' || type === 'item.completed') {
      collectText(rec, messages);
    }
  }

  const last = messages.filter((m) => m.trim()).at(-1);
  if (last) {
    summary.lastMessage = last.slice(0, 4000);
    if (looksLikeQuestion(last)) summary.needsInput = true;
  }
  return summary;
}

export function resolveJobStatus(opts: {
  running: boolean;
  exitCode: number | null;
  events: CodexEventSummary;
}): CodexJobStatus {
  if (opts.running) return opts.events.needsInput ? 'needs_input' : 'running';
  if (opts.events.needsInput) return 'needs_input';
  if (opts.exitCode !== 0 && opts.exitCode !== null) return 'error';
  if (opts.events.error && opts.exitCode !== 0) return 'error';
  if (opts.events.error && !opts.events.lastMessage) return 'error';
  return 'done';
}
