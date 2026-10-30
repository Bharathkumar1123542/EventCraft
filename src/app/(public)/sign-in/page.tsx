/**
 * Sign in page
 * Spec: prd.md §3.1 US-02, §4 screens and navigation
 */

'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/client/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { GoogleButton } from '@/components/auth/google-button';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/events';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password) {
      setError('Email or password is incorrect');
      return;
    }
    
    setIsLoading(true);

    try {
      await signIn.email({
        email: email.trim(),
        password,
        callbackURL: redirect,
      });

      router.push(redirect);
    } catch (err) {
      setError('Email or password is incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-primary mb-2">EventCraft</h1>
          <p className="text-base text-muted">AI-powered event planning</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                disabled={isLoading}
                autoComplete="email"
                required
              />

              <Input
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />

              {error && (
                <div
                  className="rounded-control bg-over-bg border border-over-fg/20 p-3 text-base text-over-fg"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-surface px-2 text-muted">Or</span>
              </div>
            </div>

            {/* Google sign-in */}
            <GoogleButton mode="signin" callbackURL={redirect} disabled={isLoading} />

            <div className="mt-6 text-center text-base">
              <span className="text-muted">Don't have an account? </span>
              <Link
                href="/sign-up"
                className="font-medium text-primary hover:text-primary-hover transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-control"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    }>
      <SignInForm />
    </React.Suspense>
  );
}
