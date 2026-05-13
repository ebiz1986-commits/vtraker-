import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/Button';
import { Download, Menu, Bell } from 'lucide-react';

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
    <div className={`min-h-screen flex flex-col font-sans relative ${isDarkTheme ? 'bg-[#050505] text-slate-100' : 'bg-[#f0f4f8] text-slate-800'}`}>
      {isDarkTheme && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none w-full h-full">
          <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[120px]" />
          <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
      )}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <header className={`${isDarkTheme ? 'bg-white/5 backdrop-blur-[20px] border-white/10' : 'bg-white border-blue-100'} border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.1)]`}>
        <div className="flex items-center gap-4">
          <Menu className={`w-6 h-6 sm:hidden ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`} />
          <div className="flex flex-col text-center w-full absolute left-0 sm:relative sm:text-left pointer-events-none">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 leading-none">
              <span className={`text-[1.35rem] font-medium tracking-[0.25em] uppercase ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>Sanken</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-medium mt-1 text-[#f97316]">Overseas</p>
          </div>
        </div>
        <div className={`flex items-center gap-4 ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'} relative z-10`}>
          {isInstallable && (
            <Button variant="outline" size="sm" onClick={handleInstallClick} className={`gap-2 items-center flex ${isDarkTheme ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 text-emerald-700'}`}>
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Install App</span>
            </Button>
          )}
          <span className={`text-sm font-medium hidden sm:inline-block px-3 py-1 rounded-full border ${isDarkTheme ? 'bg-white/5 text-slate-200 border-white/10' : 'bg-blue-50 text-blue-800 border-blue-100'}`}>{profile?.name?.split(' ')[0] || profile?.email?.split('@')[0]}</span>
          <Button variant="ghost" size="icon" onClick={() => {}} className={`transition-colors rounded-full rounded-r-none pr-0 hover:bg-transparent`}>
            <Bell className="w-5 h-5 text-slate-300" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut} className={`transition-colors hidden sm:flex ${isDarkTheme ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white' : 'border-blue-200 hover:bg-blue-50 hover:text-blue-700 text-slate-600'}`}>
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
