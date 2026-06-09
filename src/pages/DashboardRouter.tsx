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
             name: user.displayName || (user.email ? user.email.split('@')[0] : '') || 'Unknown User',
             role,
             createdAt: serverTimestamp()
           });
        } catch (e) {
           console.error("Failed to bootstrap user", e);
           handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`);
        }
      };
      createProfile();
    } else if (!loading && user && profile) {
      // Ensure ebiz1986@gmail.com is always admin and repair empty or unconfigured profile name
      const needsAdminFix = user.email === 'ebiz1986@gmail.com' && profile.role !== 'admin';
      const needsNameFix = !profile.name || profile.name.trim() === '' || profile.name === 'Unknown' || profile.name === 'Unknown User';
      
      if (needsAdminFix || needsNameFix) {
        const repairProfile = async () => {
          try {
            const updates: any = {};
            if (needsAdminFix) {
              updates.role = 'admin';
            }
            if (needsNameFix) {
              const emailLocalPart = user.email ? user.email.split('@')[0] : '';
              updates.name = user.displayName || emailLocalPart || 'Unknown User';
            }
            await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
          } catch (e) {
            console.error("Failed to repair profile in DashboardRouter", e);
          }
        };
        repairProfile();
      }
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

