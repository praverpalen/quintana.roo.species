import type { Lang } from './data/types';
import type { Spotted } from './model';
import { allMyPhotos } from './myPhotos';

/**
 * Backup file: one JSON file with the spotted dates and every own photo (base64).
 * Everything the app can't re-download lives in here.
 */
export interface BackupFile {
  app: 'qroo-species';
  version: 1;
  exported: string;
  lang: Lang;
  spotted: Spotted;
  photos: { speciesId: string; date: string; type: string; data: string }[];
}

const LAST_KEY = 'qroo-last-backup';

export function lastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(data: string, type: string): Blob {
  const bin = atob(data);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type });
}

export async function buildBackup(spotted: Spotted, lang: Lang): Promise<File> {
  const photos = await allMyPhotos();
  const file: BackupFile = {
    app: 'qroo-species',
    version: 1,
    exported: new Date().toISOString(),
    lang,
    spotted,
    photos: await Promise.all(photos.map(async (p) => ({ speciesId: p.speciesId, date: p.date, type: p.blob.type || 'image/jpeg', data: await toBase64(p.blob) }))),
  };
  const name = `qroo-species-backup-${file.exported.slice(0, 10)}.json`;
  return new File([JSON.stringify(file)], name, { type: 'application/json' });
}

/**
 * Hands the file to the user: the share sheet on phones (so it can go to Files / iCloud Drive / Drive),
 * a normal download elsewhere. Returns false if the user cancelled.
 */
export async function saveBackup(file: File): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: file.name });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
      download(file);
    }
  } else download(file);
  try {
    localStorage.setItem(LAST_KEY, new Date().toISOString().slice(0, 10));
  } catch {
    /* ignore */
  }
  return true;
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Parses and validates a backup file. Throws with a readable message when it isn't one. */
export async function readBackup(file: File): Promise<{ spotted: Spotted; photos: { speciesId: string; date: string; blob: Blob }[]; exported: string }> {
  let json: BackupFile;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error('not-json');
  }
  if (json?.app !== 'qroo-species' || json.version !== 1 || typeof json.spotted !== 'object' || !Array.isArray(json.photos)) throw new Error('not-backup');
  const spotted: Spotted = {};
  for (const [id, date] of Object.entries(json.spotted)) if (typeof date === 'string') spotted[id] = date;
  const photos = json.photos
    .filter((p) => p && typeof p.speciesId === 'string' && typeof p.data === 'string')
    .map((p) => ({ speciesId: p.speciesId, date: p.date || json.exported.slice(0, 10), blob: fromBase64(p.data, p.type || 'image/jpeg') }));
  return { spotted, photos, exported: json.exported };
}
