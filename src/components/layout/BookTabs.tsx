import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { TabSection } from '../../data/types';
import { InlineRename } from './InlineRename';

type Props = {
  tabs: TabSection[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onAddTab?: () => void;
  onRenameTab?: (tabId: string, label: string) => void;
  children: ReactNode;
};

/**
 * Geist-styled tabs primitive.
 * Public npm `geist` is fonts only (@vercel/geistcn 404s), so this implements
 * Geist Tabs visual language (underline list + active border) on Geist tokens.
 * ArrowLeft/ArrowRight move focus with a roving tabindex.
 * Horizontal overflow shows edge fade + a subtle scroll cue when many tabs.
 */
export function BookTabs({ tabs, activeTabId, onSelect, onAddTab, onRenameTab, children }: Props) {
  const sorted = [...tabs].sort((a, b) => a.order - b.order);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const updateOverflow = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflow({
      left: el.scrollLeft > 2,
      right: max > 2 && el.scrollLeft < max - 2,
    });
  };

  useEffect(() => {
    updateOverflow();
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => updateOverflow();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateOverflow) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateOverflow);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      window.removeEventListener('resize', updateOverflow);
    };
  }, [sorted.length, activeTabId]);

  useEffect(() => {
    const btn = listRef.current?.querySelector<HTMLElement>(`#tab-${activeTabId}`);
    btn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [activeTabId]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const ids = sorted.map((t) => t.id);
    const i = ids.indexOf(activeTabId);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % ids.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + ids.length) % ids.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = ids.length - 1;
    onSelect(ids[next]);
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`#tab-${ids[next]}`)?.focus();
    });
  };

  const fadeClass = [
    'dbk-tabs-scroll',
    overflow.left ? 'dbk-tabs-scroll-fade-left' : '',
    overflow.right ? 'dbk-tabs-scroll-fade-right' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="dbk-tabs">
      <div className={fadeClass} data-overflow={overflow.right || overflow.left ? 'true' : 'false'}>
        <div className="dbk-tabs-scroll-inner" ref={scrollRef}>
          <div
            className="dbk-tabs-list"
            role="tablist"
            aria-label="Book tabs"
            ref={listRef}
            onKeyDown={onKeyDown}
          >
            {sorted.map((tab) => {
              const active = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={active ? 0 : -1}
                  className="dbk-tabs-trigger"
                  data-state={active ? 'active' : 'inactive'}
                  onClick={() => onSelect(tab.id)}
                >
                  {onRenameTab ? (
                    <InlineRename
                      value={tab.label}
                      onCommit={(label) => onRenameTab(tab.id, label)}
                      ariaLabel={`Rename tab ${tab.label}`}
                    />
                  ) : (
                    tab.label
                  )}
                </button>
              );
            })}
            {onAddTab ? (
              <div className="dbk-tabs-add">
                <button
                  type="button"
                  className="dbk-tabs-add-btn"
                  onClick={onAddTab}
                  aria-label="Add tab"
                  title="Add tab"
                >
                  <span className="dbk-insert-gap-plus" aria-hidden="true">
                    +
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {overflow.right ? (
          <span className="dbk-tabs-scroll-cue" aria-hidden="true">
            ›
          </span>
        ) : null}
      </div>
      <div
        className="dbk-tabs-panel"
        role="tabpanel"
        id={`panel-${activeTabId}`}
        aria-labelledby={`tab-${activeTabId}`}
      >
        {children}
      </div>
    </div>
  );
}