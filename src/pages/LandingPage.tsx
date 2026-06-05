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

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  const { isLight, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallInstructions(true);
    }
  };

  useEffect(() => {
    if (!loading && user && profile && !isLoggingIn) {
      navigate('/dashboard');
    }
  }, [user, profile, loading, isLoggingIn, navigate]);

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!pin) return;
    
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
        const userData: any = {
          userId: loggedUser.uid,
          email: loggedUser.email,
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
            onClick={handleInstallClick} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center gap-2 shadow-lg border border-emerald-500/20 active:scale-95 transition-all text-xs font-semibold px-4 py-2.5 backdrop-blur font-sans"
          >
            <Download size={14} />
            <span>Install App</span>
          </Button>
        </div>
      )}
      <div
        className="w-full max-w-md z-10 mx-4 animate-in fade-in zoom-in duration-500"
      >
        <Card className="glass-card">
          <CardHeader className="space-y-4 text-center pb-6 border-b border-[rgba(255,255,255,0.1)]">
            <div className="flex justify-center mb-6 mt-4 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-orange-600 shadow-xl shadow-orange-500/20 ring-1 ring-white/20">
                  <Compass className="w-11 h-11 text-white animate-spin-slow" style={{ animationDuration: '16s' }} />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500"></span>
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <h2 className="text-3xl font-black tracking-widest leading-none font-sans uppercase">
                    <span className="text-white">SKO </span>
                    <span className="text-[#ff9900]">VBooking</span>
                  </h2>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-2">
                    Vehicle Tracking & Dispatch
                  </span>
                </div>
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

            <div className="text-center pt-4 animate-in fade-in duration-1000 delay-300">
              <p className="text-xs text-[#A0A0A0]">
                Contact your Admin Department to get your PIN.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showInstallInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-left">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" />
              Install to Home Screen
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              Access SKO VBooking instantly as a mobile app from your home screen with rapid response times and beautiful mobile optimizations.
            </p>
            
            <div className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-amber-400 block mb-1">For iOS (Apple Safari)</span>
                <p className="text-slate-300 leading-relaxed">
                  1. Tap the <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Share 📤</strong> button at the bottom of Safari.<br className="mb-0.5" />
                  2. Scroll down and tap <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Add to Home Screen ➕</strong>.<br className="mb-0.5" />
                  3. Tap <strong className="text-white bg-orange-500 px-1.5 py-0.5 rounded font-mono">Add</strong> in the top right corner.
                </p>
              </div>
              
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-sky-400 block mb-1">For Android / Chrome</span>
                <p className="text-slate-300 leading-relaxed">
                  1. Tap the <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Menu ⁝</strong> (three dots) in the browser header.<br className="mb-0.5" />
                  2. Tap <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Install app</strong> or <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Add to Home screen</strong>.
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowInstallInstructions(false)} 
              className="w-full mt-5 bg-[#ff9900] hover:bg-[#e68a00] text-black font-extrabold py-2.5 rounded-xl transition-all"
            >
              Understand & Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
