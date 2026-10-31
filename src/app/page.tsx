/**
 * Landing page
 * Spec: prd.md §4 screens and navigation
 * Public page with product pitch and calls to action
 */

'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/client/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const message = searchParams?.get('message');

  // Redirect authenticated users to events list
  React.useEffect(() => {
    if (!isPending && session?.user) {
      router.push('/events');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return null; // Or a loading spinner
  }

  if (session?.user) {
    return null; // Redirecting
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="text-center max-w-2xl">
        {/* Show deletion message if present */}
        {message === 'deleted' && (
          <div
            className="mb-8 rounded-control bg-ok-bg border border-ok-fg/20 p-4 text-base text-ok-fg"
            role="alert"
          >
            Your account and data were deleted.
          </div>
        )}

        <h1 className="text-4xl font-semibold text-text mb-4">
          EventCraft
        </h1>
        <p className="text-xl text-muted mb-8">
          Turn your event idea into a complete plan with budgets, timelines, vendor checklists, and personalized ideas.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/sign-up">Create account</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    }>
      <HomePageContent />
    </React.Suspense>
  );
}
