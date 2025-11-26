import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { ArrowLeft } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
        setIsLoading(false);
        setIsSubmitted(true);
    }, 1500);
  };

  return (
    <AuthLayout 
        title="Reset password" 
        subtitle="Enter your email address and we will send you a link to reset your password"
    >
      {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
      ) : (
          <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg text-sm text-foreground border border-primary/20">
                  Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
              </div>
          </div>
      )}

      <div className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-primary hover:underline inline-flex items-center">
          <ArrowLeft size={14} className="mr-2" /> Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;