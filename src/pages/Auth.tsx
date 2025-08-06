
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, isLoading, error, clearError, isAuthenticated, isInitialized } = useAuthStore();
  
  const isLogin = location.pathname === '/login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // Redirect if already authenticated - but only after initialization
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      console.log('Auth: User is authenticated, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate]);

  // Clear errors when switching between login/register
  useEffect(() => {
    clearError();
    setLocalError('');
  }, [location.pathname, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!isLogin && password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      let result;
      
      if (isLogin) {
        console.log('Auth: Attempting sign in...');
        result = await signIn(email, password);
        
        if (!result.error) {
          toast.success('Successfully signed in!');
          // Navigation will be handled by the auth state change
        }
      } else {
        console.log('Auth: Attempting sign up...');
        result = await signUp(email, password);
        
        if (!result.error) {
          toast.success('Check your email for verification link!');
          navigate('/login');
          return;
        }
      }
      
      if (result.error) {
        const errorMessage = result.error.message || 'An error occurred';
        setLocalError(errorMessage);
        toast.error(errorMessage);
      }
      
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred';
      setLocalError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isLogin ? 'Sign in to your account' : 'Create an account'}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin 
              ? 'Enter your email and password to sign in' 
              : 'Enter your details to create your account'
            }
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {displayError && (
              <Alert variant="destructive">
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </Button>
            
            <div className="text-center text-sm">
              {isLogin ? (
                <span>
                  Don't have an account?{' '}
                  <Button
                    variant="link"
                    className="p-0"
                    onClick={() => navigate('/register')}
                    disabled={isLoading}
                  >
                    Sign up
                  </Button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <Button
                    variant="link"
                    className="p-0"
                    onClick={() => navigate('/login')}
                    disabled={isLoading}
                  >
                    Sign in
                  </Button>
                </span>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
