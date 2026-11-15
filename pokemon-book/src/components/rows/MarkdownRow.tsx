import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MarkdownRow as MarkdownRowModel } from '../../data/types';

export function MarkdownRow({ row }: { row: MarkdownRowModel }) {
  return (
    <article className="cb-row cb-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.body}</ReactMarkdown>
    </article>
  );
}
