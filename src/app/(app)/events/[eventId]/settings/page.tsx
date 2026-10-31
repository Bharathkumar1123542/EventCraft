/**
 * Event settings page
 * Spec: prd.md §3.2 US-08, US-09, §4 screens and navigation
 * Edit event details, download plan, delete event
 */

'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyField } from '@/components/ui/money-field';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { EventShell } from '@/components/layout/event-shell';
import { useToast } from '@/components/ui/toast';

type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'CA$', AUD: 'A$', JPY: '¥',
};

const CURRENCY_DECIMALS: Record<Currency, number> = {
  USD: 2, EUR: 2, GBP: 2, INR: 2, CAD: 2, AUD: 2, JPY: 0,
};

interface Event {
  id: string;
  type: string;
  title: string;
  eventDate: string;
  timezone: string;
  city: string | null;
  guestCount: number;
  currency: Currency;
  totalBudgetMinor: number;
  preferences: any;
  updatedAt: string;
}

export default function EventSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventId = params?.eventId as string;

  // Form state
  const [title, setTitle] = React.useState('');
  const [eventDate, setEventDate] = React.useState('');
  const [timezone, setTimezone] = React.useState('');
  const [city, setCity] = React.useState('');
  const [guestCount, setGuestCount] = React.useState('');
  const [totalBudget, setTotalBudget] = React.useState('');
  const [preferences, setPreferences] = React.useState('');
  
  // UI state
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Fetch event
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json() as Promise<{ event: Event }>;
    },
    enabled: !!eventId,
  });

  // Populate form when event loads
  React.useEffect(() => {
    if (event?.event) {
      const e = event.event;
      setTitle(e.title);
      setEventDate(e.eventDate);
      setTimezone(e.timezone);
      setCity(e.city || '');
      setGuestCount(String(e.guestCount));
      
      // Convert minor units to major
      const decimals = CURRENCY_DECIMALS[e.currency];
      const major = e.totalBudgetMinor / Math.pow(10, decimals);
      setTotalBudget(String(major));
      
      setPreferences(e.preferences?.text || '');
    }
  }, [event]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch(`/api/v1/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 409) {
          throw new Error('stale');
        }
        throw new Error(error.detail || 'Failed to update event');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setHasChanges(false);
      toast({
        title: 'Event updated',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      if (error.message === 'stale') {
        setFieldErrors({
          submit: 'This event changed in another tab. Reload to continue.',
        });
      } else {
        setFieldErrors({ submit: error.message });
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete event');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      router.push('/events');
      toast({
        title: 'Event deleted',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete event',
        description: error.message,
        variant: 'error',
      });
    },
  });

  const handleSave = async () => {
    if (!event?.event) return;

    // Validation
    const errors: Record<string, string> = {};
    
    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length > 200) {
      errors.title = 'Title must not exceed 200 characters';
    }

    if (!eventDate) {
      errors.eventDate = 'Event date is required';
    }

    if (city && city.length > 200) {
      errors.city = 'City must not exceed 200 characters';
    }

    const guests = parseInt(guestCount, 10);
    if (!guestCount || isNaN(guests) || guests < 1 || guests > 5000) {
      errors.guestCount = 'Guest count must be between 1 and 5,000';
    }

    if (!totalBudget) {
      errors.totalBudget = 'Total budget is required';
    }

    if (preferences && preferences.length > 300) {
      errors.preferences = 'Preferences must not exceed 300 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Convert budget to minor units
    const decimals = CURRENCY_DECIMALS[event.event.currency];
    const totalBudgetMinor = Math.round(
      parseFloat(totalBudget) * Math.pow(10, decimals)
    );

    const updates: any = {};
    if (title !== event.event.title) updates.title = title.trim();
    if (eventDate !== event.event.eventDate) updates.eventDate = eventDate;
    if (timezone !== event.event.timezone) updates.timezone = timezone;
    if ((city || null) !== event.event.city) updates.city = city.trim() || null;
    if (parseInt(guestCount, 10) !== event.event.guestCount) {
      updates.guestCount = parseInt(guestCount, 10);
    }
    if (totalBudgetMinor !== event.event.totalBudgetMinor) {
      updates.totalBudgetMinor = totalBudgetMinor;
    }
    if (preferences !== (event.event.preferences?.text || '')) {
      updates.preferences = preferences.trim() ? { text: preferences.trim() } : null;
    }

    if (Object.keys(updates).length === 0) {
      toast({ title: 'No changes to save', variant: 'default' });
      return;
    }

    updateMutation.mutate(updates);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (eventLoading) {
    return (
      <EventShell eventId={eventId}>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </EventShell>
    );
  }

  if (!event?.event) {
    return (
      <EventShell eventId={eventId}>
        <Card>
          <CardContent className="p-6">
            <p className="text-base text-over-fg">Event not found.</p>
          </CardContent>
        </Card>
      </EventShell>
    );
  }

  return (
    <EventShell eventId={eventId}>
      <h1 className="text-2xl font-semibold text-text mb-8">Event settings</h1>

      <div className="space-y-6 max-w-2xl">
        {/* Edit details */}
        <Card>
          <CardHeader>
            <CardTitle>Event details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-base font-medium text-text mb-2">
                Event type
              </label>
              <p className="text-base text-text bg-bg rounded-control border border-border px-3 py-2 capitalize">
                {event.event.type}
              </p>
              <p className="mt-2 text-sm text-muted">
                Event type cannot be changed after creation.
              </p>
            </div>

            <Input
              id="title"
              label="Event title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasChanges(true);
                if (fieldErrors.title) {
                  setFieldErrors((prev) => ({ ...prev, title: '' }));
                }
              }}
              error={fieldErrors.title}
              disabled={updateMutation.isPending}
              maxLength={200}
              required
            />

            <Input
              id="eventDate"
              label="Event date"
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                setHasChanges(true);
                if (fieldErrors.eventDate) {
                  setFieldErrors((prev) => ({ ...prev, eventDate: '' }));
                }
              }}
              error={fieldErrors.eventDate}
              disabled={updateMutation.isPending}
              required
            />

            <Input
              id="timezone"
              label="Timezone"
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value);
                setHasChanges(true);
              }}
              helperText="IANA timezone name (e.g., America/New_York)"
              disabled={updateMutation.isPending}
              required
            />

            <Input
              id="city"
              label="City (optional)"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setHasChanges(true);
                if (fieldErrors.city) {
                  setFieldErrors((prev) => ({ ...prev, city: '' }));
                }
              }}
              error={fieldErrors.city}
              disabled={updateMutation.isPending}
              maxLength={200}
            />

            <Input
              id="guestCount"
              label="Guest count"
              type="number"
              inputMode="numeric"
              value={guestCount}
              onChange={(e) => {
                setGuestCount(e.target.value);
                setHasChanges(true);
                if (fieldErrors.guestCount) {
                  setFieldErrors((prev) => ({ ...prev, guestCount: '' }));
                }
              }}
              error={fieldErrors.guestCount}
              disabled={updateMutation.isPending}
              min={1}
              max={5000}
              required
            />

            <div>
              <label className="block text-base font-medium text-text mb-2">
                Currency
              </label>
              <p className="text-base text-text bg-bg rounded-control border border-border px-3 py-2">
                {event.event.currency}
              </p>
              <p className="mt-2 text-sm text-muted">
                Currency cannot be changed after creation.
              </p>
            </div>

            <MoneyField
              id="totalBudget"
              label="Total budget"
              value={totalBudget}
              onChange={(e) => {
                setTotalBudget(e.target.value);
                setHasChanges(true);
                if (fieldErrors.totalBudget) {
                  setFieldErrors((prev) => ({ ...prev, totalBudget: '' }));
                }
              }}
              error={fieldErrors.totalBudget}
              currencySymbol={CURRENCY_SYMBOLS[event.event.currency]}
              disabled={updateMutation.isPending}
              required
            />

            <Textarea
              id="preferences"
              label="Preferences (optional)"
              value={preferences}
              onChange={(e) => {
                setPreferences(e.target.value);
                setHasChanges(true);
                if (fieldErrors.preferences) {
                  setFieldErrors((prev) => ({ ...prev, preferences: '' }));
                }
              }}
              error={fieldErrors.preferences}
              helperText={`${preferences.length}/300 characters`}
              disabled={updateMutation.isPending}
              maxLength={300}
              rows={3}
            />

            {fieldErrors.submit && (
              <div
                className="rounded-control bg-over-bg border border-over-fg/20 p-3 text-base text-over-fg"
                role="alert"
              >
                {fieldErrors.submit}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/events/${eventId}`)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle>Export plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = `/api/v1/events/${eventId}/export/markdown`;
              }}
            >
              Download plan (.md)
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = `/api/v1/events/${eventId}/export/ics`;
              }}
              className="ml-3"
            >
              Download calendar (.ics)
            </Button>
          </CardContent>
        </Card>

        {/* Delete event */}
        <Card>
          <CardHeader>
            <CardTitle>Delete event</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted mb-4">
              Permanently delete this event and all its data. This cannot be undone.
            </p>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete event</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {event.event.title}?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete this event and all its plan data.
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Deleting...
                      </>
                    ) : (
                      'Delete event'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </EventShell>
  );
}
