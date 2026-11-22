import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import bookJson from '../../data/rows.json';
import { loadCanonical } from '../../data/loadCanonical';
import type { BookDocument } from '../../data/types';
import { ComponentRow } from '../rows/ComponentRow';
import { BookTabs } from './BookTabs';
import '../theme/bookReader.css';

const book = bookJson as BookDocument;
const table = loadCanonical();

export default function BookReader() {
  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  const [activeId, setActiveId] = useState(requestedTab ?? book.defaultTabId);
  const activeTab = book.tabs.find(({ id }) => id === activeId)
    ?? book.tabs.find(({ id }) => id === book.defaultTabId) ?? book.tabs[0];

  return (
    <main className="dbk-reader" aria-label={book.title}>
      <BookTabs tabs={book.tabs} activeTabId={activeTab?.id ?? ''} onSelect={setActiveId}>
        {activeTab?.rows.toSorted((a, b) => a.order - b.order).map((row) => {
          if (row.type === 'component') {
            return <ComponentRow key={row.id} row={row} table={table} book={book} />;
          }
          if (row.type === 'markdown') {
            return (
              <div key={row.id} className="dbk-markdown">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                  }}
                >
                  {row.body}
                </Markdown>
              </div>
            );
          }
          return null;
        })}
      </BookTabs>
    </main>
  );
}
