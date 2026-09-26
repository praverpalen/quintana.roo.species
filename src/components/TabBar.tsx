import type { Labels } from '../i18n';
import { IconCircleCheck, IconHouse, IconLayers } from './Icons';

export type Tab = 'home' | 'cards' | 'collection';

export function TabBar({ tab, L, go }: { tab: Tab; L: Labels; go: (t: Tab) => void }) {
  const items: [Tab, string, typeof IconHouse][] = [
    ['home', L.tabHome, IconHouse],
    ['cards', L.tabCards, IconLayers],
    ['collection', L.tabCol, IconCircleCheck],
  ];
  return (
    <nav className="tabbar">
      {items.map(([t, label, Icon]) => (
        <button key={t} className={'tab' + (tab === t ? ' on' : '')} aria-current={tab === t ? 'page' : undefined} onClick={() => go(t)}>
          <span className="tab-pill">
            <Icon size={21} />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}
