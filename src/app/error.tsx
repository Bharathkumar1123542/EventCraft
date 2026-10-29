'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-4 text-muted">An unexpected error occurred.</p>
      <button
        onClick={reset}
        className="mt-8 rounded-control bg-primary px-16 py-8 text-surface hover:bg-primary-hover"
      >
        Try again
      </button>
    </main>
  );
}
