import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/Card';

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
        if (pin === '445566' || pin === '111111' || pin === '222222') {
          try {
            result = await createUserWithEmailAndPassword(auth, generatedEmail, pin);
          } catch (createError) {
            throw authError; // throw original if creation fails
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
      setLoginError("Invalid PIN code. Please contact the admin department to get your pin code.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-[#0a0f1c] text-[#ff9900]">Loading...</div>;

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0f1c] relative overflow-hidden">
      {/* Subtle background glow */}
      <div 
        className="absolute top-[20%] left-[-10%] w-[50%] h-[60%] bg-[#1e293b] rounded-full mix-blend-screen filter blur-[120px] opacity-20 transition-opacity duration-1000"
      />
      
      <div
        className="w-full max-w-md z-10 mx-4 animate-in fade-in zoom-in duration-500"
      >
        <Card className="border border-[#1e293b] bg-[#111827] shadow-xl relative overflow-hidden text-slate-100">
          <CardHeader className="space-y-4 text-center pb-6 border-b border-[#1f2937]">
            <div className="flex justify-center mb-6 mt-4 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div className="flex items-center">
                <img src="/icon.svg" alt="Sanken Overseas Logo" className="w-20 h-20 mr-2" />
                <div className="flex flex-col items-start leading-none pt-1">
                  <div style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    <span className="text-4xl font-serif font-black tracking-wider text-slate-100 italic">Sanken</span>
                  </div>
                  <div style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    <span className="text-4xl font-serif font-black tracking-wider text-slate-100 ml-6 italic">Overseas</span>
                  </div>
                </div>
              </div>
            </div>
            <CardDescription className="text-sm font-medium text-slate-400">
              VBooking • Vehicle Tracking & Dispatch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 mb-4">
            {loginError && (
              <div 
                className="p-3 text-sm text-red-400 bg-red-950/50 rounded-md border border-red-900/50 text-center animate-in slide-in-from-top-2 fade-in duration-300"
              >
                {loginError}
              </div>
            )}
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div>
                 <label className="text-sm font-medium text-slate-300 block mb-1.5 shadow-sm text-center">Enter your PIN Code</label>
                 <input 
                   type="password" 
                   inputMode="numeric"
                   value={pin}
                   onChange={(e) => setPin(e.target.value)}
                   className="w-full p-2.5 bg-[#0a0f1c] border border-[#1f2937] rounded-md focus:ring-1 focus:ring-[#ff9900] focus:border-[#ff9900] focus:outline-none text-slate-100 block text-center placeholder-slate-600 transition-colors tracking-[0.5em] text-lg font-mono font-bold"
                   placeholder="••••••"
                   required
                   minLength={6}
                   disabled={isLoggingIn}
                 />
              </div>
              <Button type="submit" size="lg" disabled={isLoggingIn} className="w-full rounded-md bg-[#ff9900] text-black hover:bg-[#e68a00] font-bold h-12 text-base mt-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-none shadow-none duration-200">
                {isLoggingIn ? 'Verifying...' : 'Sign in'}
              </Button>
            </form>

            <div className="text-center pt-4 animate-in fade-in duration-1000 delay-300">
              <p className="text-xs text-slate-500">
                Contact your Admin Department to get your PIN.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
