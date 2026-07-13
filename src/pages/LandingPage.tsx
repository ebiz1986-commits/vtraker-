import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/Button';
import { Download, Sun, Moon, ShieldCheck, Lock, RefreshCw } from 'lucide-react';
import { InstallPWA } from '../components/InstallPWA';
import { clearBrowserCacheMemory } from '../lib/cacheUtils';
import { motion, AnimatePresence } from 'motion/react';

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  const { isLight, toggleTheme } = useTheme();
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
      
      // Trigger a dramatic cinematic camera flash effect on success
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
      <div className="flex flex-col gap-4 justify-center items-center h-screen w-full bg-[#050814] text-orange-500 font-sans">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-xs font-bold tracking-[0.2em] uppercase">Loading System...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden transition-colors duration-500 font-sans select-none ${
      isLight ? 'bg-slate-50' : 'bg-[#050814]'
    }`}>
      {/* Embedded High-Performance CSS Animations */}
      <style>{`
        @keyframes shimmer-sweep {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(250%) skewX(-15deg); }
        }
        .animate-shimmer {
          animation: shimmer-sweep 2.5s infinite ease-in-out;
        }
        
        @keyframes subtle-lens-pulse {
          0%, 100% { transform: scale(1) opacity(0.8); filter: blur(2px); }
          50% { transform: scale(1.4) opacity(1); filter: blur(3px); }
        }
        .animate-lens {
          animation: subtle-lens-pulse 3s infinite ease-in-out;
        }

        @keyframes card-glare-rotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-glare {
          animation: card-glare-rotate 12s infinite linear;
        }

        @keyframes alert-glow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        .animate-warning-flash {
          animation: alert-glow 2s infinite ease-in-out;
        }
      `}</style>

      {/* Cinematic Camera Flash Success Overlay */}
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

      {/* Tech Grid Background (Hidden or subtle in sunlight mode) */}
      {!isLight && (
        <>
          <div 
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
          {/* Constellation overlay tracking nodes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                style={{
                  left: `${10 + i * 12}%`,
                  top: `${15 + (i % 3) * 25}%`,
                  opacity: 0.15,
                  filter: 'blur(1px)',
                }}
                animate={{
                  opacity: [0.08, 0.35, 0.08],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.4,
                }}
              />
            ))}
          </div>

          {/* Core Radial Color Glow Spotlights */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
        </>
      )}

      {/* Primary Card Container */}
      <div className="w-full max-w-[360px] z-10 mx-4 flex flex-col gap-5">
        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
          className={`w-full rounded-[28px] p-7.5 relative overflow-hidden transition-all duration-500 ${
            isLight 
              ? 'bg-white border-2 border-[#0c1222] shadow-[8px_8px_0px_#0c1222]' 
              : 'bg-[#0a1226]/55 border border-[#1e4cb0]/30 backdrop-blur-3xl shadow-[0_0_80px_rgba(0,149,255,0.18)]'
          }`}
          style={!isLight ? {
            boxShadow: '0 0 80px rgba(0, 149, 255, 0.15), inset 0 0 1px 1px rgba(255, 255, 255, 0.08)'
          } : undefined}
        >
          {/* Subtle top ambient glowing flare for dark mode card border */}
          {!isLight && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] h-[3px] bg-gradient-to-r from-transparent via-[#FF8C00]/40 to-transparent blur-[0.5px]" />
          )}

          {/* Form Content */}
          <form onSubmit={handlePinLogin} className="flex flex-col gap-7 relative z-10">
            {/* Logo Area & Brand Header */}
            <div className="flex flex-col items-center justify-center gap-2.5 select-none text-center">
              {/* Three Overlapping Solid Gradient Diamonds from the second image */}
              <div className="flex items-center justify-center mb-1">
                <svg viewBox="0 0 160 80" className="w-44 h-22 overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    {/* Diamond 1: deeper blue to sky blue */}
                    <linearGradient id="solidGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e5cb3" />
                      <stop offset="100%" stopColor="#3d8cf0" />
                    </linearGradient>
                    {/* Diamond 2: bright blue to light blue */}
                    <linearGradient id="solidGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2572e0" />
                      <stop offset="100%" stopColor="#5ea5ff" />
                    </linearGradient>
                    {/* Diamond 3: light cyan blue to soft sky blue */}
                    <linearGradient id="solidGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b8cf3" />
                      <stop offset="100%" stopColor="#8cc1ff" />
                    </linearGradient>
                    <filter id="diamondGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Left Diamond */}
                  <g transform="translate(45, 40) rotate(45)">
                    <rect 
                      x="-19" 
                      y="-19" 
                      width="38" 
                      height="38" 
                      rx="4" 
                      fill="url(#solidGrad1)" 
                      opacity="0.88"
                      filter="url(#diamondGlow)"
                    />
                  </g>
                  
                  {/* Middle Diamond */}
                  <g transform="translate(73, 40) rotate(45)">
                    <rect 
                      x="-19" 
                      y="-19" 
                      width="38" 
                      height="38" 
                      rx="4" 
                      fill="url(#solidGrad2)" 
                      opacity="0.92"
                      filter="url(#diamondGlow)"
                    />
                  </g>
                  
                  {/* Right Diamond */}
                  <g transform="translate(101, 40) rotate(45)">
                    <rect 
                      x="-19" 
                      y="-19" 
                      width="38" 
                      height="38" 
                      rx="4" 
                      fill="url(#solidGrad3)" 
                      opacity="0.96"
                      filter="url(#diamondGlow)"
                    />
                  </g>
                </svg>
              </div>

              {/* Company Title */}
              <div className="flex flex-col items-center">
                <h1 className={`font-sans font-extrabold tracking-[0.16em] text-2xl uppercase leading-none ${
                  isLight ? 'text-[#0c1222]' : 'text-white'
                }`}>
                  SANKEN OVERSEAS
                </h1>
                <p className={`text-[9px] tracking-[0.32em] uppercase font-black mt-2.5 font-mono ${
                  isLight ? 'text-amber-700' : 'text-[#f95a02] animate-pulse'
                }`}>
                  VEHICLE TRACKING & DISPATCH SYSTEM
                </p>
              </div>
            </div>

            {/* Glowing Divider Line with Centered Lens Flare */}
            <div className="relative w-full py-2.5 flex items-center justify-center">
              <div className={`absolute left-0 right-0 h-[1px] ${
                isLight ? 'bg-[#0c1222]' : 'bg-gradient-to-r from-transparent via-[#f95a02]/45 to-transparent'
              }`} />
              {!isLight && (
                <>
                  <div className="w-20 h-[3px] bg-gradient-to-r from-transparent via-[#f95a02] to-transparent absolute filter blur-[1px] animate-flare-line" />
                  <div className="absolute w-3 h-3 rounded-full animate-flare-dot" />
                  <div className="absolute w-6 h-0.5 bg-white rounded-full filter blur-[0.5px] animate-flare-core" />
                </>
              )}
            </div>

            {/* Error Message */}
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 text-xs rounded-xl text-center font-bold border ${
                  isLight 
                    ? 'text-red-700 bg-red-100 border-red-400' 
                    : 'text-red-400 bg-red-900/15 border-red-900/30'
                }`}
              >
                {loginError}
              </motion.div>
            )}

            {/* Input PIN Section */}
            <div className="space-y-4">
              <div className={`text-center text-[10px] font-black tracking-[0.22em] uppercase font-sans ${
                isLight ? 'text-slate-700' : 'text-slate-400'
              }`}>
                ENTER 6-DIGIT PIN
              </div>
              
              {/* Sleek Custom Dark Translucent Capsule for the PIN digits */}
              <div 
                onClick={handleContainerClick}
                className={`relative rounded-2xl px-6 py-5 flex justify-between items-center w-full max-w-[270px] mx-auto cursor-pointer transition-all duration-300 ${
                  isLight 
                    ? 'bg-slate-100 border-2 border-[#0c1222] shadow-[3px_3px_0px_#0c1222]' 
                    : `bg-[#070b1a]/95 border ${
                        isFocused 
                          ? 'border-orange-500/50 shadow-[0_0_20px_rgba(249,90,2,0.15)]' 
                          : 'border-white/10'
                      }`
                }`}
                style={!isLight ? {
                  boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.55), 0 0 10px rgba(0,149,255,0.02)'
                } : undefined}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const hasDigit = pin.length > i;
                  return (
                    <motion.div
                      key={i}
                      animate={{
                        scale: hasDigit ? [1, 1.35, 1.1] : 1,
                        backgroundColor: hasDigit ? '#ffffff' : isLight ? 'rgba(12, 18, 34, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        boxShadow: !isLight && hasDigit 
                          ? '0 0 12px #ffffff, 0 0 4px rgba(255, 255, 255, 0.8)'
                          : 'none',
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                        !hasDigit && !isLight ? 'border border-white/5' : ''
                      }`}
                    />
                  );
                })}
                
                {/* Fully transparent hidden input overlaid natively */}
                <input
                  ref={inputRef}
                  type="password"
                  pattern="\d*"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 6) {
                      setPin(val);
                    }
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isLoggingIn}
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            {/* Secure Authentication Indicator */}
            <div className={`flex items-center justify-center gap-2 select-none text-[9.5px] font-black tracking-[0.2em] uppercase ${
              isLight ? 'text-slate-600' : 'text-slate-500'
            }`}>
              <ShieldCheck className={`w-4 h-4 ${isLight ? 'text-blue-700' : 'text-cyan-500/80 animate-pulse'}`} />
              <span>SECURE AUTHENTICATION</span>
            </div>

            {/* Authorize Access Lock Button */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoggingIn || pin.length < 6}
              className={`relative w-full py-3.5 px-5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest text-white transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden whitespace-nowrap ${
                isLight 
                  ? 'bg-orange-600 border-2 border-[#0c1222] text-white shadow-[4px_4px_0px_#0c1222] hover:bg-orange-700' 
                  : 'bg-gradient-to-r from-orange-600 via-[#f95a02] to-amber-500 shadow-[0_4px_20px_rgba(249,90,2,0.4),0_0_10px_rgba(249,90,2,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_28px_rgba(249,90,2,0.55)]'
              }`}
            >
              {/* Shimmer sweeping beam */}
              {!isLight && (
                <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shimmer" />
              )}

              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                  <span>Authorizing Access...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  <span>Authorize Access</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Privacy GPS Notice disclaimer banner */}
          <div className="mt-6 text-center select-none relative z-10">
            <p className={`text-[10px] font-bold px-4 leading-normal ${
              isLight ? 'text-slate-700' : 'text-amber-500/85'
            }`}>
              ⚠️ This app is not using your GPS location, or any other personal information.
            </p>
          </div>

          {/* Copyright Branding footer */}
          <div className={`text-center text-[9px] font-black tracking-wider uppercase select-none mt-6 pt-4 border-t relative z-10 ${
            isLight ? 'text-slate-500 border-slate-200' : 'text-slate-600 border-white/5'
          }`}>
            Copyright © {new Date().getFullYear()} <span className="font-bold">@SKOADMIN</span>. All Rights Reserved.
          </div>
        </motion.div>
      </div>

      <InstallPWA isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} />
    </div>
  );
}

