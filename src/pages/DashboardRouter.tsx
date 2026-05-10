import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import DriverDashboard from './DriverDashboard';
import UserDashboard from './UserDashboard';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function DashboardRouter() {
  const { user, profile, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && user && !profile) {
      // Auto-bootstrap profile if missing
      const createProfile = async () => {
        try {
        const role = user.email === 'ebiz1986@gmail.com' || user.email === '445566@sanken.app' ? 'admin' : user.email === '222222@sanken.app' ? 'driver' : 'user';
           await setDoc(doc(db, 'users', user.uid), {
             userId: user.uid,
             email: user.email,
             name: user.displayName || '',
             role,
             createdAt: serverTimestamp()
           });
        } catch (e) {
           console.error("Failed to bootstrap user", e);
           handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`);
        }
      };
      createProfile();
    }
  }, [user, profile, loading]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#0a0f1c] text-slate-400 font-medium tracking-tight">Authenticating...</div>;
  }
  
  if (!profile) {
    return <div className="flex h-screen items-center justify-center bg-[#0a0f1c] text-slate-400 font-medium tracking-tight">Setting up your profile...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={
        profile.role === 'admin' ? <AdminDashboard /> :
        profile.role === 'driver' ? <DriverDashboard /> :
        <UserDashboard />
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

