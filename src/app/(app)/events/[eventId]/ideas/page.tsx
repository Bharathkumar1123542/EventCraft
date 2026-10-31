/**
 * Ideas page
 * Spec: prd.md §3.7 US-28 through US-30
 * Idea cards with Like/Dislike/Save feedback and filtering
 */

'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EventShell } from '@/components/layout/event-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

type IdeaKind = 'theme' | 'decor' | 'food_drink' | 'activity' | 'entertainment' | 'keepsake';
type CostTier = 'low' | 'medium' | 'high';

interface Idea {
  id: string;
  title: string;
  description: string;
  kind: IdeaKind;
  costTier: CostTier;
  isLiked: boolean;
  isDisliked: boolean;
  isSaved: boolean;
}

const KIND_LABELS: Record<IdeaKind, string> = {
  theme: 'Theme',
  decor: 'Decor',
  food_drink: 'Food & Drink',
  activity: 'Activity',
  entertainment: 'Entertainment',
  keepsake: 'Keepsake',
};

const COST_LABELS: Record<CostTier, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export default function IdeasPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventId = params?.eventId as string;

  // Get filter from URL
  const filter = searchParams?.get('filter') || 'all';

  // Fetch ideas
  const { data: ideasData, isLoading: ideasLoading } = useQuery({
    queryKey: ['ideas', eventId, filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);
      
      const res = await fetch(`/api/v1/events/${eventId}/ideas?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch ideas');
      return res.json() as Promise<{ ideas: Idea[] }>;
    },
    enabled: !!eventId,
  });

  // Update idea feedback mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ ideaId, updates }: { ideaId: string; updates: any }) => {
      const res = await fetch(`/api/v1/events/${eventId}/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) throw new Error('Failed to update idea');
      return res.json();
    },
    onMutate: async ({ ideaId, updates }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['ideas', eventId, filter] });
      const previousIdeas = queryClient.getQueryData(['ideas', eventId, filter]);
      
      queryClient.setQueryData(
        ['ideas', eventId, filter],
        (old: any) => ({
          ...old,
          ideas: old.ideas.map((idea: Idea) =>
            idea.id === ideaId ? { ...idea, ...updates } : idea
          ),
        })
      );
      
      return { previousIdeas };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousIdeas) {
        queryClient.setQueryData(
          ['ideas', eventId, filter],
          context.previousIdeas
        );
      }
      toast({ title: 'Failed to update idea', variant: 'error' });
    },
    onSuccess: () => {
      // Invalidate to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ['ideas', eventId] });
    },
  });

  const handleLike = (idea: Idea) => {
    const newIsLiked = !idea.isLiked;
    updateFeedbackMutation.mutate({
      ideaId: idea.id,
      updates: {
        isLiked: newIsLiked,
        isDisliked: false, // Like and Dislike are mutually exclusive
      },
    });
  };

  const handleDislike = (idea: Idea) => {
    const newIsDisliked = !idea.isDisliked;
    updateFeedbackMutation.mutate({
      ideaId: idea.id,
      updates: {
        isDisliked: newIsDisliked,
        isLiked: false, // Like and Dislike are mutually exclusive
      },
    });
  };

  const handleSave = (idea: Idea) => {
    updateFeedbackMutation.mutate({
      ideaId: idea.id,
      updates: {
        isSaved: !idea.isSaved,
      },
    });
  };

  const updateFilter = (newFilter: string) => {
    const params = new URLSearchParams();
    if (newFilter !== 'all') {
      params.set('filter', newFilter);
    }
    router.push(`/events/${eventId}/ideas?${params.toString()}`);
  };

  if (ideasLoading) {
    return (
      <EventShell eventId={eventId}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </EventShell>
    );
  }

  const ideas = ideasData?.ideas || [];

  return (
    <EventShell eventId={eventId}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Ideas</h1>
          <Button onClick={() => {/* Regenerate handler */}}>
            Regenerate ideas
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('all')}
                className={`px-4 py-2 rounded-control text-base font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface text-text border border-border hover:bg-bg'
                }`}
              >
                All
              </button>
              <button
                onClick={() => updateFilter('saved')}
                className={`px-4 py-2 rounded-control text-base font-medium transition-colors ${
                  filter === 'saved'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface text-text border border-border hover:bg-bg'
                }`}
              >
                Saved
              </button>
              <button
                onClick={() => updateFilter('liked')}
                className={`px-4 py-2 rounded-control text-base font-medium transition-colors ${
                  filter === 'liked'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface text-text border border-border hover:bg-bg'
                }`}
              >
                Liked
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Ideas grid */}
        {ideas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-base text-muted mb-4">
                {filter === 'all' ? 'No ideas yet.' : `No ${filter} ideas.`}
              </p>
              {filter === 'all' && (
                <Button onClick={() => {/* Generate handler */}}>
                  Generate ideas
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea) => (
              <Card key={idea.id} className="flex flex-col">
                <CardContent className="p-6 flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="neutral" className="capitalize">
                      {KIND_LABELS[idea.kind]}
                    </Badge>
                    <Badge variant={
                      idea.costTier === 'high' ? 'warn' :
                      idea.costTier === 'medium' ? 'neutral' : 'ok'
                    }>
                      {COST_LABELS[idea.costTier]}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text mb-2">
                      {idea.title}
                    </h3>
                    <p className="text-base text-muted">
                      {idea.description}
                    </p>
                  </div>

                  {/* Feedback buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <button
                      onClick={() => handleLike(idea)}
                      aria-pressed={idea.isLiked}
                      aria-label={idea.isLiked ? 'Unlike' : 'Like'}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-control text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
                        idea.isLiked
                          ? 'bg-ok-bg text-ok-fg border border-ok-fg'
                          : 'bg-surface text-text border border-border hover:bg-bg'
                      }`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill={idea.isLiked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                      Like
                    </button>

                    <button
                      onClick={() => handleDislike(idea)}
                      aria-pressed={idea.isDisliked}
                      aria-label={idea.isDisliked ? 'Remove dislike' : 'Dislike'}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-control text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
                        idea.isDisliked
                          ? 'bg-over-bg text-over-fg border border-over-fg'
                          : 'bg-surface text-text border border-border hover:bg-bg'
                      }`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill={idea.isDisliked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 113 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                      </svg>
                      Dislike
                    </button>

                    <button
                      onClick={() => handleSave(idea)}
                      aria-pressed={idea.isSaved}
                      aria-label={idea.isSaved ? 'Unsave' : 'Save'}
                      className={`flex items-center justify-center p-2 rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
                        idea.isSaved
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface text-text border border-border hover:bg-bg'
                      }`}
                      title={idea.isSaved ? 'Unsave' : 'Save'}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill={idea.isSaved ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </EventShell>
  );
}
