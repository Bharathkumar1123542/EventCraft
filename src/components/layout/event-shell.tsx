/**
 * Event layout shell with tab navigation
 * Spec: prd.md §4 screens and navigation
 * Tab list: Overview, Budget, Timeline, Vendors, Ideas, Assistant, Settings
 * Scrolls horizontally below 640px
 */

'use client';

import * as React from 'react';
import { Tabs } from '@/components/ui/tabs';

export interface EventShellProps {
  eventId: string;
  children: React.ReactNode;
}

export function EventShell({ eventId, children }: EventShellProps) {
  const tabs = [
    { label: 'Overview', href: `/events/${eventId}` },
    { label: 'Budget', href: `/events/${eventId}/budget` },
    { label: 'Timeline', href: `/events/${eventId}/timeline` },
    { label: 'Vendors', href: `/events/${eventId}/vendors` },
    { label: 'Ideas', href: `/events/${eventId}/ideas` },
    { label: 'Assistant', href: `/events/${eventId}/assistant` },
    { label: 'Settings', href: `/events/${eventId}/settings` },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 mb-8">
        <Tabs tabs={tabs} />
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
