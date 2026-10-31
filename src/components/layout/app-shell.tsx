/**
 * App shell layout
 * Spec: prd.md §4 screens and navigation, §5.2 components
 * Top bar with product name, account menu, skip link
 * Tab navigation inside events
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-bg">
      {/* Skip to main content link - first focusable element */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Product name - links to events list */}
            <Link
              href="/events"
              className="text-xl font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-control px-2 py-1"
            >
              EventCraft
            </Link>

            {/* Account menu */}
            <div className="relative">
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center space-x-2 rounded-control px-3 py-2 text-base font-medium text-text hover:bg-bg transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                aria-expanded={accountMenuOpen}
                aria-haspopup="true"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="hidden sm:inline">Account</span>
                <svg
                  className={`transition-transform duration-150 ${accountMenuOpen ? 'rotate-180' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <path d="M6 9L1 4h10L6 9z" />
                </svg>
              </button>

              {accountMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAccountMenuOpen(false)}
                  />
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-48 rounded-control border border-border bg-surface shadow-lg z-50">
                    <div className="py-2">
                      <Link
                        href="/account"
                        className="block px-4 py-2 text-base text-text hover:bg-bg transition-colors duration-150"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        Account settings
                      </Link>
                      <form action="/api/auth/signout" method="POST">
                        <button
                          type="submit"
                          className="w-full text-left px-4 py-2 text-base text-text hover:bg-bg transition-colors duration-150"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          Sign out
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
