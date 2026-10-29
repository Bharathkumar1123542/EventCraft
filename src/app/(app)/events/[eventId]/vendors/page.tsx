/**
 * Vendors page
 * Spec: prd.md §3.6 US-24 through US-27
 * Vendor checklist grouped by category with status management and details
 */

'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EventShell } from '@/components/layout/event-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyField } from '@/components/ui/money-field';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

type VendorStatus = 'not_started' | 'contacted' | 'quoted' | 'booked' | 'declined';

interface VendorItem {
  id: string;
  categoryKey: string;
  categoryLabel: string;
  need: string;
  description: string;
  isMustHave: boolean;
  questionsToAsk: string[];
  status: VendorStatus;
  vendorName: string | null;
  contactInfo: string | null;
  quoteAmountMinor: number | null;
  notes: string | null;
}

interface Event {
  id: string;
  currency: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'CA$', AUD: 'A$', JPY: '¥',
};

const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, INR: 2, CAD: 2, AUD: 2, JPY: 0,
};

const STATUS_LABELS: Record<VendorStatus, string> = {
  not_started: 'Not started',
  contacted: 'Contacted',
  quoted: 'Quoted',
  booked: 'Booked',
  declined: 'Declined',
};

function formatCurrency(minor: number, currency: string): string {
  const decimals = CURRENCY_DECIMALS[currency] || 2;
  const major = minor / Math.pow(10, decimals);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

export default function VendorsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventId = params?.eventId as string;

  const [selectedVendor, setSelectedVendor] = React.useState<VendorItem | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
  const [vendorName, setVendorName] = React.useState('');
  const [contactInfo, setContactInfo] = React.useState('');
  const [quoteAmount, setQuoteAmount] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [fieldError, setFieldError] = React.useState('');

  // Fetch event
  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json() as Promise<{ event: Event }>;
    },
  });

  // Fetch vendor items
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/vendors`);
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json() as Promise<{ vendors: VendorItem[] }>;
    },
    enabled: !!eventId,
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async ({ vendorId, updates }: { vendorId: string; updates: any }) => {
      const res = await fetch(`/api/v1/events/${eventId}/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update vendor');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors', eventId] });
      toast({ title: 'Vendor updated', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'error' });
    },
  });

  const handleOpenDetails = (vendor: VendorItem) => {
    setSelectedVendor(vendor);
    setVendorName(vendor.vendorName || '');
    setContactInfo(vendor.contactInfo || '');
    
    if (vendor.quoteAmountMinor !== null && eventData?.event) {
      const decimals = CURRENCY_DECIMALS[eventData.event.currency] ?? 2;
      const major = vendor.quoteAmountMinor / Math.pow(10, decimals);
      setQuoteAmount(String(major));
    } else {
      setQuoteAmount('');
    }
    
    setNotes(vendor.notes || '');
    setFieldError('');
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedVendor(null);
    setVendorName('');
    setContactInfo('');
    setQuoteAmount('');
    setNotes('');
    setFieldError('');
  };

  const handleSaveDetails = () => {
    if (!selectedVendor || !eventData?.event) return;

    const updates: any = {
      vendorName: vendorName.trim() || null,
      contactInfo: contactInfo.trim() || null,
      notes: notes.trim() || null,
    };

    if (quoteAmount) {
      const decimals = CURRENCY_DECIMALS[eventData.event.currency] ?? 2;
      updates.quoteAmountMinor = Math.round(parseFloat(quoteAmount) * Math.pow(10, decimals));
    } else {
      updates.quoteAmountMinor = null;
    }

    updateVendorMutation.mutate(
      { vendorId: selectedVendor.id, updates },
      {
        onSuccess: () => {
          handleCloseDetails();
        },
      }
    );
  };

  const handleStatusChange = (vendor: VendorItem, newStatus: VendorStatus) => {
    // Check if vendor name is required
    if ((newStatus === 'quoted' || newStatus === 'booked') && !vendor.vendorName) {
      setFieldError('Add the vendor\'s name first');
      handleOpenDetails(vendor);
      return;
    }

    setFieldError('');
    updateVendorMutation.mutate({
      vendorId: vendor.id,
      updates: { status: newStatus },
    });
  };

  const handleCopyQuestions = (questions: string[]) => {
    const text = questions.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Questions copied to clipboard', variant: 'success' });
    }).catch(() => {
      toast({ title: 'Failed to copy questions', variant: 'error' });
    });
  };

  if (vendorsLoading) {
    return (
      <EventShell eventId={eventId}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </EventShell>
    );
  }

  const vendors = vendorsData?.vendors || [];
  const event = eventData?.event;

  // Group by category
  const vendorsByCategory = vendors.reduce((acc, vendor) => {
    if (!acc[vendor.categoryKey]) {
      acc[vendor.categoryKey] = {
        label: vendor.categoryLabel,
        items: [],
      };
    }
    acc[vendor.categoryKey]!.items.push(vendor);
    return acc;
  }, {} as Record<string, { label: string; items: VendorItem[] }>);

  return (
    <EventShell eventId={eventId}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text">Vendors</h1>

        {vendors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-base text-muted">No vendor items yet.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(vendorsByCategory).map(([categoryKey, category]) => (
            <Card key={categoryKey}>
              <CardHeader>
                <CardTitle>{category.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.items.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="p-4 rounded-control border border-border hover:bg-bg transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base font-semibold text-text">
                            {vendor.need}
                          </h3>
                          {vendor.isMustHave && (
                            <Badge variant="warn">Must-have</Badge>
                          )}
                        </div>
                        <p className="text-base text-muted">{vendor.description}</p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <label className="text-sm font-medium text-text">Status</label>
                        <select
                          value={vendor.status}
                          onChange={(e) => handleStatusChange(vendor, e.target.value as VendorStatus)}
                          className="block w-full rounded-control border border-border px-3 py-2 text-base bg-surface text-text focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Vendor details summary */}
                    {vendor.vendorName && (
                      <div className="mb-3 p-3 bg-bg rounded-control">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted">Vendor:</span>
                            <span className="ml-2 font-medium text-text">{vendor.vendorName}</span>
                          </div>
                          {vendor.quoteAmountMinor !== null && event && (
                            <div>
                              <span className="text-muted">Quote:</span>
                              <span className="ml-2 font-medium text-text tabular-nums">
                                {formatCurrency(vendor.quoteAmountMinor, event.currency)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Questions to ask */}
                    {vendor.questionsToAsk.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-text">Questions to ask:</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyQuestions(vendor.questionsToAsk)}
                          >
                            Copy questions
                          </Button>
                        </div>
                        <ul className="space-y-1 text-sm text-muted">
                          {vendor.questionsToAsk.map((question, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Edit details button */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenDetails(vendor)}
                      >
                        {vendor.vendorName ? 'Edit details' : 'Add details'}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}

        {/* Vendor details dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vendor details</DialogTitle>
              <DialogDescription>
                {selectedVendor?.need}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Input
                label="Vendor name"
                value={vendorName}
                onChange={(e) => {
                  setVendorName(e.target.value);
                  if (fieldError) setFieldError('');
                }}
                error={fieldError}
                placeholder="Business or contact name"
              />

              <Textarea
                label="Contact info (optional)"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Phone, email, or address"
                rows={2}
              />

              {event && (
                <MoneyField
                  label="Quote amount (optional)"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  currencySymbol={CURRENCY_SYMBOLS[event.currency]}
                  placeholder="0.00"
                />
              )}

              <Textarea
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes (private)"
                rows={3}
                helperText="Notes are private and never shared with AI"
              />
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={handleCloseDetails}
                disabled={updateVendorMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDetails}
                disabled={updateVendorMutation.isPending}
              >
                {updateVendorMutation.isPending ? 'Saving...' : 'Save details'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EventShell>
  );
}
