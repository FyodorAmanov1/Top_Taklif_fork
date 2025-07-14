import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  AuthError
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../config/firebase';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithTelegram: (telegramData: any) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Handle redirect result on page load
    const handleRedirectResult = async () => {
      try {
        setLoading(true);
        const result = await getRedirectResult(auth);
        if (result) {
          // User successfully signed in via redirect
          console.log('Redirect sign-in successful:', result.user.displayName);
          setAuthError(null);
        }
      } catch (error) {
        const authError = error as AuthError;
        console.error('Redirect result error:', authError);
        setAuthError(getAuthErrorMessage(authError));
      } finally {
        setLoading(false);
      }
    };

    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('Auth state changed - user signed in:', firebaseUser.displayName);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          provider: firebaseUser.providerData[0]?.providerId || 'email'
        });
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        console.log('Auth state changed - user signed out');
        setUser(null);
        setIsAuthenticated(false);
      }
      if (!loading) {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Helper function to get user-friendly error messages
  const getAuthErrorMessage = (error: AuthError): string => {
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email address but different sign-in credentials.';
      default:
        return error.message || 'An error occurred during sign-in. Please try again.';
    }
  };
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      
      // Configure Google provider with additional scopes if needed
      googleProvider.addScope('profile');
      googleProvider.addScope('email');
      
      // Set custom parameters
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });

      // Try popup first, fallback to redirect on mobile or if popup fails
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Use redirect on mobile devices
        await signInWithRedirect(auth, googleProvider);
      } else {
        // Use popup on desktop
        try {
          const result = await signInWithPopup(auth, googleProvider);
          console.log('Google sign-in successful:', result.user.displayName);
          setAuthError(null);
        } catch (popupError) {
          const authError = popupError as AuthError;
          if (authError.code === 'auth/popup-blocked' || authError.code === 'auth/popup-closed-by-user') {
            // Fallback to redirect if popup fails
            console.log('Popup failed, falling back to redirect');
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error) {
      const authError = error as AuthError;
      console.error('Google sign in error:', authError);
      setAuthError(getAuthErrorMessage(authError));
      throw error;
    } finally {
      if (!isMobile) {
        setLoading(false);
      }
    }
  };

  const signInWithFacebook = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      
      // Configure Facebook provider
      facebookProvider.addScope('email');
      facebookProvider.setCustomParameters({
        display: 'popup'
      });

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        await signInWithRedirect(auth, facebookProvider);
      } else {
        try {
          const result = await signInWithPopup(auth, facebookProvider);
          console.log('Facebook sign-in successful:', result.user.displayName);
          setAuthError(null);
        } catch (popupError) {
          const authError = popupError as AuthError;
          if (authError.code === 'auth/popup-blocked' || authError.code === 'auth/popup-closed-by-user') {
            console.log('Popup failed, falling back to redirect');
            await signInWithRedirect(auth, facebookProvider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error) {
      const authError = error as AuthError;
      console.error('Facebook sign in error:', authError);
      setAuthError(getAuthErrorMessage(authError));
      throw error;
    } finally {
      if (!isMobile) {
        setLoading(false);
      }
    }
  };

  const signInWithTelegram = async (telegramData: any) => {
    try {
      setLoading(true);
      setAuthError(null);
      // For Telegram, we'll create a custom user entry
      // In a real app, you'd verify the Telegram data with your backend
      const customUser: AuthUser = {
        uid: `telegram_${telegramData.id}`,
        email: null,
        displayName: `${telegramData.first_name} ${telegramData.last_name || ''}`.trim(),
        photoURL: telegramData.photo_url || null,
        provider: 'telegram'
      };
      setUser(customUser);
      setIsAuthenticated(true);
      localStorage.setItem('telegram_user', JSON.stringify(customUser));
      console.log('Telegram sign-in successful:', customUser.displayName);
    } catch (error) {
      console.error('Telegram sign in error:', error);
      setAuthError('Failed to sign in with Telegram. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Email sign-in successful');
    } catch (error) {
      const authError = error as AuthError;
      console.error('Email sign in error:', authError);
      setAuthError(getAuthErrorMessage(authError));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      console.log('Email sign-up successful:', displayName);
    } catch (error) {
      const authError = error as AuthError;
      console.error('Email sign up error:', authError);
      setAuthError(getAuthErrorMessage(authError));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      if (user?.provider === 'telegram') {
        localStorage.removeItem('telegram_user');
        setUser(null);
        setIsAuthenticated(false);
        console.log('Telegram sign-out successful');
      } else {
        await firebaseSignOut(auth);
        console.log('Firebase sign-out successful');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthError('Failed to sign out. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Check for stored Telegram user on mount
  useEffect(() => {
    const storedTelegramUser = localStorage.getItem('telegram_user');
    if (storedTelegramUser && !user && !loading) {
      const telegramUser = JSON.parse(storedTelegramUser);
      setUser(telegramUser);
      setIsAuthenticated(true);
      console.log('Restored Telegram user from storage:', telegramUser.displayName);
    }
  }, [user, loading]);

  // Clear auth error after some time
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => {
        setAuthError(null);
      }, 10000); // Clear error after 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [authError]);
  const value = {
    user,
    loading,
    isAuthenticated,
    authError,
    signInWithGoogle,
    signInWithFacebook,
    signInWithTelegram,
    signInWithEmail,
    signUpWithEmail,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};