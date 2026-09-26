import { useRef, useState } from 'react';
import type { Labels } from '../i18n';
import { fmtDate } from '../i18n';
import { lastBackup } from '../backup';

interface Props {
  L: Labels;
  onExport: () => Promise<boolean>;
  onImport: (file: File) => Promise<void>;
}

/** Export / import of everything that only lives on this device: spotted dates and your own photos. */
export function BackupPanel({ L, onExport, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(lastBackup());

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      setLast(lastBackup());
    }
  };

  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <div className="panel-group">
        <span className="section-k">{L.backupTitle}</span>
        <span style={{ fontSize: 13.5, color: 'var(--color-neutral-800)', lineHeight: 1.45 }}>{L.backupText}</span>
        <span style={{ fontSize: 12.5, color: 'var(--color-neutral-700)' }}>{last ? `${L.backupLast} ${fmtDate(last, L.lang)}` : L.backupNever}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => run(onExport)}>
          {L.exportBtn}
        </button>
        <button className="btn btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => fileRef.current?.click()}>
          {L.importBtn}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) run(() => onImport(f));
        }}
      />
    </div>
  );
}
