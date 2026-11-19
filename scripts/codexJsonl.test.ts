import { describe, expect, it } from 'vitest';
import { looksLikeQuestion, parseCodexJsonl, resolveJobStatus } from './codexJsonl';

describe('parseCodexJsonl', () => {
  it('extracts session id and last agent message', () => {
    const raw = [
      '{"type":"thread.started","thread_id":"abc-123"}',
      '{"type":"item.completed","item":{"type":"agent_message","text":"Chart added."}}',
    ].join('\n');
    const s = parseCodexJsonl(raw);
    expect(s.sessionId).toBe('abc-123');
    expect(s.lastMessage).toBe('Chart added.');
    expect(s.needsInput).toBe(false);
  });

  it('flags questions and user_input items', () => {
    const raw = [
      '{"type":"thread.started","thread_id":"s1"}',
      '{"type":"item.completed","item":{"type":"agent_message","text":"Which cafe should I filter to?"}}',
    ].join('\n');
    expect(parseCodexJsonl(raw).needsInput).toBe(true);
    expect(
      parseCodexJsonl('{"type":"item.started","item":{"type":"request_user_input"}}').needsInput,
    ).toBe(true);
  });
});

describe('looksLikeQuestion', () => {
  it('detects trailing question marks', () => {
    expect(looksLikeQuestion('Need a grain.\nUse tickets or days?')).toBe(true);
    expect(looksLikeQuestion('Done. Chart is live.')).toBe(false);
  });
});

describe('resolveJobStatus', () => {
  it('keeps running until the process exits', () => {
    expect(resolveJobStatus({ running: true, exitCode: null, events: { needsInput: false } })).toBe(
      'running',
    );
    expect(
      resolveJobStatus({
        running: false,
        exitCode: 0,
        events: { needsInput: true, lastMessage: 'Which?' },
      }),
    ).toBe('needs_input');
    expect(resolveJobStatus({ running: false, exitCode: 1, events: { needsInput: false } })).toBe(
      'error',
    );
    expect(resolveJobStatus({ running: false, exitCode: 0, events: { needsInput: false } })).toBe(
      'done',
    );
  });
});
