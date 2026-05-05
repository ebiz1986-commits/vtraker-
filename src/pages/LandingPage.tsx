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
    <div className="flex h-screen items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] bg-slate-800 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[50%] bg-amber-900/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      <Card className="w-full max-w-md z-10 mx-4 border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-black relative overflow-hidden text-slate-100">
        <CardHeader className="space-y-3 text-center pb-6 border-b border-slate-800">
          <CardTitle className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span className="text-amber-500">SANKEN</span>OVERSEAS
          </CardTitle>
          <CardDescription className="text-sm font-medium text-slate-400">
            VBooking • Vehicle Tracking & Dispatch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {loginError && (
            <div className="p-3 text-sm text-red-300 bg-red-950/50 rounded-md border border-red-900/50">
              {loginError}
            </div>
          )}
          <form onSubmit={handlePinLogin} className="space-y-4">
            <div>
               <label className="text-sm font-medium text-slate-300 block mb-1">Email</label>
               <input 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-white placeholder-slate-600"
                 placeholder="name@example.com"
                 required
               />
            </div>
            <div>
               <label className="text-sm font-medium text-slate-300 block mb-1">PIN Code</label>
               <input 
                 type="password" 
                 inputMode="numeric"
                 value={pin}
                 onChange={(e) => setPin(e.target.value)}
                 className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none text-white placeholder-slate-600"
                 placeholder="Enter 6-digit PIN"
                 required
                 minLength={6}
               />
            </div>
            <Button type="submit" size="lg" className="w-full rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold h-12 text-base shadow-lg hover:shadow-amber-500/25 transition-all">
              Sign in with PIN
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
               <span className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-medium">
               <span className="bg-slate-900 px-3 text-slate-500">Or</span>
            </div>
          </div>
          
          <div className="flex justify-center pb-2">
            <Button size="lg" variant="outline" onClick={handleGoogleLogin} className="w-full rounded-lg h-12 text-base border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-800 hover:text-white transition-all">
              Sign in with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
