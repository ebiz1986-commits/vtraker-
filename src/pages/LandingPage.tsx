import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      navigate('/dashboard');
    }
  }, [user, profile, loading, navigate]);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const role = user.email === 'ebiz1986@gmail.com' ? 'admin' : 'user';
        
        try {
          await setDoc(userDocRef, {
            userId: user.uid,
            email: user.email,
            name: user.displayName,
            role,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'users');
        }
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[50%] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

      <Card className="w-full max-w-md z-10 mx-4 border-none shadow-xl shadow-zinc-200/50">
        <CardHeader className="space-y-3 text-center pb-8">
          <CardTitle className="text-3xl font-bold tracking-tight text-zinc-900">FleetTrack</CardTitle>
          <CardDescription className="text-base">
            Vehicle Booking & Tracking System
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button size="lg" onClick={handleLogin} className="w-full max-w-sm rounded-full bg-zinc-900 text-white hover:bg-zinc-800 h-12 text-base shadow-md">
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
