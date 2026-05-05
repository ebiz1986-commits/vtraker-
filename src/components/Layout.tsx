import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/Button';

export default function Layout({ children, title }: { children: React.ReactNode, title: string }) {
  const { profile } = useAuth();
  
  const handleSignOut = () => {
    signOut(auth);
  };
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
          <p className="text-sm text-amber-500 capitalize font-medium">{profile?.role} Panel</p>
        </div>
        <div className="flex items-center gap-4 text-slate-200">
          <span className="text-sm font-medium hidden sm:inline-block">{profile?.name || profile?.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="border-slate-700 hover:bg-slate-800 hover:text-white text-slate-300">
            Sign Out
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6 w-full max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
