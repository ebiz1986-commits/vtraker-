import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/Card';
import { Download, Sun, Moon, Compass } from 'lucide-react';
import { InstallPWA } from '../components/InstallPWA';
import { SankenLogo } from '../components/SankenLogo';
import { clearBrowserCacheMemory } from '../lib/cacheUtils';

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  const { isLight, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();
  }, []);


  useEffect(() => {
    if (!loading && user && profile && !isLoggingIn) {
      navigate('/dashboard');
    }
  }, [user, profile, loading, isLoggingIn, navigate]);

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!pin) return;
    
    // Clear browser cache memory to guarantee fresh state clean of prior session traces
    clearBrowserCacheMemory();
    
    setIsLoggingIn(true);
    const generatedEmail = `${pin}@sanken.app`;
    
    try {
      let result;
      try {
        result = await signInWithEmailAndPassword(auth, generatedEmail, pin);
      } catch (authError: any) {
        // Dynamically register the user if they do not exist yet on this Firebase instance for seamless staging
        const isAuthCredentialIssue = authError.code === 'auth/invalid-credential' || 
                                      authError.code === 'auth/user-not-found' ||
                                      authError.message?.toLowerCase().includes('invalid-credential') ||
                                      authError.message?.toLowerCase().includes('user-not-found');
        
        if (isAuthCredentialIssue && pin.length >= 6) {
          try {
            result = await createUserWithEmailAndPassword(auth, generatedEmail, pin);
          } catch (createError: any) {
            if (createError.code === 'auth/email-already-in-use' || createError.message?.toLowerCase().includes('email-already-in-use')) {
              throw new Error("Incorrect PIN entered for this user account.");
            }
            throw authError; // propagate original error
          }
        } else {
          throw authError; // propagate actual error
        }
      }

      const loggedUser = result.user;
      
      const userDocRef = doc(db, 'users', loggedUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      const role = pin === '445566' ? 'admin' : pin === '222222' ? 'driver' : 'user';

      if (!userDoc.exists()) {
        const emailLocalPart = loggedUser.email ? loggedUser.email.split('@')[0] : '';
        const defaultName = loggedUser.displayName || emailLocalPart || 'Unknown User';
        const userData: any = {
          userId: loggedUser.uid,
          email: loggedUser.email,
          name: defaultName,
          role,
          createdAt: serverTimestamp()
        };
        try {
          await setDoc(userDocRef, userData);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'users');
        }
      } else if (pin === '445566' || pin === '222222') {
        const data = userDoc.data();
        if (data && data.role !== role) {
           try {
             await setDoc(userDocRef, { role }, { merge: true });
           } catch (e) {
             console.error("Failed to update user role", e);
           }
         }
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error("PIN Login failed:", error);
      setLoginError(error.message || "Invalid PIN code. Please contact the admin department to get your pin code.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-transparent text-[#FF8C00]">Loading...</div>;

  return (
    <div className="flex h-screen items-center justify-center bg-transparent text-[#E0E0E0] relative overflow-hidden">
      {/* Floating High-Contrast Sunlight Theme Toggle */}
      <div className="absolute top-4 left-4 z-50">
        <Button 
          onClick={toggleTheme} 
          className="bg-slate-900/40 hover:bg-[#1e293b]/50 text-white rounded-full flex items-center gap-2 border border-white/10 shadow-lg px-4 py-2.5 text-xs font-semibold backdrop-blur"
          id="landing-theme-toggle"
        >
          {isLight ? (
            <>
              <Moon className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-orange-400 fill-orange-400 animate-pulse" />
              <span>Sunlight Mode</span>
            </>
          )}
        </Button>
      </div>

      {!isStandalone && (
        <div className="absolute top-4 right-4 z-50">
          <Button 
            onClick={() => setIsInstallOpen(true)} 
            className="bg-blue-600/95 hover:bg-blue-600 text-white rounded-full flex items-center gap-1.5 shadow-md border border-blue-500/35 active:scale-95 transition-all text-[10px] font-semibold px-3 py-1.5 backdrop-blur font-sans cursor-pointer h-7"
          >
            <Download size={11} />
            <span>Install</span>
          </Button>
        </div>
      )}


      <div
        className="w-full max-w-md z-10 mx-4 flex flex-col gap-6 animate-in fade-in zoom-in duration-500"
      >
        <Card className="glass-card">
          <CardHeader className="space-y-4 text-center pb-6 border-b border-[rgba(255,255,255,0.1)]">
            <div className="flex justify-center mb-4 mt-6 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div className="flex flex-col items-center gap-2">
                <SankenLogo iconSize="xl" className="flex-col text-center" shouldFade={true} />
                <p className="text-[11px] text-amber-500/90 font-medium px-6 mt-3 max-w-[280px] text-center leading-normal animate-warning-flash">
                  This app is not using your GPS location, or any other personal information.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 mb-4">
            {loginError && (
              <div 
                className="p-3 text-sm text-red-500 bg-red-900/20 rounded-lg border border-red-900/30 text-center animate-in slide-in-from-top-2 fade-in duration-300"
              >
                {loginError}
              </div>
            )}
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div>
                 <label className="label text-center">Enter your PIN Code</label>
                 <input 
                   type="password" 
                   inputMode="numeric"
                   value={pin}
                   onChange={(e) => setPin(e.target.value)}
                   className="input-field block text-center tracking-[0.5em] text-lg font-mono font-bold"
                   placeholder="••••••"
                   required
                   minLength={6}
                   disabled={isLoggingIn}
                 />
              </div>
              <Button type="submit" size="lg" disabled={isLoggingIn} className="btn-primary mt-4">
                {isLoggingIn ? 'Verifying...' : 'Sign in'}
              </Button>
            </form>

            <div className="text-center text-[10px] font-medium tracking-wider text-slate-500 select-none pb-1">
              Copyright © {new Date().getFullYear()} <span className="font-bold">@SKOADMIN</span>. All Rights Reserved.
            </div>

            <div className="text-center pt-2 animate-in fade-in duration-1000 delay-300">
              <p className="text-xs text-[#A0A0A0]">
                Contact your Admin Department to get your PIN.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <InstallPWA isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} />

    </div>
  );
}
