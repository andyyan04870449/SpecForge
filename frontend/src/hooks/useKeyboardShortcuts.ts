import { useEffect, useCallback } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean; // Command key on Mac
  handler: () => void;
  description?: string;
  enabled?: boolean;
}

/**
 * 自定義 Hook 用於處理鍵盤快捷鍵
 * @param shortcuts 快捷鍵配置陣列
 * @param enabled 是否啟用快捷鍵（預設為 true）
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    for (const shortcut of shortcuts) {
      if (shortcut.enabled === false) continue;

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !shortcut.ctrl || event.ctrlKey === shortcut.ctrl;
      const altMatch = !shortcut.alt || event.altKey === shortcut.alt;
      const shiftMatch = !shortcut.shift || event.shiftKey === shortcut.shift;
      const metaMatch = !shortcut.meta || event.metaKey === shortcut.meta;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * 格式化快捷鍵顯示文字
 * @param shortcut 快捷鍵配置
 * @returns 格式化的快捷鍵文字（如 "Ctrl+Shift+K"）
 */
export function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = [];
  
  // 檢測操作系統
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (shortcut.meta && isMac) parts.push('⌘');
  else if (shortcut.ctrl) parts.push('Ctrl');
  
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  
  // 特殊鍵名稱轉換
  const keyName = shortcut.key.length === 1 
    ? shortcut.key.toUpperCase()
    : shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);
  
  parts.push(keyName);
  
  return parts.join(isMac ? '' : '+');
}

/**
 * 常用快捷鍵組合
 */
export const CommonShortcuts = {
  // 導航快捷鍵
  nextTab: { key: 'Tab', ctrl: true },
  prevTab: { key: 'Tab', ctrl: true, shift: true },
  
  // 操作快捷鍵
  save: { key: 's', ctrl: true },
  saveAs: { key: 's', ctrl: true, shift: true },
  new: { key: 'n', ctrl: true },
  open: { key: 'o', ctrl: true },
  close: { key: 'w', ctrl: true },
  
  // 編輯快捷鍵
  undo: { key: 'z', ctrl: true },
  redo: { key: 'z', ctrl: true, shift: true },
  copy: { key: 'c', ctrl: true },
  paste: { key: 'v', ctrl: true },
  cut: { key: 'x', ctrl: true },
  selectAll: { key: 'a', ctrl: true },
  
  // 搜尋快捷鍵
  search: { key: 'f', ctrl: true },
  searchNext: { key: 'g', ctrl: true },
  searchPrev: { key: 'g', ctrl: true, shift: true },
  
  // 其他
  refresh: { key: 'r', ctrl: true },
  fullscreen: { key: 'Enter', alt: true },
  help: { key: '?', shift: true },
  escape: { key: 'Escape' },
};

/**
 * 專案分析頁面專用快捷鍵
 */
export const SystemAnalysisShortcuts = {
  // 頁籤切換
  tabUC: { key: '1', alt: true },
  tabSD: { key: '2', alt: true },
  tabAPI: { key: '3', alt: true },
  tabDTO: { key: '4', alt: true },
  tabAI: { key: '5', alt: true },
  
  // 功能快捷鍵
  newItem: { key: 'n', alt: true },
  deleteItem: { key: 'Delete' },
  editItem: { key: 'e', alt: true },
  saveItem: { key: 's', ctrl: true },
  
  // 導航
  focusSearch: { key: '/', ctrl: true },
  focusSidebar: { key: 'b', ctrl: true },
  toggleSidebar: { key: 'b', ctrl: true, shift: true },
};