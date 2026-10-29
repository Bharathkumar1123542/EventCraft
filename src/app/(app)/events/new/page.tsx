/**
 * Create event page
 * Spec: prd.md §3.2 US-05, US-06, §4 screens and navigation
 * Eight-field form with timezone auto-detection
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyField } from '@/components/ui/money-field';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

type EventType = 'wedding' | 'birthday' | 'community';
type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD' | 'JPY';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
};

const CURRENCY_DECIMALS: Record<Currency, number> = {
  USD: 2, EUR: 2, GBP: 2, INR: 2, CAD: 2, AUD: 2, JPY: 0,
};

export default function NewEventPage() {
  const router = useRouter();
  
  // Form state
  const [type, setType] = React.useState<EventType>('wedding');
  const [title, setTitle] = React.useState('');
  const [eventDate, setEventDate] = React.useState('');
  const [city, setCity] = React.useState('');
  const [guestCount, setGuestCount] = React.useState('');
  const [currency, setCurrency] = React.useState<Currency>('USD');
  const [totalBudget, setTotalBudget] = React.useState('');
  const [preferences, setPreferences] = React.useState('');
  const [timezone, setTimezone] = React.useState('');
  const [showTimezoneEdit, setShowTimezoneEdit] = React.useState(false);
  
  // UI state
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  // Auto-detect timezone on mount
  React.useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detected);
    } catch {
      setTimezone('UTC');
    }
  }, []);

  const getTodayInTimezone = (tz: string): string => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(now);
    } catch {
      return new Date().toISOString().split('T')[0]!;
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!type) {
      errors.type = 'Event type is required';
    }

    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length > 200) {
      errors.title = 'Title must not exceed 200 characters';
    }

    if (!eventDate) {
      errors.eventDate = 'Event date is required';
    } else {
      const today = getTodayInTimezone(timezone);
      if (eventDate < today) {
        errors.eventDate = 'Choose today or a later date';
      }
    }

    if (city && city.length > 200) {
      errors.city = 'City must not exceed 200 characters';
    }

    const guests = parseInt(guestCount, 10);
    if (!guestCount) {
      errors.guestCount = 'Guest count is required';
    } else if (isNaN(guests) || guests < 1) {
      errors.guestCount = 'Guest count must be at least 1';
    } else if (guests > 5000) {
      errors.guestCount = 'Guest count must not exceed 5,000';
    }

    if (!totalBudget) {
      errors.totalBudget = 'Total budget is required';
    } else {
      // Validate budget format based on currency
      const decimals = CURRENCY_DECIMALS[currency];
      const regex = decimals > 0
        ? new RegExp(`^\\d{1,12}(\\.\\d{1,${decimals}})?$`)
        : /^\d{1,12}$/;
      
      if (!regex.test(totalBudget)) {
        errors.totalBudget = decimals > 0
          ? `Enter a valid amount with up to ${decimals} decimal places`
          : 'Enter a valid whole number';
      }
    }

    if (preferences && preferences.length > 300) {
      errors.preferences = 'Preferences must not exceed 300 characters';
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      // Focus first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        document.getElementById(firstErrorField)?.focus();
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Convert budget to minor units
      const decimals = CURRENCY_DECIMALS[currency];
      const totalBudgetMinor = Math.round(
        parseFloat(totalBudget) * Math.pow(10, decimals)
      );

      const payload = {
        type,
        title: title.trim(),
        eventDate,
        timezone,
        city: city.trim() || null,
        guestCount: parseInt(guestCount, 10),
        currency,
        totalBudgetMinor,
        preferences: preferences.trim() ? { text: preferences.trim() } : undefined,
      };

      const response = await fetch('/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create event');
      }

      const { event } = await response.json();
      
      // Redirect to overview with generation flag
      router.push(`/events/${event.id}?generating=1`);
    } catch (err: any) {
      setFieldErrors({ submit: err.message || 'Failed to create event. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const minDate = getTodayInTimezone(timezone);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-text mb-8">Create your event</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event type */}
            <div>
              <label htmlFor="type" className="block text-base font-medium text-text mb-2">
                Event type
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as EventType);
                  if (fieldErrors.type) {
                    setFieldErrors((prev) => ({ ...prev, type: '' }));
                  }
                }}
                className="block w-full rounded-control border border-border px-3 py-2 text-base bg-surface text-text transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] md:min-h-[32px]"
                disabled={isLoading}
                required
              >
                <option value="wedding">Wedding</option>
                <option value="birthday">Birthday</option>
                <option value="community">Community event</option>
              </select>
              {fieldErrors.type && (
                <p className="mt-2 text-sm text-over-fg">{fieldErrors.type}</p>
              )}
            </div>

            {/* Title */}
            <Input
              id="title"
              label="Event title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) {
                  setFieldErrors((prev) => ({ ...prev, title: '' }));
                }
              }}
              error={fieldErrors.title}
              disabled={isLoading}
              maxLength={200}
              required
            />

            {/* Event date */}
            <Input
              id="eventDate"
              label="Event date"
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                if (fieldErrors.eventDate) {
                  setFieldErrors((prev) => ({ ...prev, eventDate: '' }));
                }
              }}
              error={fieldErrors.eventDate}
              helperText={`Timezone: ${timezone}`}
              min={minDate}
              disabled={isLoading}
              required
            />

            {/* Timezone edit */}
            {!showTimezoneEdit && (
              <button
                type="button"
                onClick={() => setShowTimezoneEdit(true)}
                className="text-base text-primary hover:text-primary-hover transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-control"
              >
                Change timezone
              </button>
            )}
            
            {showTimezoneEdit && (
              <Input
                id="timezone"
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                helperText="IANA timezone name (e.g., America/New_York)"
                disabled={isLoading}
                required
              />
            )}

            {/* City (optional) */}
            <Input
              id="city"
              label="City (optional)"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (fieldErrors.city) {
                  setFieldErrors((prev) => ({ ...prev, city: '' }));
                }
              }}
              error={fieldErrors.city}
              disabled={isLoading}
              maxLength={200}
            />

            {/* Guest count */}
            <Input
              id="guestCount"
              label="Guest count"
              type="number"
              inputMode="numeric"
              value={guestCount}
              onChange={(e) => {
                setGuestCount(e.target.value);
                if (fieldErrors.guestCount) {
                  setFieldErrors((prev) => ({ ...prev, guestCount: '' }));
                }
              }}
              error={fieldErrors.guestCount}
              disabled={isLoading}
              min={1}
              max={5000}
              required
            />

            {/* Currency */}
            <div>
              <label htmlFor="currency" className="block text-base font-medium text-text mb-2">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="block w-full rounded-control border border-border px-3 py-2 text-base bg-surface text-text transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] md:min-h-[32px]"
                disabled={isLoading}
                required
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            {/* Total budget */}
            <MoneyField
              id="totalBudget"
              label="Total budget"
              value={totalBudget}
              onChange={(e) => {
                setTotalBudget(e.target.value);
                if (fieldErrors.totalBudget) {
                  setFieldErrors((prev) => ({ ...prev, totalBudget: '' }));
                }
              }}
              error={fieldErrors.totalBudget}
              currencySymbol={CURRENCY_SYMBOLS[currency]}
              disabled={isLoading}
              required
            />

            {/* Preferences (optional) */}
            <Textarea
              id="preferences"
              label="Preferences (optional)"
              value={preferences}
              onChange={(e) => {
                setPreferences(e.target.value);
                if (fieldErrors.preferences) {
                  setFieldErrors((prev) => ({ ...prev, preferences: '' }));
                }
              }}
              error={fieldErrors.preferences}
              helperText={`${preferences.length}/300 characters`}
              disabled={isLoading}
              maxLength={300}
              rows={3}
            />

            {/* Submit error */}
            {fieldErrors.submit && (
              <div
                className="rounded-control bg-over-bg border border-over-fg/20 p-3 text-base text-over-fg"
                role="alert"
              >
                {fieldErrors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating event...
                  </>
                ) : (
                  'Create event'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
