import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { parseCodexJsonl, resolveJobStatus, type CodexJobStatus } from './codexJsonl';

type Job = {
  id: string;
  prompt: string;
  model: string;
  effort: string;
  tabId: string;
  rowId: string;
  startedAt: string;
  finishedAt?: string;
  sessionId?: string;
  lastMessage?: string;
  error?: string;
  needsInput: boolean;
  exitCode: number | null;
  log: string;
  child?: ChildProcessWithoutNullStreams;
};

const jobs = new Map<string, Job>();

const FALLBACK_MODELS = [
  { slug: 'gpt-6-astra', displayName: 'GPT-6 Astra' },
  { slug: 'gpt-6.1-terra', displayName: 'GPT-6.1 Terra' },
  { slug: 'gpt-6.1-sol', displayName: 'GPT-6.1 Sol' },
  { slug: 'gpt-5.6-sol', displayName: 'GPT-5.6 Sol' },
];

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function jobView(job: Job) {
  const events = parseCodexJsonl(job.log);
  const running = Boolean(job.child && job.exitCode === null);
  const status: CodexJobStatus = resolveJobStatus({
    running,
    exitCode: job.exitCode,
    events: {
      sessionId: job.sessionId ?? events.sessionId,
      lastMessage: job.lastMessage ?? events.lastMessage,
      needsInput: job.needsInput || events.needsInput,
      error: job.error ?? events.error,
    },
  });
  return {
    id: job.id,
    status,
    sessionId: job.sessionId ?? events.sessionId,
    lastMessage: (job.lastMessage ?? events.lastMessage)?.slice(0, 2000),
    error: job.error ?? events.error,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    model: job.model,
    effort: job.effort,
    running,
    elapsedMs: Date.now() - Date.parse(job.startedAt),
  };
}

function refreshFromLog(job: Job) {
  const events = parseCodexJsonl(job.log);
  if (events.sessionId) job.sessionId = events.sessionId;
  if (events.lastMessage) job.lastMessage = events.lastMessage;
  if (events.needsInput) job.needsInput = true;
  if (events.error) job.error = events.error;
}

function listModels(): Array<{ slug: string; displayName: string }> {
  const cache = path.join(os.homedir(), '.codex', 'models_cache.json');
  try {
    const raw = JSON.parse(fs.readFileSync(cache, 'utf8')) as {
      models?: Array<{ slug?: string; display_name?: string; visibility?: string }>;
    };
    const listed = (raw.models ?? [])
      .filter((m) => m.slug && m.visibility !== 'hide')
      .map((m) => ({ slug: m.slug!, displayName: m.display_name ?? m.slug! }));
    if (listed.length) return listed;
  } catch {
    /* fallback */
  }
  return FALLBACK_MODELS;
}

function buildAgentPrompt(opts: {
  userPrompt: string;
  tabId: string;
  rowId: string;
}): string {
  return `You are adding a visualization to this DataBook (Vite + React + Recharts).

Read \`.cursor/skills/databook/SKILL.md\` and \`src/data/types.ts\` before editing.

Rules:
- Charts live in \`src/charts/<Name>.tsx\` as a default export receiving \`{ data }\` from an inlined query on a component row in \`src/data/rows.json\`.
- Insert the new chart in tab \`${opts.tabId}\` at the position of prompt row \`${opts.rowId}\`. Replace that prompt row with a \`component\` row, or insert the component row immediately after it and remove the prompt row.
- One-shot: implement without asking unless a serious unknown would make the chart wrong. If blocked, ask one concise question and stop.
- Follow existing chart style (ResponsiveFrame, chartColors, BookTooltip).
- Use Recharts by default. Use an alternative only when Recharts cannot produce the required visualization and the alternative is clearly better suited to the task.
- Do not dump experiment data into the skill install. Do not run \`npm install\`.

User request:
${opts.userPrompt.trim()}`;
}

function startJob(
  projectRoot: string,
  body: {
    prompt?: string;
    model?: string;
    effort?: string;
    tabId?: string;
    rowId?: string;
  },
): Job {
  const prompt = (body.prompt ?? '').trim();
  if (!prompt) throw new Error('prompt is required');
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `job-${Date.now()}`;
  const job: Job = {
    id,
    prompt,
    model: body.model?.trim() || 'gpt-6-astra',
    effort: body.effort?.trim() || 'medium',
    tabId: body.tabId ?? '',
    rowId: body.rowId ?? '',
    startedAt: new Date().toISOString(),
    exitCode: null,
    log: '',
    needsInput: false,
  };

  const args = [
    'exec',
    '--json',
    '--skip-git-repo-check',
    '-C',
    projectRoot,
    '-m',
    job.model,
    '-c',
    `model_reasoning_effort="${job.effort}"`,
    '-s',
    'workspace-write',
    '-a',
    'never',
    '-',
  ];

  const child = spawn('codex', args, {
    cwd: projectRoot,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  job.child = child;
  child.stdin.write(buildAgentPrompt({ userPrompt: prompt, tabId: job.tabId, rowId: job.rowId }));
  child.stdin.end();

  const onChunk = (buf: Buffer) => {
    job.log += buf.toString('utf8');
    if (job.log.length > 2_000_000) job.log = job.log.slice(-1_500_000);
    refreshFromLog(job);
  };
  child.stdout.on('data', onChunk);
  child.stderr.on('data', onChunk);
  child.on('close', (code) => {
    job.exitCode = code ?? 1;
    job.finishedAt = new Date().toISOString();
    job.child = undefined;
    refreshFromLog(job);
  });
  child.on('error', (err) => {
    job.error = err.message;
    job.exitCode = 1;
    job.finishedAt = new Date().toISOString();
    job.child = undefined;
  });

  jobs.set(id, job);
  return job;
}

function openGhostty(projectRoot: string, job: Job): void {
  const session = job.sessionId ?? parseCodexJsonl(job.log).sessionId;
  const inner = session
    ? `codex resume ${session} --include-non-interactive`
    : `echo 'Codex session is not ready yet (job ${job.id}).'; exec zsh`;
  const script = `cd ${JSON.stringify(projectRoot)} && ${inner}`;
  spawn('open', ['-na', 'Ghostty.app', '--args', `--working-directory=${projectRoot}`, '-e', '/bin/zsh', '-lic', script], {
    cwd: projectRoot,
    env: process.env,
    detached: true,
    stdio: 'ignore',
  }).unref();
}

export function codexJobsPlugin(projectRoot: string): Plugin {
  return {
    name: 'databook-codex-jobs',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.startsWith('/api/codex')) {
          next();
          return;
        }

        try {
          if (url === '/api/codex/models' && req.method === 'GET') {
            sendJson(res, 200, { models: listModels() });
            return;
          }

          if (url === '/api/codex/jobs' && req.method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}') as Record<string, string>;
            const job = startJob(projectRoot, body);
            sendJson(res, 200, jobView(job));
            return;
          }

          const jobMatch = url.match(/^\/api\/codex\/jobs\/([^/]+)(\/open)?$/);
          if (jobMatch) {
            const job = jobs.get(jobMatch[1]);
            if (!job) {
              sendJson(res, 404, { ok: false, error: 'unknown job' });
              return;
            }
            if (jobMatch[2] === '/open' && req.method === 'POST') {
              openGhostty(projectRoot, job);
              sendJson(res, 200, { ok: true, sessionId: job.sessionId });
              return;
            }
            if (req.method === 'GET') {
              refreshFromLog(job);
              sendJson(res, 200, jobView(job));
              return;
            }
          }

          sendJson(res, 404, { ok: false, error: 'not found' });
        } catch (err) {
          sendJson(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    },
  };
}
