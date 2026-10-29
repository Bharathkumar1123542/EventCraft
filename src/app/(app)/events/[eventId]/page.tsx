/**
 * Event overview page
 * Spec: prd.md §3.3 US-10, US-11, §4 screens and navigation
 * Shows header, four section summaries, and generation status
 */

'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { EventShell } from '@/components/layout/event-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GenerationProvider, useGeneration } from '@/lib/client/generation-provider';

interface Event {
  id: string;
  type: string;
  title: string;
  eventDate: string;
  timezone: string;
  currency: string;
  totalBudgetMinor: number;
}

interface BudgetSummary {
  totalAllocated: number;
  totalCommitted: number;
  totalPaid: number;
  remaining: number;
  categoryCountByStatus: {
    ok: number;
    near_limit: number;
    over: number;
  };
}

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  categoryKey: string;
  status: string;
}

interface VendorSummary {
  countByStatus: {
    not_started: number;
    contacted: number;
    quoted: number;
    booked: number;
    declined: number;
  };
}

interface IdeaSummary {
  totalCount: number;
  savedCount: number;
  likedCount: number;
}

function formatCurrency(minor: number, currency: string): string {
  const currencies: Record<string, number> = {
    USD: 2, EUR: 2, GBP: 2, INR: 2, CAD: 2, AUD: 2, JPY: 0
  };
  const decimals = currencies[currency] || 2;
  const major = minor / Math.pow(10, decimals);
  
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

function getDaysRemaining(eventDate: string, timezone: string): number {
  const now = new Date();
  const event = new Date(eventDate);
  const diffTime = event.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function OverviewContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, startGeneration, regenerateSection } = useGeneration();
  
  // Check if we should auto-start generation
  const shouldGenerate = searchParams?.get('generating') === '1';
  const hasStartedRef = React.useRef(false);

  // Fetch event
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json() as Promise<{ event: Event }>;
    },
  });

  // Fetch budget summary
  const { data: budgetData } = useQuery({
    queryKey: ['budget-summary', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/budget/rollup`);
      if (!res.ok) return null;
      return res.json() as Promise<BudgetSummary>;
    },
    enabled: !!eventData,
  });

  // Fetch open tasks
  const { data: tasksData } = useQuery({
    queryKey: ['tasks-overview', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/tasks?status=open&limit=5`);
      if (!res.ok) return null;
      return res.json() as Promise<{ tasks: Task[] }>;
    },
    enabled: !!eventData,
  });

  // Fetch vendor summary
  const { data: vendorData } = useQuery({
    queryKey: ['vendors-summary', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/vendors/summary`);
      if (!res.ok) return null;
      return res.json() as Promise<VendorSummary>;
    },
    enabled: !!eventData,
  });

  // Fetch ideas summary
  const { data: ideasData } = useQuery({
    queryKey: ['ideas-summary', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/ideas/summary`);
      if (!res.ok) return null;
      return res.json() as Promise<IdeaSummary>;
    },
    enabled: !!eventData,
  });

  // Auto-start generation
  React.useEffect(() => {
    if (shouldGenerate && eventData && !hasStartedRef.current && !state.isGenerating) {
      hasStartedRef.current = true;
      startGeneration(eventId);
      // Remove query parameter
      router.replace(`/events/${eventId}`, { scroll: false });
    }
  }, [shouldGenerate, eventData, eventId, state.isGenerating, startGeneration, router]);

  if (eventLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!eventData?.event) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-base text-over-fg">Event not found.</p>
        </CardContent>
      </Card>
    );
  }

  const event = eventData.event;
  const daysRemaining = getDaysRemaining(event.eventDate, event.timezone);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-card border border-border bg-surface p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text mb-2">{event.title}</h1>
            <div className="flex items-center gap-4 text-base text-muted">
              <span>
                {new Date(event.eventDate).toLocaleDateString('en-US', {
                  dateStyle: 'medium',
                  timeZone: event.timezone,
                })}
              </span>
              <span>•</span>
              <span>
                {daysRemaining > 0
                  ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
                  : daysRemaining === 0
                    ? 'Today'
                    : 'Past'}
              </span>
            </div>
          </div>
          <Badge variant="neutral" className="capitalize">
            {event.type}
          </Badge>
        </div>
      </div>

      {/* Generation status */}
      {state.isGenerating && (
        <Card>
          <CardContent className="p-6">
            <p className="text-base text-text mb-2" role="status" aria-live="polite">
              Building your plan...
            </p>
            <div className="space-y-2 text-sm">
              {Object.entries(state.sections).map(([section, sectionState]) => (
                <div key={section} className="flex items-center gap-2">
                  <span className="capitalize">{section}:</span>
                  {sectionState.status === 'completed' ? (
                    <span className="text-ok-fg">Ready</span>
                  ) : sectionState.status === 'generating' ? (
                    <span className="text-primary">Building...</span>
                  ) : sectionState.status === 'failed' ? (
                    <span className="text-over-fg">Failed</span>
                  ) : (
                    <span className="text-muted">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Budget summary */}
        <Card>
          <CardHeader>
            <CardTitle>Budget</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetData ? (
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-muted">Allocated</span>
                  <span className="font-medium text-text tabular-nums">
                    {formatCurrency(budgetData.totalAllocated, event.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-muted">Committed</span>
                  <span className="font-medium text-text tabular-nums">
                    {formatCurrency(budgetData.totalCommitted, event.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-muted">Paid</span>
                  <span className="font-medium text-text tabular-nums">
                    {formatCurrency(budgetData.totalPaid, event.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-border">
                  <span className="text-muted">Remaining</span>
                  <span className="font-semibold text-text tabular-nums">
                    {formatCurrency(budgetData.remaining, event.currency)}
                  </span>
                </div>
                {budgetData.categoryCountByStatus && (
                  <div className="pt-2 flex gap-2">
                    {budgetData.categoryCountByStatus.ok > 0 && (
                      <Badge variant="ok">{budgetData.categoryCountByStatus.ok} OK</Badge>
                    )}
                    {budgetData.categoryCountByStatus.near_limit > 0 && (
                      <Badge variant="warn">{budgetData.categoryCountByStatus.near_limit} Near limit</Badge>
                    )}
                    {budgetData.categoryCountByStatus.over > 0 && (
                      <Badge variant="over">{budgetData.categoryCountByStatus.over} Over</Badge>
                    )}
                  </div>
                )}
                <Button
                  variant="secondary"
                  className="w-full mt-4"
                  onClick={() => router.push(`/events/${eventId}/budget`)}
                >
                  View budget
                </Button>
              </div>
            ) : state.sections.budget.status === 'failed' ? (
              <div>
                <p className="text-base text-over-fg mb-3">
                  {state.sections.budget.error || 'Failed to generate budget'}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => regenerateSection(eventId, 'budget')}
                  disabled={state.isGenerating}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <p className="text-base text-muted">Not generated yet</p>
            )}
          </CardContent>
        </Card>

        {/* Timeline summary */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksData && tasksData.tasks.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted mb-3">Next 5 open tasks:</p>
                <ul className="space-y-2">
                  {tasksData.tasks.slice(0, 5).map((task) => (
                    <li key={task.id} className="text-base">
                      <span className="font-medium text-text">{task.title}</span>
                      <span className="text-sm text-muted ml-2">
                        {new Date(task.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  className="w-full mt-4"
                  onClick={() => router.push(`/events/${eventId}/timeline`)}
                >
                  View timeline
                </Button>
              </div>
            ) : state.sections.timeline.status === 'failed' ? (
              <div>
                <p className="text-base text-over-fg mb-3">
                  {state.sections.timeline.error || 'Failed to generate timeline'}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => regenerateSection(eventId, 'timeline')}
                  disabled={state.isGenerating}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <p className="text-base text-muted">Not generated yet</p>
            )}
          </CardContent>
        </Card>

        {/* Vendors summary */}
        <Card>
          <CardHeader>
            <CardTitle>Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-base">
                  <div>
                    <span className="text-muted">Not started:</span>
                    <span className="ml-2 font-medium text-text">{vendorData.countByStatus.not_started}</span>
                  </div>
                  <div>
                    <span className="text-muted">Contacted:</span>
                    <span className="ml-2 font-medium text-text">{vendorData.countByStatus.contacted}</span>
                  </div>
                  <div>
                    <span className="text-muted">Quoted:</span>
                    <span className="ml-2 font-medium text-text">{vendorData.countByStatus.quoted}</span>
                  </div>
                  <div>
                    <span className="text-muted">Booked:</span>
                    <span className="ml-2 font-medium text-ok-fg">{vendorData.countByStatus.booked}</span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-full mt-4"
                  onClick={() => router.push(`/events/${eventId}/vendors`)}
                >
                  View vendors
                </Button>
              </div>
            ) : state.sections.vendors.status === 'failed' ? (
              <div>
                <p className="text-base text-over-fg mb-3">
                  {state.sections.vendors.error || 'Failed to generate vendors'}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => regenerateSection(eventId, 'vendors')}
                  disabled={state.isGenerating}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <p className="text-base text-muted">Not generated yet</p>
            )}
          </CardContent>
        </Card>

        {/* Ideas summary */}
        <Card>
          <CardHeader>
            <CardTitle>Ideas</CardTitle>
          </CardHeader>
          <CardContent>
            {ideasData ? (
              <div className="space-y-3">
                <div className="space-y-2 text-base">
                  <div className="flex justify-between">
                    <span className="text-muted">Total ideas:</span>
                    <span className="font-medium text-text">{ideasData.totalCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Saved:</span>
                    <span className="font-medium text-text">{ideasData.savedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Liked:</span>
                    <span className="font-medium text-text">{ideasData.likedCount}</span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-full mt-4"
                  onClick={() => router.push(`/events/${eventId}/ideas`)}
                >
                  View ideas
                </Button>
              </div>
            ) : state.sections.ideas.status === 'failed' ? (
              <div>
                <p className="text-base text-over-fg mb-3">
                  {state.sections.ideas.error || 'Failed to generate ideas'}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => regenerateSection(eventId, 'ideas')}
                  disabled={state.isGenerating}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <p className="text-base text-muted">Not generated yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EventOverviewPage() {
  const params = useParams();
  const eventId = params?.eventId as string;

  return (
    <GenerationProvider>
      <EventShell eventId={eventId}>
        <OverviewContent eventId={eventId} />
      </EventShell>
    </GenerationProvider>
  );
}
