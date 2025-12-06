import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Lock, IdCard, UserPlus, Bot } from 'lucide-react';
import { UserRole } from '@/types';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('marketer');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!staffId.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your Staff ID',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (!password.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your password',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await signIn(staffId, password);
        if (error) {
          toast({
            title: 'Login Failed',
            description: error.message || 'Invalid Staff ID or password',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Login Successful',
            description: 'Welcome to DFR Empire ERP System',
          });
          navigate('/dashboard');
        }
      } else {
        if (!fullName.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Please fill in all required fields',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(staffId, password, fullName, role);
        if (error) {
          toast({
            title: 'Registration Failed',
            description: error.message || 'Could not create account',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Registration Successful',
            description: 'Your account has been created. You can now login.',
          });
          setIsLogin(true);
          setStaffId('');
          setPassword('');
          setFullName('');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">
            <span className="text-primary">DFR</span>
            <span className="text-foreground">Empire</span>
          </h1>
          <p className="text-muted-foreground mt-2">Enterprise Resource Planning System</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <h2 className="text-xl font-bold text-foreground mb-1">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {isLogin ? 'Welcome back! Enter your Staff ID to continue.' : 'Fill in the details to create your account.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staffId">ID Staff</Label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="staffId"
                  type="text"
                  placeholder="e.g., MR-001, AD-001, BOD"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                  minLength={3}
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketer">Marketer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="bod">BOD (Board of Directors)</SelectItem>
                      <SelectItem value="logistic">Logistic</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button type="submit" className="w-full h-11 mt-2" disabled={isLoading}>
              {isLoading
                ? isLogin
                  ? 'Signing in...'
                  : 'Creating account...'
                : isLogin
                ? 'Sign In'
                : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary font-medium hover:underline"
            >
              {isLogin ? 'Create one here' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
