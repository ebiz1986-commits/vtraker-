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
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-zinc-500 capitalize">{profile?.role} Panel</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium hidden sm:inline-block">{profile?.name || profile?.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
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
