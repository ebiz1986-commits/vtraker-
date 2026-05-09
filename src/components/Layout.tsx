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
  
  const isDarkTheme = true;
  
  return (
    <div className={`min-h-screen flex flex-col font-sans ${isDarkTheme ? 'bg-[#0a0f1c] text-slate-100' : 'bg-[#f0f4f8] text-slate-800'}`}>
      <header className={`${isDarkTheme ? 'bg-[#111827] border-[#1f2937]' : 'bg-white border-blue-100'} border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm`}>
        <div className="flex items-center gap-2 sm:gap-4">
          <img 
            src="/icon.svg" 
            alt="Logo" 
            className="hidden sm:block w-12 h-12 object-contain animate-in spin-in-12 duration-700" 
          />
          <div className="flex flex-col pt-1">
            <div className="flex items-center gap-1.5 leading-none">
              <span className={`text-xl sm:text-2xl font-serif font-black tracking-wider italic ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>Sanken</span>
              <span className={`text-xl sm:text-2xl font-serif font-black tracking-wider italic ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>Overseas</span>
            </div>
            <p className={`text-[10px] uppercase tracking-wider font-bold mt-1.5 max-w-[200px] sm:max-w-none truncate ${isDarkTheme ? 'text-[#ff9900]' : 'text-[#4B90D6]'}`}>{title} - {profile?.role}</p>
          </div>
        </div>
        <div className={`flex items-center gap-4 ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
          {isInstallable && (
            <Button variant="outline" size="sm" onClick={handleInstallClick} className={`gap-2 items-center flex ${isDarkTheme ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 text-emerald-700'}`}>
              <Download className="w-3.5 h-3.5" /> <span>Install App</span>
            </Button>
          )}
          <span className={`text-sm font-medium hidden sm:inline-block px-3 py-1 rounded-full border ${isDarkTheme ? 'bg-[#1e293b] text-slate-200 border-[#334155]' : 'bg-blue-50 text-blue-800 border-blue-100'}`}>{profile?.name || profile?.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut} className={`transition-colors ${isDarkTheme ? 'border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white' : 'border-blue-200 hover:bg-blue-50 hover:text-blue-700 text-slate-600'}`}>
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
  );
}
