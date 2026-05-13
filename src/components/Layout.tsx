import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/Button';
import { Download, Menu, Bell } from 'lucide-react';
import { toast } from 'sonner';

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
  
  const isDarkTheme = true;
  
  return (
    <div className={`min-h-screen flex flex-col font-sans relative bg-transparent text-[#E0E0E0]'}`}>
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <header className={`bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] border-[rgba(255,255,255,0.1)] border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.1)]`}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className={`text-[1.35rem] font-medium tracking-[0.25em] uppercase ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>Sanken</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-medium mt-1 text-[#f97316]">Overseas</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 sm:gap-4 text-[#E0E0E0] relative z-10`}>
          {isInstallable && (
            <Button variant="outline" size="sm" onClick={handleInstallClick} className={`gap-2 items-center flex border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-emerald-400 hover:bg-[rgba(255,255,255,0.1)]`}>
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Install App</span>
            </Button>
          )}
          <span className={`text-sm font-medium hidden sm:inline-block px-3 py-1 rounded-full border bg-[rgba(255,255,255,0.05)] text-[#E0E0E0] border-[rgba(255,255,255,0.1)]`}>{profile?.name?.split(' ')[0] || profile?.email?.split('@')[0]}</span>
          <Button variant="ghost" size="icon" onClick={() => toast('No new notifications')} className={`transition-colors rounded-full hover:bg-[rgba(255,255,255,0.08)]`}>
            <Bell className="w-5 h-5 text-[#A0A0A0]" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut} className={`transition-colors flex border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-[#E0E0E0] hover:text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5`}>
            Sign Out
          </Button>
        </div>
      </header>
      <main 
        className="flex-1 p-6 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        {children}
      </main>
      </div>
    </div>
  );
}
