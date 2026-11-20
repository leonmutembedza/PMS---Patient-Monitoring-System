import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

export interface MenuItemConfig {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  separator?: boolean;
  danger?: boolean;
  action?: () => void;
}

export interface MenuCategoryConfig {
  id: string;
  label: string;
  items: MenuItemConfig[];
}

interface MenuBarProps {
  menus: MenuCategoryConfig[];
  activeMenuId: string | null;
  onOpenMenu: (menuId: string | null) => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  menus,
  activeMenuId,
  onOpenMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onOpenMenu(null);
      }
    };

    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId, onOpenMenu]);

  // Keyboard navigation within menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeMenuId) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenMenu(null);
        return;
      }

      const activeMenuIndex = menus.findIndex((m) => m.id === activeMenuId);
      if (activeMenuIndex === -1) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (activeMenuIndex + 1) % menus.length;
        onOpenMenu(menus[nextIndex].id);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (activeMenuIndex - 1 + menus.length) % menus.length;
        onOpenMenu(menus[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId, menus, onOpenMenu]);

  return (
    <div
      ref={containerRef}
      className="h-7 bg-surface-2 border-b border-surface-border px-2 flex items-center text-[11px] font-sans select-none relative z-50 text-text-secondary"
      role="menubar"
      aria-label="Application Menu"
    >
      {/* Top-Level Menu Items */}
      <div className="flex items-center space-x-0.5">
        {menus.map((menu) => {
          const isOpen = activeMenuId === menu.id;
          return (
            <div key={menu.id} className="relative">
              <button
                type="button"
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={() => onOpenMenu(isOpen ? null : menu.id)}
                onMouseEnter={() => {
                  if (activeMenuId && activeMenuId !== menu.id) {
                    onOpenMenu(menu.id);
                  }
                }}
                className={`px-2 py-0.5 rounded-[2px] transition-colors flex items-center outline-none ${
                  isOpen
                    ? 'bg-surface-4 text-text-primary font-medium'
                    : 'hover:bg-surface-3 hover:text-text-primary text-text-secondary'
                }`}
              >
                {menu.label}
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div
                  ref={dropdownRef}
                  role="menu"
                  className="absolute left-0 top-full mt-0.5 min-w-[220px] max-w-[320px] bg-surface-1 border border-surface-border rounded-[3px] shadow-2xl py-1 z-[100] text-left text-text-primary font-sans animate-in fade-in-50 duration-75"
                >
                  {menu.items.map((item, idx) => {
                    if (item.separator) {
                      return (
                        <div
                          key={`sep-${idx}`}
                          className="my-1 border-t border-surface-border-subtle"
                          role="separator"
                        />
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        role="menuitem"
                        disabled={item.disabled}
                        onClick={() => {
                          if (!item.disabled && item.action) {
                            onOpenMenu(null);
                            item.action();
                          }
                        }}
                        className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors text-[11px] outline-none ${
                          item.disabled
                            ? 'text-text-muted/40 cursor-not-allowed bg-transparent'
                            : item.danger
                            ? 'text-alarm-high hover:bg-alarm-high-surface'
                            : 'text-text-primary hover:bg-surface-3'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate pr-2">
                          {item.checked !== undefined && (
                            <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                              {item.checked ? (
                                <Check className="w-3.5 h-3.5 text-alarm-low" />
                              ) : null}
                            </span>
                          )}
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.shortcut && (
                          <span
                            className={`font-mono text-[9px] shrink-0 pl-3 ${
                              item.disabled ? 'text-text-muted/30' : 'text-text-muted'
                            }`}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
