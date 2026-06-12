import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/Button';
import { Download, Menu, Bell, CheckCheck, Trash2, Inbox, Sun, Moon, Compass, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { InstallPWA } from './InstallPWA';
import { SankenLogo } from './SankenLogo';

export default function Layout({ children, title }: { children: React.ReactNode, title: string }) {
  const { profile } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();
  }, []);

  
  const handleSignOut = () => {
    signOut(auth);
  };
  
  const { isLight, theme, setTheme, toggleTheme } = useTheme();
  const isDarkTheme = !isLight;
  
  return (
    <div className="min-h-screen flex flex-col font-sans relative bg-transparent text-[#E0E0E0]">
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <header className={`bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] border-[rgba(255,255,255,0.1)] border-b px-4 sm:px-6 py-3 flex flex-col gap-3 sticky top-0 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.1)]`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
              <SankenLogo 
                iconSize="md" 
                subtitle={profile?.role === 'driver' ? "" : undefined} 
              />
            {title && (
              <div className={`hidden sm:flex border-l border-[rgba(255,255,255,0.1)] pl-4 items-center`}>
                <h1 className={`text-lg font-bold tracking-tight ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>{title}</h1>
              </div>
            )}
          </div>
        </div>
        <div className={`flex items-center justify-end gap-2 sm:gap-4 text-[#E0E0E0] relative z-10`}>

          {!isStandalone && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsInstallOpen(true)} 
              className="gap-1 items-center flex border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 font-sans font-semibold px-2 sm:px-2.5 py-1 h-7 text-[10px] rounded-lg shadow focus:outline-none cursor-pointer"
              title="Install Shortcut"
            >
              <Download className="w-3 h-3" /> <span className="hidden sm:inline">Install</span>
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
              <Moon className="w-5 h-5 text-indigo-600 fill-indigo-600" />
            ) : (
              <Sun className="w-5 h-5 text-indigo-400 fill-indigo-400 animate-pulse" />
            )}
          </Button>

          <span className={`text-sm font-medium hidden sm:inline-block px-3 py-1 rounded-full border bg-[rgba(255,255,255,0.05)] text-[#E0E0E0] border-[rgba(255,255,255,0.1)]`}>{profile?.name?.split(' ')[0] || profile?.email?.split('@')[0]}</span>
          
          {/* Real-time Notification System Dropdown Drop-in */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setShowNotifications(!showNotifications);
              }} 
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

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut} 
            className="transition-colors flex items-center justify-center gap-1.5 border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] hover:bg-red-500/15 hover:border-red-500/20 hover:text-red-400 text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 h-8 rounded-lg"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>
      <main 
        className="flex-1 p-3.5 sm:p-6 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        {children}
      </main>

      <InstallPWA isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} />

      </div>
    </div>
  );
}
