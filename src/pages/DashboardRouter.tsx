import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import DriverDashboard from './DriverDashboard';
import UserDashboard from './UserDashboard';

export default function DashboardRouter() {
  const { profile, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading Role...</div>;
  }
  
  if (!profile) {
    // Has user object but no profile doc yet, maybe it's still being created.
    return <div className="flex h-screen items-center justify-center">Setting up your profile...</div>;
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
