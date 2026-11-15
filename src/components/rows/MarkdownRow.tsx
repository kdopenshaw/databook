import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MarkdownRow as MarkdownRowModel } from '../../data/types';

export function MarkdownRow({ row }: { row: MarkdownRowModel }) {
  const user = row.createdBy === 'user';
  return (
    <article className={`cb-row cb-markdown${user ? ' cb-markdown-user' : ''}`}>
      {user ? <p className="cb-markdown-user-label">Analyst note</p> : null}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.body}</ReactMarkdown>
    </article>
  );
}
