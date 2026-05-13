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
    <div className="flex h-screen items-center justify-center bg-[linear-gradient(135deg,#0F1419_0%,#1A1F26_100%)] text-[#E0E0E0] relative overflow-hidden">
      <div
        className="w-full max-w-md z-10 mx-4 animate-in fade-in zoom-in duration-500"
      >
        <Card className="glass-card">
          <CardHeader className="space-y-4 text-center pb-6 border-b border-[rgba(255,255,255,0.1)]">
            <div className="flex justify-center mb-6 mt-4 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div className="flex items-center">
                <img src="/icon.svg" alt="Sanken Overseas Logo" className="w-20 h-20 mr-2" />
                <div className="flex flex-col items-start leading-none pt-1">
                  <div style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    <span className="text-4xl font-serif font-black tracking-wider text-[#E0E0E0] italic">Sanken</span>
                  </div>
                  <div style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    <span className="text-4xl font-serif font-black tracking-wider text-[#E0E0E0] ml-6 italic">Overseas</span>
                  </div>
                </div>
              </div>
            </div>
            <CardDescription className="text-sm font-medium text-[#A0A0A0]">
              VBooking • Vehicle Tracking & Dispatch
            </CardDescription>
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
    </div>
  );
}
