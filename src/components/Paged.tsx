import { useEffect, useRef, useState, type ReactNode } from 'react';

const PAGE = 40;

/**
 * Renders a long list in pages of 40, adding the next page as the end scrolls into view.
 * Thousands of zoomed cards at once would make phones stutter. `resetKey` restarts at page one (new filters).
 */
export function Paged<T>({ items, resetKey, render, label }: { items: T[]; resetKey: string; render: (item: T) => ReactNode; label: string }) {
  const [count, setCount] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setCount(PAGE), [resetKey]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= items.length) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setCount((c) => c + PAGE), { rootMargin: '900px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [count, items.length]);

  return (
    <>
      {items.slice(0, count).map(render)}
      {count < items.length && (
        <div ref={sentinel} style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: 8 }}>
          <button className="btn btn-secondary" onClick={() => setCount((c) => c + PAGE)}>
            {label}
          </button>
        </div>
      )}
    </>
  );
}
