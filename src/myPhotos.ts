import { useEffect, useState } from 'react';

/**
 * Photos you take yourself, stored on this device only (IndexedDB), downscaled to at most 1600 px.
 * They are not uploaded anywhere and are lost if the app's site data is cleared.
 */
export interface MyPhoto {
  key: number;
  speciesId: string;
  date: string;
  blob: Blob;
}

const DB = 'qroo-my-photos';
const STORE = 'photos';
const MAX = 1600;

let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: 'key', autoIncrement: true });
      s.createIndex('speciesId', 'speciesId');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const r = run(d.transaction(STORE, mode).objectStore(STORE));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }),
  );
}

// In-memory mirror: species id → photos (newest first), so cards can check cheaply.
let all: Map<string, MyPhoto[]> | null = null;
let loading: Promise<Map<string, MyPhoto[]>> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function loadAll(): Promise<Map<string, MyPhoto[]>> {
  loading ??= tx<MyPhoto[]>('readonly', (s) => s.getAll())
    .then((rows) => {
      const m = new Map<string, MyPhoto[]>();
      for (const r of rows.sort((a, b) => b.key - a.key)) m.set(r.speciesId, [...(m.get(r.speciesId) || []), r]);
      all = m;
      notify();
      return m;
    })
    .catch(() => (all = new Map()));
  return loading;
}

/** Downscale and re-encode a camera photo so it stays small on the device. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.85));
  } catch {
    return file; // formats the browser can't decode are kept as they are
  }
}

export async function addMyPhoto(speciesId: string, file: File): Promise<void> {
  const blob = await shrink(file);
  const date = new Date().toISOString().slice(0, 10);
  await tx('readwrite', (s) => s.add({ speciesId, date, blob }));
  // Ask the browser not to evict our data under storage pressure.
  navigator.storage?.persist?.().catch(() => {});
  loading = null;
  await loadAll();
}

export async function deleteMyPhoto(key: number): Promise<void> {
  await tx('readwrite', (s) => s.delete(key));
  loading = null;
  await loadAll();
}

/** Your photos of one species, newest first. */
export function useMyPhotos(speciesId: string | undefined): MyPhoto[] {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (!all) loadAll();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return (speciesId && all?.get(speciesId)) || [];
}

/** Object URL for a stored photo, revoked when the component unmounts or the photo changes. */
export function useBlobUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
