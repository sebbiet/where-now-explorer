
import React, { useState } from 'react';
import { LogIn, LogOut, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';

const AuthButton = () => {
  const { user, loading, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    const { error } = await signInWithEmail(email);
    setIsSubmitting(false);

    if (!error) {
      setIsOpen(false);
      setEmail('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-10 h-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
        disabled
      >
        <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </Button>
    );
  }

  if (user) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-10 h-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
        onClick={handleSignOut}
        aria-label="Sign out"
      >
        <LogOut className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-10 h-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
          aria-label="Sign in"
        >
          <LogIn className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Sign in with Magic Link
          </DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a magic link to sign in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSignIn} className="space-y-4">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
          />
          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting || !email.trim()}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Magic Link
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthButton;
