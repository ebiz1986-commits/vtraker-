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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#040612] font-sans select-none">
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

        @keyframes gold-glow-pulse {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(223, 149, 20, 0.45), 0 0 12px rgba(255, 215, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.25);
          }
          50% {
            box-shadow: 0 4px 35px rgba(223, 149, 20, 0.85), 0 0 25px rgba(255, 215, 0, 0.55), inset 0 1px 2px rgba(255, 255, 255, 0.4);
          }
        }
        .animate-gold-glow {
          animation: gold-glow-pulse 2s infinite ease-in-out;
        }

        @keyframes border-glow-move {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -1200;
          }
        }
        @keyframes border-glow-flash {
          0%, 100% {
            opacity: 0.4;
            filter: drop-shadow(0 0 2px rgba(223, 149, 20, 0.5));
          }
          50% {
            opacity: 1;
            filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.95)) drop-shadow(0 0 24px rgba(223, 149, 20, 0.7));
          }
        }
        .animate-border-glow-run {
          animation: border-glow-move 10s linear infinite, border-glow-flash 3s ease-in-out infinite alternate;
        }

        @keyframes orb-zoom-glow {
          0%, 100% {
            transform: scale(0.9);
            box-shadow: 0 0 10px rgba(223, 149, 20, 0.5), 0 0 15px rgba(255, 215, 0, 0.3);
            filter: brightness(0.9);
          }
          50% {
            transform: scale(1.85);
            box-shadow: 0 0 25px rgba(255, 215, 0, 1), 0 0 45px rgba(223, 149, 20, 0.95), 0 0 65px rgba(255, 255, 255, 0.85);
            filter: brightness(1.4);
          }
        }
        .animate-orb-glow-pulse {
          animation: orb-zoom-glow 3.5s infinite ease-in-out;
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

      {/* Luxury Background Tech Grid & Map Vector Nodes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Fine Indigo Grid */}
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(99, 102, 241, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Global Dispatch coordinate text */}
        <div className="absolute top-6 left-6 font-mono text-[9px] text-slate-500/50 tracking-widest hidden md:block">
          <div>SYS_NODE: SKO_SYS_ACTIVE</div>
          <div>LOC_LAT: 6.9271° N</div>
          <div>LOC_LON: 79.8612° E</div>
        </div>

        {/* Dynamic Floating Ambient Luxury Orbs */}
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -50, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[15%] left-[10%] w-[380px] h-[380px] bg-blue-600/10 rounded-full filter blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -30, 50, 0],
            y: [0, 40, -40, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-[10%] right-[10%] w-[420px] h-[420px] bg-[#df9514]/5 rounded-full filter blur-[140px]"
        />

        {/* Left Map Continent Vector Group */}
        <svg className="absolute left-[2%] lg:left-[5%] top-[25%] w-[260px] h-[260px] opacity-[0.12] hidden md:block" viewBox="0 0 200 200" fill="none">
          <circle cx="40" cy="50" r="2" fill="#3b82f6" />
          <circle cx="50" cy="45" r="1.5" fill="#3b82f6" />
          <circle cx="60" cy="55" r="2.5" fill="#3b82f6" />
          <circle cx="70" cy="65" r="2" fill="#3b82f6" />
          <circle cx="55" cy="70" r="3" fill="#3b82f6" />
          <circle cx="80" cy="80" r="1.5" fill="#3b82f6" />
          <circle cx="90" cy="75" r="2.5" fill="#3b82f6" />
          <circle cx="100" cy="90" r="2" fill="#3b82f6" />
          <circle cx="110" cy="110" r="3" fill="#3b82f6" />
          <circle cx="120" cy="100" r="1.5" fill="#3b82f6" />
          <path d="M40 50 L60 55 L70 65 L90 75 L110 110" stroke="rgba(59, 130, 246, 0.25)" strokeWidth="0.75" strokeDasharray="3 3"/>
          <path d="M50 45 L60 55 L55 70 L100 90 L120 100" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="0.75" strokeDasharray="2 2"/>
        </svg>

        {/* Right Map Continent Vector Group */}
        <svg className="absolute right-[2%] lg:right-[5%] top-[35%] w-[260px] h-[260px] opacity-[0.12] hidden md:block" viewBox="0 0 200 200" fill="none">
          <circle cx="160" cy="60" r="2" fill="#3b82f6" />
          <circle cx="150" cy="75" r="2.5" fill="#3b82f6" />
          <circle cx="140" cy="90" r="1.5" fill="#3b82f6" />
          <circle cx="130" cy="80" r="3" fill="#3b82f6" />
          <circle cx="120" cy="110" r="2" fill="#3b82f6" />
          <circle cx="110" cy="125" r="1.5" fill="#3b82f6" />
          <circle cx="100" cy="140" r="2.5" fill="#3b82f6" />
          <circle cx="90" cy="150" r="2" fill="#3b82f6" />
          <path d="M160 60 L150 75 L130 80 L120 110 L100 140" stroke="rgba(59, 130, 246, 0.25)" strokeWidth="0.75" strokeDasharray="3 3"/>
          <path d="M150 75 L140 90 L120 110 L110 125 L90 150" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="0.75" strokeDasharray="2 2"/>
        </svg>

        {/* Central Ambient Glow Spotlights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#df9514]/5 blur-[90px] rounded-full pointer-events-none" />
      </div>

      {/* Primary Card Container - Sized according to executive mockup layout */}
      <div className="w-[calc(100%-32px)] min-[370px]:w-full max-w-[430px] z-10 mx-auto relative group">
        {/* Dynamic Running Gold Border Glow */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible" xmlns="http://www.w3.org/2000/svg">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            rx="40"
            ry="40"
            fill="none"
            stroke="url(#cardRunningBorderGrad)"
            strokeWidth="3"
            className="animate-border-glow-run"
            style={{
              strokeDasharray: '150 450',
            }}
          />
          <defs>
            <linearGradient id="cardRunningBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#df9514" />
              <stop offset="30%" stopColor="#ffd700" />
              <stop offset="70%" stopColor="#a36306" />
              <stop offset="100%" stopColor="#df9514" />
            </linearGradient>
          </defs>
        </svg>

        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="w-full rounded-[40px] p-6 min-[410px]:p-10 relative overflow-hidden bg-[#060a17]/92 border border-amber-500/20 backdrop-blur-2xl"
          style={{
            boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.9), 0 0 50px rgba(223, 149, 20, 0.12), inset 0 0 1px 1px rgba(255, 255, 255, 0.12)'
          }}
        >
          {/* Top Edge Ambient Light Gleam */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] h-[2.5px] bg-gradient-to-r from-transparent via-[#ffd700] to-transparent shadow-[0_0_12px_rgba(255,215,0,0.8)]" />

          {/* Bottom Edge Ambient Light Gleam */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[180px] h-[2.5px] bg-gradient-to-r from-transparent via-[#df9514] to-transparent shadow-[0_0_12px_rgba(223,149,20,0.6)]" />

          {/* Form Content */}
          <form onSubmit={handlePinLogin} className="flex flex-col gap-6 min-[410px]:gap-7 relative z-10">
            {/* Logo Area & Brand Header */}
            <div className="flex flex-col items-center justify-center gap-1.5 min-[375px]:gap-2.5 select-none text-center">
              {/* Three Overlapping Glossy Blue Diamonds */}
              <div className="flex items-center justify-center mb-0.5">
                <svg viewBox="0 0 160 90" className="w-36 h-20 min-[400px]:w-44 min-[400px]:h-24 overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="diamondGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e5cb3" />
                      <stop offset="100%" stopColor="#3d8cf0" />
                    </linearGradient>
                    <linearGradient id="diamondGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2572e0" />
                      <stop offset="100%" stopColor="#5ea5ff" />
                    </linearGradient>
                    <linearGradient id="diamondGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b8cf3" />
                      <stop offset="100%" stopColor="#8cc1ff" />
                    </linearGradient>
                    <filter id="diamondDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.45" />
                    </filter>
                  </defs>

                  {/* Left Diamond */}
                  <g transform="translate(48, 45) rotate(45)" filter="url(#diamondDropShadow)">
                    <rect 
                      x="-22" 
                      y="-22" 
                      width="44" 
                      height="44" 
                      rx="6" 
                      fill="url(#diamondGrad1)" 
                    />
                  </g>
                  
                  {/* Middle Diamond */}
                  <g transform="translate(80, 45) rotate(45)" filter="url(#diamondDropShadow)">
                    <rect 
                      x="-22" 
                      y="-22" 
                      width="44" 
                      height="44" 
                      rx="6" 
                      fill="url(#diamondGrad2)" 
                    />
                  </g>
                  
                  {/* Right Diamond */}
                  <g transform="translate(112, 45) rotate(45)" filter="url(#diamondDropShadow)">
                    <rect 
                      x="-22" 
                      y="-22" 
                      width="44" 
                      height="44" 
                      rx="6" 
                      fill="url(#diamondGrad3)" 
                    />
                  </g>
                </svg>
              </div>

              {/* Company Title & Subtitle */}
              <div className="flex flex-col items-center">
                <h1 className="font-sans font-extrabold tracking-[0.14em] text-2xl min-[410px]:text-3xl text-white uppercase leading-none">
                  SANKEN OVERSEAS
                </h1>
                <p className="text-[10px] min-[410px]:text-[11px] tracking-[0.24em] font-black uppercase text-[#df9a28] mt-3 font-mono text-center">
                  VEHICLE TRACKING & DISPATCH SYSTEM
                </p>
              </div>
            </div>

            {/* Glowing Divider Line with Centered Gold Lens Flare Orb */}
            <div className="relative w-full py-2 flex items-center justify-center">
              <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#df9514]/35 to-transparent" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-[#df9514] border border-[#ffe3a1] animate-orb-glow-pulse" />
            </div>

            {/* Form Error Notification Banner */}
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 text-xs rounded-xl text-center font-bold border border-red-500/30 text-red-300 bg-red-950/40 backdrop-blur-md"
              >
                {loginError}
              </motion.div>
            )}

            {/* Input PIN Entry Block */}
            <div className="space-y-4">
              <div className="text-center text-[11px] font-bold tracking-[0.22em] uppercase font-sans text-slate-300">
                ENTER 6-DIGIT PIN
              </div>
              
              {/* Gold Gilded Capsule Container */}
              <div 
                onClick={handleContainerClick}
                className={`relative rounded-[24px] px-8 py-5.5 flex justify-between items-center w-full max-w-[310px] mx-auto cursor-pointer transition-all duration-300 bg-[#040715]/90 border border-[#df9514]/40 ${
                  isFocused 
                    ? 'border-[#df9514] shadow-[0_0_20px_rgba(223,149,20,0.22)]' 
                    : ''
                }`}
                style={{
                  boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.45)'
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const hasDigit = pin.length > i;
                  return (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                        hasDigit 
                          ? 'bg-gradient-to-b from-[#ffdfa1] via-[#df9514] to-[#a36306] shadow-[0_0_12px_#df9514]' 
                          : 'border-2 border-[#df9514]/65 bg-transparent'
                      }`}
                    />
                  );
                })}
                
                {/* Fully hidden HTML input laid transparently on top */}
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

            {/* Secure Authentication Status Banner */}
            <div className="flex items-center justify-center gap-2 select-none text-[10px] font-bold tracking-[0.22em] text-slate-500 uppercase">
              <ShieldCheck className="w-5 h-5 text-cyan-400 filter drop-shadow-[0_0_6px_rgba(34,211,238,0.6)] stroke-[2]" />
              <span>SECURE AUTHENTICATION</span>
            </div>

            {/* Gilded Metallic Authorization Button */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoggingIn || pin.length < 6}
              className="relative w-full py-4 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-[0.16em] text-[#1a0f02] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed group overflow-hidden whitespace-nowrap bg-gradient-to-b from-[#ffd166] via-[#df9514] to-[#ad6c09] border border-[#ffe5a3]/50 animate-gold-glow"
            >
              {/* Gold specular highlight beam sweep on hover */}
              <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shimmer" />

              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 text-[#1a0f02] animate-spin" />
                  <span>Authorizing Access...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4.5 h-4.5 text-[#1a0f02] stroke-[2.5]" />
                  <span>AUTHORIZE ACCESS</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Privacy GPS Disclaimer bar */}
          <div className="mt-6 text-center select-none relative z-10 px-2">
            <p className="text-[11px] font-semibold text-[#df9a28] flex items-center justify-center gap-1.5 leading-relaxed max-w-[325px] mx-auto">
              <span>⚠️</span>
              <span>This app is not using your GPS location, or any other personal information.</span>
            </p>
          </div>

          {/* Bottom Divider */}
          <div className="relative w-full py-4 flex items-center justify-center">
            <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#df9514]/25 to-transparent" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-[#df9514] shadow-[0_0_8px_#df9514]" />
          </div>

          {/* Copyright Branding Footer */}
          <div className="text-center text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase select-none">
            COPYRIGHT © {new Date().getFullYear()} @SKOADMIN. ALL RIGHTS RESERVED.
          </div>
        </motion.div>
      </div>

      <InstallPWA isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} />
    </div>
  );
}

