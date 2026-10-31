/**
 * Dashboard / Event list page
 * Spec: prd.md §4.2 FR-01
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

interface Event {
  id: string;
  type: string;
  title: string;
  eventDate: string;
  guestCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json() as Promise<{ events: Event[] }>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
        Failed to load events. Please try again.
      </div>
    );
  }

  const events = data?.events || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Your Events</h1>
        <Link href="/events/new">
          <Button>Create Event</Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">
              You haven't created any events yet.
            </p>
            <Link href="/events/new">
              <Button>Create your first event</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1 capitalize">
                        {event.type}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-600">Date</dt>
                      <dd className="font-medium">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Guests</dt>
                      <dd className="font-medium">{event.guestCount}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
