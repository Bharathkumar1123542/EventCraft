/**
 * Sign up page
 * Spec: prd.md §3.1 US-01, §4 screens and navigation
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/client/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { GoogleButton } from '@/components/auth/google-button';

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Validation
    const errors: Record<string, string> = {};
    
    if (!name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 10) {
      errors.password = 'Password must be at least 10 characters';
    } else if (password.length > 128) {
      errors.password = 'Password must not exceed 128 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        document.getElementById(firstErrorField)?.focus();
      }
      return;
    }

    setIsLoading(true);

    try {
      await signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
        callbackURL: '/events',
      });

      router.push('/events');
    } catch (err: any) {
      // Better Auth returns specific error messages
      if (err?.message?.includes('already exists')) {
        setFieldErrors({ email: 'An account with this email already exists' });
        document.getElementById('email')?.focus();
      } else {
        setFieldErrors({ email: 'Failed to create account. Please try again.' });
      }
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
            <CardTitle>Create your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="name"
                label="Name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }
                }}
                error={fieldErrors.name}
                disabled={isLoading}
                autoComplete="name"
                required
              />

              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }
                }}
                error={fieldErrors.email}
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
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                error={fieldErrors.password}
                helperText="10 to 128 characters"
                disabled={isLoading}
                autoComplete="new-password"
                required
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
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
            <GoogleButton mode="signup" disabled={isLoading} />

            <div className="mt-6 text-center text-base">
              <span className="text-muted">Already have an account? </span>
              <Link
                href="/sign-in"
                className="font-medium text-primary hover:text-primary-hover transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-control"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
