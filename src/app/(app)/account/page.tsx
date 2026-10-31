/**
 * Account settings page
 * Spec: prd.md §3.1 US-04, §4 screens and navigation
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/client/auth';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Sign out and redirect with message
      await signOut();
      router.push('/?message=deleted');
    } catch (err) {
      setDeleteError('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session?.user) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text mb-8">Account settings</h1>

      <div className="space-y-6">
        {/* Account information */}
        <Card>
          <CardHeader>
            <CardTitle>Account information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-base font-medium text-text mb-2">
                Name
              </label>
              <p className="text-base text-text bg-bg rounded-control border border-border px-3 py-2">
                {session.user.name || 'Not set'}
              </p>
              <p className="mt-2 text-sm text-muted">
                Your name cannot be changed after sign up.
              </p>
            </div>

            <div>
              <label className="block text-base font-medium text-text mb-2">
                Email
              </label>
              <p className="text-base text-text bg-bg rounded-control border border-border px-3 py-2">
                {session.user.email}
              </p>
              <p className="mt-2 text-sm text-muted">
                Your email cannot be changed after sign up.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sign out */}
        <Card>
          <CardHeader>
            <CardTitle>Sign out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted mb-4">
              Sign out of your account on this device.
            </p>
            <Button variant="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </CardContent>
        </Card>

        {/* Delete account */}
        <Card>
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted mb-4">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete your account</DialogTitle>
                  <DialogDescription>
                    This will permanently delete your account, all your events, and all associated data.
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <Input
                    label='Type "DELETE" to confirm'
                    value={deleteConfirmText}
                    onChange={(e) => {
                      setDeleteConfirmText(e.target.value);
                      if (deleteError) setDeleteError('');
                    }}
                    error={deleteError}
                    disabled={isDeleting}
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </div>

                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setDeleteConfirmText('');
                      setDeleteError('');
                    }}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                  >
                    {isDeleting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Deleting...
                      </>
                    ) : (
                      'Delete account'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
