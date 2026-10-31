/**
 * Tabs component
 * Spec: prd.md §5.2 components, §4 navigation
 * Link-based tabs with aria-current for active tab
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface TabItem {
  label: string;
  href: string;
  match?: string; // optional path to match for active state
}

export interface TabsProps {
  tabs: TabItem[];
  className?: string;
}

export function Tabs({ tabs, className }: TabsProps) {
  const pathname = usePathname();

  const isActive = (tab: TabItem) => {
    const matchPath = tab.match || tab.href;
    return pathname === matchPath || pathname?.startsWith(`${matchPath}/`);
  };

  return (
    <nav
      className={`border-b border-border overflow-x-auto ${className || ''}`}
      role="navigation"
      aria-label="Event navigation"
    >
      <div className="flex space-x-8 px-4 min-w-max">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                py-4 px-1 text-base font-medium border-b-2 whitespace-nowrap
                transition-colors duration-150 ease-out
                ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-text hover:border-border'
                }
              `.trim()}
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
