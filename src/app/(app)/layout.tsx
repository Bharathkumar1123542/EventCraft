/**
 * App layout (authenticated routes)
 * Spec: prd.md §5.2
 */

import { AppShell } from '@/components/layout/app-shell';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
