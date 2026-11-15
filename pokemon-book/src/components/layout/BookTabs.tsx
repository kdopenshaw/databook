import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { TabSection } from '../../data/types';

type Props = {
  tabs: TabSection[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  children: ReactNode;
};

/**
 * Geist-styled tabs primitive.
 * Public npm `geist` is fonts only (@vercel/geistcn 404s), so this implements
 * Geist Tabs visual language (underline list + active border) on Geist tokens.
 * ArrowLeft/ArrowRight move focus with a roving tabindex.
 * Horizontal overflow shows edge fade + a subtle scroll cue when many tabs.
 */
export function BookTabs({ tabs, activeTabId, onSelect, children }: Props) {
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
    'cb-tabs-scroll',
    overflow.left ? 'cb-tabs-scroll-fade-left' : '',
    overflow.right ? 'cb-tabs-scroll-fade-right' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="cb-tabs">
      <div className={fadeClass} data-overflow={overflow.right || overflow.left ? 'true' : 'false'}>
        <div className="cb-tabs-scroll-inner" ref={scrollRef}>
          <div
            className="cb-tabs-list"
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
                  className="cb-tabs-trigger"
                  data-state={active ? 'active' : 'inactive'}
                  onClick={() => onSelect(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {overflow.right ? (
          <span className="cb-tabs-scroll-cue" aria-hidden="true">
            ›
          </span>
        ) : null}
      </div>
      <div
        className="cb-tabs-panel"
        role="tabpanel"
        id={`panel-${activeTabId}`}
        aria-labelledby={`tab-${activeTabId}`}
      >
        {children}
      </div>
    </div>
  );
}
