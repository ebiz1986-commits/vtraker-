import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/Button';
import { Download, Menu, Bell, CheckCheck, Trash2, Inbox, Sun, Moon, Compass } from 'lucide-react';
import { toast } from 'sonner';

export default function Layout({ children, title }: { children: React.ReactNode, title: string }) {
  const { profile } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallInstructions(true);
    }
  };
  
  const handleSignOut = () => {
    signOut(auth);
  };
  
  const { isLight, toggleTheme } = useTheme();
  const isDarkTheme = !isLight;
  
  return (
    <div className="min-h-screen flex flex-col font-sans relative bg-transparent text-[#E0E0E0]">
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <header className={`bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] border-[rgba(255,255,255,0.1)] border-b px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.1)]`}>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20 ring-1 ring-white/20">
              <Compass className="w-5.5 h-5.5 text-white animate-spin-slow" style={{ animationDuration: '12s' }} />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1 leading-none mt-0.5">
                <span className="text-lg font-black tracking-wider text-white uppercase font-sans">
                  SKO
                </span>
                <span className="text-lg font-black tracking-wider text-[#ff9900] uppercase font-sans">
                  VBooking
                </span>
              </div>
              <span className="text-[8px] font-bold text-slate-400/80 tracking-widest uppercase mt-0.5">
                Dispatch System
              </span>
            </div>
          </div>
          {title && (
            <div className={`hidden sm:flex border-l border-[rgba(255,255,255,0.1)] pl-6 items-center`}>
              <h1 className={`text-lg font-bold tracking-tight ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>{title}</h1>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 sm:gap-4 text-[#E0E0E0] relative z-10`}>
          {!isStandalone && (
            <Button variant="outline" size="sm" onClick={handleInstallClick} className={`gap-1.5 items-center flex border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 font-sans font-bold px-3 py-1.5 h-auto text-xs rounded-xl shadow-lg shadow-emerald-500/5`}>
              <Download className="w-3.5 h-3.5" /> <span>Install</span>
            </Button>
          )}

          {/* Global High-Contrast Sunlight Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme} 
            className="transition-all rounded-full hover:bg-[rgba(255,255,255,0.08)] active:scale-95 flex items-center justify-center border border-transparent hover:border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]"
            title={isLight ? "Switch to Dark Mode" : "Switch to High-Contrast Sunlight Mode"}
          >
            {isLight ? (
              <Moon className="w-5 h-5 text-amber-600 fill-amber-600" />
            ) : (
              <Sun className="w-5 h-5 text-orange-400 fill-orange-400" />
            )}
          </Button>

          <span className={`text-sm font-medium hidden sm:inline-block px-3 py-1 rounded-full border bg-[rgba(255,255,255,0.05)] text-[#E0E0E0] border-[rgba(255,255,255,0.1)]`}>{profile?.name?.split(' ')[0] || profile?.email?.split('@')[0]}</span>
          
          {/* Real-time Notification System Dropdown Drop-in */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowNotifications(!showNotifications)} 
              className={`transition-colors rounded-full hover:bg-[rgba(255,255,255,0.08)] relative`}
            >
              <Bell className="w-5 h-5 text-[#A0A0A0]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-[#0a0f1c]">
                  {unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-100">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-500/10 text-red-400 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <>
                        <button 
                          onClick={() => markAllAsRead()} 
                          className="p-1 px-1.5 rounded text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1"
                          title="Mark all as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                          <span className="hidden sm:inline">Read All</span>
                        </button>
                        <button 
                          onClick={() => clearAll()} 
                          className="p-1 px-1.5 rounded text-[11px] font-medium text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                          title="Clear history"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span className="hidden sm:inline">Clear</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="max-h-[350px] overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-[#A0A0A0] flex flex-col items-center justify-center gap-2">
                      <Inbox className="w-8 h-8 opacity-40 shrink-0" />
                      <p className="text-xs">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((noti) => (
                      <div 
                        key={noti.id} 
                        onClick={() => !noti.read && markAsRead(noti.id)}
                        className={`p-4 transition-all hover:bg-white/5 cursor-pointer flex gap-3 ${!noti.read ? 'bg-blue-500/5' : 'opacity-80'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={`text-xs font-bold truncate ${!noti.read ? 'text-[#ff9900]' : 'text-slate-300'}`}>
                              {noti.title}
                            </p>
                            <span className="text-[9px] text-slate-500 shrink-0 mt-0.5">
                              {new Date(noti.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed break-words">
                            {noti.description}
                          </p>
                        </div>
                        {!noti.read && (
                          <div className="relative flex-shrink-0 self-center">
                            <span className="absolute -left-1 -top-1 animate-ping h-2.5 w-2.5 rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
      {showInstallInstructions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-left">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" />
              Install to Home Screen
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              Access SKO VBooking instantly as a mobile app from your home screen with rapid response times and beautiful mobile optimizations.
            </p>
            
            <div className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-amber-400 block mb-1">For iOS (Apple Safari)</span>
                <p className="text-slate-300 leading-relaxed">
                  1. Tap the <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Share 📤</strong> button at the bottom of Safari.<br className="mb-0.5" />
                  2. Scroll down and tap <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Add to Home Screen ➕</strong>.<br className="mb-0.5" />
                  3. Tap <strong className="text-white bg-orange-500 px-1.5 py-0.5 rounded font-mono">Add</strong> in the top right corner.
                </p>
              </div>
              
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-sky-400 block mb-1">For Android / Chrome</span>
                <p className="text-slate-300 leading-relaxed">
                  1. Tap the <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Menu ⁝</strong> (three dots) in the browser header.<br className="mb-0.5" />
                  2. Tap <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Install app</strong> or <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">Add to Home screen</strong>.
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowInstallInstructions(false)} 
              className="w-full mt-5 bg-[#ff9900] hover:bg-[#e68a00] text-black font-extrabold py-2.5 rounded-xl transition-all"
            >
              Understand & Close
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
