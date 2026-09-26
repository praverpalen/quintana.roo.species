import { useEffect, useState } from 'react';
import type { Lang } from './data/types';
import type { Spotted } from './model';

const KEY = 'qroo-explorer-v1';

interface Persisted {
  lang: Lang;
  spotted: Spotted;
}

function load(): Persisted {
  let saved: Partial<Persisted> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    /* private mode or corrupt value: start fresh */
  }
  const navEs = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es');
  return {
    lang: saved.lang === 'es' || saved.lang === 'en' ? saved.lang : navEs ? 'es' : 'en',
    spotted: saved.spotted && typeof saved.spotted === 'object' ? saved.spotted : {},
  };
}

/** Persistent user data: language and spotted dates. Everything else is UI state. */
export function usePersisted() {
  const [data, setData] = useState<Persisted>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, [data]);

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return {
    ...data,
    setLang: (lang: Lang) => setData((d) => ({ ...d, lang })),
    /** Adds spotted dates from a backup. Species already spotted keep their own date. Returns how many were new. */
    mergeSpotted: (incoming: Spotted): number => {
      const added = Object.keys(incoming).filter((id) => !data.spotted[id] && /^\d{4}-\d{2}-\d{2}$/.test(incoming[id])).length;
      setData((d) => {
        const spotted = { ...d.spotted };
        for (const [id, date] of Object.entries(incoming)) if (!spotted[id] && /^\d{4}-\d{2}-\d{2}$/.test(date)) spotted[id] = date;
        return { ...d, spotted };
      });
      return added;
    },
    /** Returns true when the species became spotted. */
    toggleSpotted: (id: string): boolean => {
      const wasSpotted = !!data.spotted[id];
      setData((d) => {
        const spotted = { ...d.spotted };
        if (spotted[id]) delete spotted[id];
        else spotted[id] = today();
        return { ...d, spotted };
      });
      return !wasSpotted;
    },
  };
}
