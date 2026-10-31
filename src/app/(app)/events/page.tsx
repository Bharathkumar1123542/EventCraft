/**
 * Event list page
 * Spec: prd.md §3.2 US-07, §4 screens and navigation
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  type: string;
  title: string;
  eventDate: string;
  totalBudgetMinor: number;
  currency: string;
  guestCount: number;
  timezone: string;
  createdAt: string;
}

export default function EventsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/v1/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json() as Promise<{ events: Event[] }>;
    },
  });

  const getDaysRemaining = (eventDate: string, timezone: string): number => {
    const now = new Date();
    const event = new Date(eventDate);
    const diffTime = event.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatCurrency = (minor: number, currency: string): string => {
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
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-text">Your events</h1>
          <Button asChild>
            <Link href="/events/new">New event</Link>
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-text">Your events</h1>
          <Button asChild>
            <Link href="/events/new">New event</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-base text-over-fg mb-4">
              Failed to load events. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const events = data?.events || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-text">Your events</h1>
        <Button asChild>
          <Link href="/events/new">New event</Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-base text-muted mb-4">
              No events yet. Create your first event.
            </p>
            <Button asChild>
              <Link href="/events/new">New event</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const daysRemaining = getDaysRemaining(event.eventDate, event.timezone);
            
            return (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="hover:shadow-md transition-shadow duration-150 cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h2 className="text-lg font-semibold text-text flex-1 mr-2">
                        {event.title}
                      </h2>
                      <Badge variant="neutral" className="capitalize text-sm">
                        {event.type}
                      </Badge>
                    </div>
                    
                    <dl className="space-y-2 text-base">
                      <div className="flex justify-between">
                        <dt className="text-muted">Date</dt>
                        <dd className="font-medium text-text">
                          {new Date(event.eventDate).toLocaleDateString('en-US', {
                            dateStyle: 'medium',
                            timeZone: event.timezone,
                          })}
                        </dd>
                      </div>
                      
                      <div className="flex justify-between">
                        <dt className="text-muted">Days remaining</dt>
                        <dd className="font-medium text-text">
                          {daysRemaining > 0 ? daysRemaining : 'Today or past'}
                        </dd>
                      </div>
                      
                      <div className="flex justify-between">
                        <dt className="text-muted">Budget</dt>
                        <dd className="font-medium text-text tabular-nums">
                          {formatCurrency(event.totalBudgetMinor, event.currency)}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
