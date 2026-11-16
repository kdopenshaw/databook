/**
 * Dev-server helpers: write book files under `src/book/` (only source of truth).
 */

export type BookFileWriteResult = {
  ok: boolean;
  error?: string;
};

async function putBookFile(relativePath: string, content: string): Promise<BookFileWriteResult> {
  if (!import.meta.env.DEV) {
    return { ok: false, error: 'Book file writes require npm run dev' };
  }
  try {
    const res = await fetch('/api/book/file', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: relativePath, content }),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !body?.ok) {
      return { ok: false, error: body?.error ?? res.statusText };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function writeTabFile(sourceFile: string, content: string): Promise<BookFileWriteResult> {
  return putBookFile(sourceFile, content);
}

export async function writeBookYaml(content: string): Promise<BookFileWriteResult> {
  return putBookFile('book.yaml', content);
}

export async function deleteTabFile(sourceFile: string): Promise<BookFileWriteResult> {
  if (!import.meta.env.DEV) {
    return { ok: false, error: 'Book file deletes require npm run dev' };
  }
  try {
    const res = await fetch(`/api/book/file?path=${encodeURIComponent(sourceFile)}`, {
      method: 'DELETE',
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !body?.ok) {
      return { ok: false, error: body?.error ?? res.statusText };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
