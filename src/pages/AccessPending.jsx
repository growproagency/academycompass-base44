import React from 'react';
import { supabase } from '@/components/lib/supabaseClient';
import { useAuth } from '@/components/lib/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertCircle, LogOut } from 'lucide-react';

export default function AccessPending() {
  const { profile, user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isPending = profile?.status === 'pending';
  const isRejected = profile?.status === 'rejected';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
            isPending ? 'bg-yellow-100' : 'bg-red-100'
          }`}>
            {isPending ? (
              <Clock className="w-6 h-6 text-yellow-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isPending ? 'Access Pending' : 'Access Not Authorized'}
          </CardTitle>
          <CardDescription>
            {isPending 
              ? 'Your account is awaiting approval'
              : 'Your access request was not approved'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Status:</strong> {profile?.status || 'Unknown'}</p>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            {isPending ? (
              <>
                <p>Your account has been created and is pending approval by an administrator.</p>
                <p>You will receive an email notification once your account has been reviewed.</p>
                <p className="text-xs mt-4">If you believe this is an error, please contact your organization administrator.</p>
              </>
            ) : (
              <>
                <p>Your access to Academy Compass has not been authorized.</p>
                <p>Please contact your organization administrator for more information.</p>
              </>
            )}
          </div>

          <Button 
            onClick={handleSignOut} 
            variant="outline" 
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}