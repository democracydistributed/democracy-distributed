import type { KeyboardEvent } from 'react';

/**
 * Keyboard support for a WAI-ARIA tablist: roving tabIndex plus
 * Arrow/Home/End navigation (automatic activation). Tabs are expected to have
 * `id="tab-<id>"`, as in OrgPage and ContributePage.
 */
export function useTabKeys<T extends string>(ids: readonly T[], active: T, onSelect: (id: T) => void) {
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const i = ids.indexOf(active);
    let next: number;
    switch (e.key) {
      case 'ArrowRight': next = (i + 1) % ids.length; break;
      case 'ArrowLeft': next = (i - 1 + ids.length) % ids.length; break;
      case 'Home': next = 0; break;
      case 'End': next = ids.length - 1; break;
      default: return;
    }
    e.preventDefault();
    onSelect(ids[next]);
    document.getElementById(`tab-${ids[next]}`)?.focus();
  }

  return { onKeyDown, tabIndex: (id: T) => (id === active ? 0 : -1) };
}
