import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (!loading && user && profile) {
      navigate('/dashboard');
    }
  }, [user, profile, loading, navigate]);

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const role = user.email === 'ebiz1986@gmail.com' ? 'admin' : 'user';
        const userData: any = {
          userId: user.uid,
          email: user.email,
          role,
          createdAt: serverTimestamp()
        };
        if (user.displayName) {
          userData.name = user.displayName;
        }
        try {
          await setDoc(userDocRef, userData);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'users');
        }
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Google Login failed:", error);
      setLoginError(error.message);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!email || !pin) return;
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, pin);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const role = user.email === 'ebiz1986@gmail.com' ? 'admin' : 'user';
        const userData: any = {
          userId: user.uid,
          email: user.email,
          role,
          createdAt: serverTimestamp()
        };
        if (user.displayName) {
          userData.name = user.displayName;
        }
        try {
          await setDoc(userDocRef, userData);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'users');
        }
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error("PIN Login failed:", error);
      setLoginError("Invalid email or PIN. Only admins can create PIN accounts.");
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="flex h-screen items-center justify-center bg-blue-50 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[50%] bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <Card className="w-full max-w-md z-10 mx-4 border border-blue-100 bg-white/90 backdrop-blur-xl shadow-2xl shadow-blue-900/10 relative overflow-hidden text-slate-800">
        <CardHeader className="space-y-4 text-center pb-6 border-b border-blue-50">
          <div className="flex justify-center mb-2">
            {/* SVG mimicking the Sanken Overseas logo */}
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute w-8 h-8 bg-[#4a90e2] rounded-[1px] rotate-45 -translate-x-3 opacity-90"></div>
                <div className="absolute w-8 h-8 bg-[#6ca6ed] rounded-[1px] rotate-45 opacity-80 mix-blend-multiply"></div>
                <div className="absolute w-8 h-8 bg-[#8ab4f8] rounded-[1px] rotate-45 translate-x-3 opacity-70 mix-blend-multiply"></div>
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[28px] font-black tracking-tight text-slate-900 drop-shadow-sm font-serif italic">Sanken</span>
                <span className="text-[28px] font-black tracking-tight text-slate-900 drop-shadow-sm font-serif italic -mt-1.5">Overseas</span>
              </div>
            </div>
          </div>
          <CardDescription className="text-sm font-medium text-blue-600/80">
            VBooking • Vehicle Tracking & Dispatch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {loginError && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
              {loginError}
            </div>
          )}
          <form onSubmit={handlePinLogin} className="space-y-4">
            <div>
               <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
               <input 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4a90e2] focus:border-[#4a90e2] focus:outline-none text-slate-900 placeholder-slate-400"
                 placeholder="name@example.com"
                 required
               />
            </div>
            <div>
               <label className="text-sm font-medium text-slate-700 block mb-1">PIN Code</label>
               <input 
                 type="password" 
                 inputMode="numeric"
                 value={pin}
                 onChange={(e) => setPin(e.target.value)}
                 className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#4a90e2] focus:border-[#4a90e2] focus:outline-none text-slate-900 placeholder-slate-400"
                 placeholder="Enter 6-digit PIN"
                 required
                 minLength={6}
               />
            </div>
            <Button type="submit" size="lg" className="w-full rounded-lg bg-[#4a90e2] text-white hover:bg-[#3a7ac8] font-bold h-12 text-base shadow-md hover:shadow-blue-500/25 transition-all">
              Sign in with PIN
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
               <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-medium">
               <span className="bg-white px-3 text-slate-400">Or</span>
            </div>
          </div>
          
          <div className="flex justify-center pb-2">
            <Button size="lg" variant="outline" onClick={handleGoogleLogin} className="w-full rounded-lg h-12 text-base border-slate-200 bg-blue-50/50 text-slate-700 hover:bg-blue-50 hover:text-slate-900 transition-all font-medium">
              Sign in with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
