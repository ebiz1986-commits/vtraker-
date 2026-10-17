import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ShieldCheck, Lock, RefreshCw, ArrowRight } from 'lucide-react';
import { InstallPWA } from '../components/InstallPWA';
import { clearBrowserCacheMemory } from '../lib/cacheUtils';
import { motion, AnimatePresence } from 'motion/react';

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  useTheme();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Custom interaction states
  const [isFocused, setIsFocused] = useState(false);
  const [shake, setShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();
  }, []);

  useEffect(() => {
    if (!loading && user && profile && !isLoggingIn && !isSuccess) {
      navigate('/dashboard');
    }
  }, [user, profile, loading, isLoggingIn, navigate, isSuccess]);

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!pin || pin.length < 6) return;

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

      // Brief success flash before routing to the dashboard
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);

    } catch (error: any) {
      console.error("PIN Login failed:", error);
      setLoginError(error.message || "Invalid PIN code. Please contact the admin department to get your pin code.");
      setShake(true);
      setPin(''); // Reset on failure
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 justify-center items-center h-screen w-full bg-[#070d1a] text-sky-400 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-slate-400">Loading System…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-y-auto font-sans select-none py-10 px-4 bg-[#070d1a]">
      <style>{`
        @keyframes sg-shimmer {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(250%) skewX(-15deg); }
        }
        .sg-shimmer { animation: sg-shimmer 2.8s infinite ease-in-out; }
      `}</style>

      {/* Success flash overlay */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-white pointer-events-none"
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Background: navy gradient, fine grid, soft blue glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1324] via-[#070d1a] to-[#05080f]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(96, 165, 250, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(96, 165, 250, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -40, 30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[12%] left-[8%] w-[380px] h-[380px] bg-sky-500/10 rounded-full blur-[130px]"
        />
        <motion.div
          animate={{ x: [0, -30, 40, 0], y: [0, 40, -30, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[8%] right-[8%] w-[420px] h-[420px] bg-blue-700/10 rounded-full blur-[150px]"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] bg-sky-600/[0.07] blur-[140px] rounded-full" />
        {/* Faint brand monogram watermark */}
        <img
          src="/sanken-gen-mark.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] max-w-[560px] opacity-[0.045]"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] z-10 relative">
        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="w-full rounded-[28px] sm:rounded-[32px] p-6 min-[410px]:p-9 relative overflow-hidden bg-[#0b1526]/90 border border-white/10 backdrop-blur-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)]"
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />

          <form onSubmit={handlePinLogin} className="flex flex-col gap-6 relative z-10">
            {/* Brand header */}
            <div className="flex flex-col items-center text-center">
              <div className="rounded-2xl bg-white px-5 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                <img
                  src="/sanken-gen-logo.png"
                  alt="Sanken Gen"
                  className="h-11 min-[400px]:h-14 w-auto object-contain"
                  draggable={false}
                />
              </div>
              <p className="text-[10px] min-[410px]:text-[11px] tracking-[0.26em] font-bold uppercase text-sky-300/80 mt-5">
                Vehicle Tracking &amp; Dispatch System
              </p>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3.5 text-xs rounded-xl text-center font-semibold border border-red-500/30 text-red-300 bg-red-950/40"
                >
                  {loginError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* PIN entry */}
            <div className="space-y-3.5">
              <div className="text-center text-[11px] font-bold tracking-[0.22em] uppercase text-slate-400">
                Enter 6-digit PIN
              </div>

              <div
                onClick={handleContainerClick}
                className={`relative rounded-2xl px-7 py-5 flex justify-between items-center w-full max-w-[300px] mx-auto cursor-text transition-all duration-300 bg-[#060c18] border ${
                  isFocused
                    ? 'border-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.15)]'
                    : 'border-white/10'
                }`}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const hasDigit = pin.length > i;
                  const isNext = pin.length === i && isFocused;
                  return (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        hasDigit
                          ? 'bg-gradient-to-b from-sky-300 to-blue-600 shadow-[0_0_10px_rgba(56,189,248,0.7)]'
                          : isNext
                            ? 'border-2 border-sky-400'
                            : 'border-2 border-white/20'
                      }`}
                    />
                  );
                })}

                <input
                  ref={inputRef}
                  type="password"
                  pattern="\d*"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 6) setPin(val);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                  disabled={isLoggingIn}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
            </div>

            {/* Secure auth note */}
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
              <ShieldCheck className="w-4 h-4 text-sky-400 stroke-[2]" />
              <span>Secure Authentication</span>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoggingIn || pin.length < 6}
              className="relative w-full py-4 px-6 rounded-2xl font-bold text-sm uppercase tracking-[0.14em] text-white transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden whitespace-nowrap bg-gradient-to-b from-sky-500 to-blue-700 border border-sky-400/40 shadow-[0_8px_24px_rgba(37,99,235,0.35)]"
            >
              <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:sg-shimmer" />
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authorizing…</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>Authorize Access</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </motion.button>
          </form>

          {/* GPS disclaimer */}
          <div className="mt-6 text-center px-2">
            <p className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5 leading-relaxed max-w-[325px] mx-auto">
              <span>🔒</span>
              <span>This app does not use your GPS location or any other personal information.</span>
            </p>
          </div>

          {/* Divider + footer */}
          <div className="relative w-full py-4 flex items-center justify-center">
            <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-sky-500/70" />
          </div>
          <div className="text-center text-[9px] font-bold tracking-[0.2em] text-slate-600 uppercase">
            © {new Date().getFullYear()} Sanken Gen · All Rights Reserved
          </div>
        </motion.div>
      </div>

      <InstallPWA isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} />
    </div>
  );
}
