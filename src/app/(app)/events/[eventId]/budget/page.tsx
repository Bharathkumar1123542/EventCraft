/**
 * Budget page
 * Spec: prd.md §3.4 US-15 through US-19
 * Category table with allocation editing, locking, expense tracking
 */

'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EventShell } from '@/components/layout/event-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyField } from '@/components/ui/money-field';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

type CategoryStatus = 'ok' | 'near_limit' | 'over';

interface BudgetCategory {
  id: string;
  categoryKey: string;
  label: string;
  allocatedMinor: number;
  committedMinor: number;
  paidMinor: number;
  remainingMinor: number;
  isLocked: boolean;
  status: CategoryStatus;
}

interface Expense {
  id: string;
  title: string;
  amountMinor: number;
  status: 'estimated' | 'paid';
  vendorItemId: string | null;
  notes: string | null;
  categoryId: string;
}

interface Event {
  id: string;
  currency: string;
  totalBudgetMinor: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'CA$', AUD: 'A$', JPY: '¥',
};

const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, INR: 2, CAD: 2, AUD: 2, JPY: 0,
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

function getStatusBadge(status: CategoryStatus) {
  switch (status) {
    case 'ok':
      return <Badge variant="ok">OK</Badge>;
    case 'near_limit':
      return <Badge variant="warn">Near limit</Badge>;
    case 'over':
      return <Badge variant="over">Over budget</Badge>;
  }
}

export default function BudgetPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventId = params?.eventId as string;

  const [selectedCategory, setSelectedCategory] = React.useState<BudgetCategory | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<string | null>(null);
  const [editAmount, setEditAmount] = React.useState('');

  // Fetch event
  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      return res.json() as Promise<{ event: Event }>;
    },
  });

  // Fetch budget categories
  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/budget/categories`);
      if (!res.ok) throw new Error('Failed to fetch budget');
      return res.json() as Promise<{ categories: BudgetCategory[] }>;
    },
    enabled: !!eventId,
  });

  // Fetch expenses for selected category
  const { data: expensesData } = useQuery({
    queryKey: ['expenses', eventId, selectedCategory?.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/expenses?categoryId=${selectedCategory?.id}`);
      if (!res.ok) return { expenses: [] };
      return res.json() as Promise<{ expenses: Expense[] }>;
    },
    enabled: !!selectedCategory,
  });

  // Update allocation mutation
  const updateAllocationMutation = useMutation({
    mutationFn: async ({ categoryId, amount }: { categoryId: string; amount: number }) => {
      const res = await fetch(`/api/v1/events/${eventId}/budget/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocatedMinor: amount }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update allocation');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', eventId] });
      setEditingCategory(null);
      setEditAmount('');
      toast({ title: 'Allocation updated', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'error' });
    },
  });

  // Toggle lock mutation
  const toggleLockMutation = useMutation({
    mutationFn: async ({ categoryId, isLocked }: { categoryId: string; isLocked: boolean }) => {
      const res = await fetch(`/api/v1/events/${eventId}/budget/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked }),
      });
      
      if (!res.ok) throw new Error('Failed to toggle lock');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', eventId] });
    },
  });

  const handleEditAllocation = (category: BudgetCategory) => {
    setEditingCategory(category.id);
    const decimals = CURRENCY_DECIMALS[eventData?.event.currency || 'USD'];
    const major = category.allocatedMinor / Math.pow(10, decimals);
    setEditAmount(String(major));
  };

  const handleSaveAllocation = (categoryId: string) => {
    if (!eventData?.event) return;
    
    const decimals = CURRENCY_DECIMALS[eventData.event.currency];
    const amount = Math.round(parseFloat(editAmount) * Math.pow(10, decimals));
    
    updateAllocationMutation.mutate({ categoryId, amount });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditAmount('');
  };

  if (budgetLoading) {
    return (
      <EventShell eventId={eventId}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card>
            <CardContent className="p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full mb-4" />
              ))}
            </CardContent>
          </Card>
        </div>
      </EventShell>
    );
  }

  const event = eventData?.event;
  const categories = budgetData?.categories || [];
  
  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocatedMinor, 0);
  const totalCommitted = categories.reduce((sum, cat) => sum + cat.committedMinor, 0);
  const totalPaid = categories.reduce((sum, cat) => sum + cat.paidMinor, 0);
  const totalRemaining = categories.reduce((sum, cat) => sum + cat.remainingMinor, 0);

  return (
    <EventShell eventId={eventId}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text">Budget</h1>

        {/* Budget table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-base font-medium text-text">Category</th>
                    <th className="text-right p-4 text-base font-medium text-text">Allocated</th>
                    <th className="text-right p-4 text-base font-medium text-text">Committed</th>
                    <th className="text-right p-4 text-base font-medium text-text">Paid</th>
                    <th className="text-right p-4 text-base font-medium text-text">Remaining</th>
                    <th className="text-center p-4 text-base font-medium text-text">Status</th>
                    <th className="text-center p-4 text-base font-medium text-text">Lock</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b border-border hover:bg-bg transition-colors">
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedCategory(category)}
                          className="text-left text-base font-medium text-primary hover:text-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-control"
                        >
                          {category.label}
                        </button>
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {editingCategory === category.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-32 px-2 py-1 text-right border border-border rounded-control focus:outline-none focus:ring-2 focus:ring-focus"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveAllocation(category.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                            />
                            {updateAllocationMutation.isPending ? (
                              <Spinner size="sm" />
                            ) : (
                              <>
                                <button
                                  onClick={() => handleSaveAllocation(category.id)}
                                  className="text-ok-fg hover:text-ok-fg/80 transition-colors"
                                  aria-label="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-over-fg hover:text-over-fg/80 transition-colors"
                                  aria-label="Cancel"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditAllocation(category)}
                            className="text-base text-text hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-control"
                          >
                            {event ? formatCurrency(category.allocatedMinor, event.currency) : '—'}
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-right text-base text-text tabular-nums">
                        {event ? formatCurrency(category.committedMinor, event.currency) : '—'}
                      </td>
                      <td className="p-4 text-right text-base text-text tabular-nums">
                        {event ? formatCurrency(category.paidMinor, event.currency) : '—'}
                      </td>
                      <td className="p-4 text-right text-base text-text tabular-nums">
                        {event ? formatCurrency(category.remainingMinor, event.currency) : '—'}
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(category.status)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() =>
                            toggleLockMutation.mutate({
                              categoryId: category.id,
                              isLocked: !category.isLocked,
                            })
                          }
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-control p-1"
                          aria-label={category.isLocked ? 'Unlock category' : 'Lock category'}
                          title={category.isLocked ? 'Unlock' : 'Lock'}
                        >
                          {category.isLocked ? (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="text-primary"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="text-muted"
                            >
                              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals row */}
                  <tr className="bg-bg font-semibold">
                    <td className="p-4 text-base text-text">Total</td>
                    <td className="p-4 text-right text-base text-text tabular-nums">
                      {event ? formatCurrency(totalAllocated, event.currency) : '—'}
                    </td>
                    <td className="p-4 text-right text-base text-text tabular-nums">
                      {event ? formatCurrency(totalCommitted, event.currency) : '—'}
                    </td>
                    <td className="p-4 text-right text-base text-text tabular-nums">
                      {event ? formatCurrency(totalPaid, event.currency) : '—'}
                    </td>
                    <td className="p-4 text-right text-base text-text tabular-nums">
                      {event ? formatCurrency(totalRemaining, event.currency) : '—'}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Expense list for selected category */}
        {selectedCategory && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text">
                  {selectedCategory.label} expenses
                </h2>
                <Button
                  onClick={() => setExpenseDialogOpen(true)}
                  size="sm"
                >
                  Add expense
                </Button>
              </div>

              {expensesData && expensesData.expenses.length > 0 ? (
                <div className="space-y-2">
                  {expensesData.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 rounded-control border border-border hover:bg-bg transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-base font-medium text-text">{expense.title}</p>
                        {expense.notes && (
                          <p className="text-sm text-muted mt-1">{expense.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={expense.status === 'paid' ? 'ok' : 'neutral'}>
                          {expense.status === 'paid' ? 'Paid' : 'Estimated'}
                        </Badge>
                        <span className="text-base font-medium text-text tabular-nums">
                          {event ? formatCurrency(expense.amountMinor, event.currency) : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-base text-muted">No expenses yet.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add expense dialog - placeholder */}
        <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add expense</DialogTitle>
              <DialogDescription>
                Add an expense to {selectedCategory?.label}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input label="Title" placeholder="Expense title" />
              <MoneyField
                label="Amount"
                currencySymbol={event ? CURRENCY_SYMBOLS[event.currency] : '$'}
              />
              <div>
                <label className="block text-base font-medium text-text mb-2">Status</label>
                <select className="block w-full rounded-control border border-border px-3 py-2 text-base bg-surface text-text">
                  <option value="estimated">Estimated</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <Textarea label="Notes (optional)" rows={3} />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setExpenseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setExpenseDialogOpen(false)}>
                Add expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EventShell>
  );
}
