import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/Button';
import { Download } from 'lucide-react';

export default function Layout({ children, title }: { children: React.ReactNode, title: string }) {
  const { profile } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };
  
  const handleSignOut = () => {
    signOut(auth);
  };
  
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col font-sans">
      <header className="bg-white border-b border-blue-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Logo Mimic */}
          <div className="hidden sm:flex relative w-10 h-10 items-center justify-center mr-2">
            <div className="absolute w-5 h-5 bg-[#4a90e2] rounded-[1px] rotate-45 -translate-x-2 opacity-90"></div>
            <div className="absolute w-5 h-5 bg-[#6ca6ed] rounded-[1px] rotate-45 opacity-80 mix-blend-multiply"></div>
            <div className="absolute w-5 h-5 bg-[#8ab4f8] rounded-[1px] rotate-45 translate-x-2 opacity-70 mix-blend-multiply"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              <span className="font-serif italic mr-1 text-[#4a90e2]">Sanken</span>
              {title}
            </h1>
            <p className="text-xs text-[#5c9ce6] uppercase tracking-wider font-bold mt-0.5">{profile?.role} Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-slate-600">
          {isInstallable && (
            <Button variant="outline" size="sm" onClick={handleInstallClick} className="border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 text-emerald-700 transition-colors gap-2 items-center flex">
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Install App</span>
            </Button>
          )}
          <span className="text-sm font-medium hidden sm:inline-block bg-blue-50 px-3 py-1 rounded-full text-blue-800 border border-blue-100">{profile?.name || profile?.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="border-blue-200 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors">
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
