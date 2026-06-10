import React, { useState, useEffect } from 'react';
import { X, Smartphone, Copy, Check, Download, ExternalLink, Share2, MoreVertical, PlusSquare, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InstallPWAProps {
  isOpen: boolean;
  onClose: () => void;
}

type PlatformTab = 'install' | 'ios' | 'android' | 'desktop';

export function InstallPWA({ isOpen, onClose }: InstallPWAProps) {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<PlatformTab>('ios');
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Check if running in an iframe (e.g., inside AI Studio preview)
    setIsInIframe(window.self !== window.top);

    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
      setActiveTab('install'); // Auto-select direct install if natively supported
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect user agent for auto tab selection as backup
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setActiveTab('ios');
    } else if (/android/.test(ua)) {
      setActiveTab('android');
    } else if (!supportsPWA) {
      setActiveTab('desktop');
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [supportsPWA]);

  const handleCopyLink = () => {
    const appUrl = window.location.origin;
    navigator.clipboard.writeText(appUrl)
      .then(() => {
        setCopied(true);
        toast.success("Quick access link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy URL:", err);
        toast.error("Could not copy link automatically. Please manually copy the URL from your address bar.");
      });
  };

  const handleInstallClick = async () => {
    if (!promptInstall) return;
    await promptInstall.prompt();
    const { outcome } = await promptInstall.userChoice;
    if (outcome === 'accepted') {
      setSupportsPWA(false);
      onClose();
      toast.success("Thank you for installing! VBooking has been added to your device.");
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank', 'noreferrer,noopener');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-left overflow-hidden ring-1 ring-blue-500/10">
        
        {/* Glow indicator at the top corner */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-[40px] pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-600/10 rounded-full blur-[40px] pointer-events-none"></div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer focus:outline-none z-10"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
        
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2.5 font-sans">
          <Smartphone className="w-5 h-5 text-blue-400 animate-pulse" />
          Install VBooking WebApp
        </h3>
        
        <p className="text-xs text-slate-400 mb-5 leading-relaxed font-sans">
          Secure, ultra-lightweight launcher is saved to your phone's home screen or app launcher. Loads instantly.
        </p>

        {/* ⚠️ IFRAME ALERT */}
        {isInIframe && (
          <div className="mb-5 p-3.5 bg-amber-950/20 border border-amber-900/30 rounded-2xl space-y-2.5 animate-in slide-in-from-top-1">
            <div className="flex gap-2 text-amber-400">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold leading-normal">Preview Container Detected</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-normal font-sans">
                  Browsers disable app installs inside nested previews. Please open VBooking in a direct browser tab first.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenNewTab}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-slate-950 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open VBooking in New Tab
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 mb-5 text-xs font-medium font-sans">
          {supportsPWA && (
            <button
              onClick={() => setActiveTab('install')}
              className={`pb-2.5 px-2 -mb-px outline-none transition-all cursor-pointer ${
                activeTab === 'install' 
                  ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Install
            </button>
          )}
          <button
            onClick={() => setActiveTab('ios')}
            className={`pb-2.5 px-3 -mb-px outline-none transition-all cursor-pointer ${
              activeTab === 'ios' 
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            iPhone (iOS)
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`pb-2.5 px-3 -mb-px outline-none transition-all cursor-pointer ${
              activeTab === 'android' 
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Android
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`pb-2.5 px-3 -mb-px outline-none transition-all cursor-pointer ${
              activeTab === 'desktop' 
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Desktop
          </button>
        </div>

        {/* Tab Contents */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 mb-6 font-sans select-none">
          {activeTab === 'install' && supportsPWA && (
            <div className="space-y-4 animate-in fade-in duration-200 text-center py-2">
              <p className="text-xs text-slate-300 leading-relaxed max-w-[280px] mx-auto">
                Your mobile phone / browser fully supports instant single-tap app installer! Click the button below:
              </p>
              <button 
                onClick={handleInstallClick}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer focus:outline-none text-xs active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                Add Shortcut to Home Screen Now
              </button>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3.5 animate-in fade-in duration-200 text-slate-300">
              <p className="text-[11px] text-amber-400/90 font-medium mb-1">iOS Safari Install Guide:</p>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold mt-0.5 font-mono">1</span>
                <p className="text-xs">Open the <span className="text-blue-400 font-bold">Safari app</span> and navigate to VBooking.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold mt-0.5 font-mono">2</span>
                <div className="text-xs space-y-1">
                  <p className="flex items-center gap-1.5 flex-wrap">
                    Tap the safari <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 inline-flex items-center font-bold text-[10px] gap-1"><Share2 className="w-3 h-3" /> Share</span> action button.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold mt-0.5 font-mono">3</span>
                <p className="text-xs flex items-center gap-1.5 flex-wrap">
                  Scroll down the share sheet menu list and item tap <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded border border-slate-700 font-bold text-[10px] inline-flex items-center gap-1"><PlusSquare className="w-3 h-3 text-blue-400" /> Add to Home Screen</span>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3.5 animate-in fade-in duration-200 text-slate-300">
              <p className="text-[11px] text-amber-400/90 font-medium mb-1">Android Mobile Browser Guide:</p>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold mt-0.5 font-mono">1</span>
                <p className="text-xs">Open the <span className="text-blue-400 font-bold font-sans">Chrome app</span> or mobile web browser.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold mt-0.5 font-mono">2</span>
                <p className="text-xs flex items-center gap-1.5 flex-wrap">
                  Tap the <span className="bg-slate-850 text-slate-200 px-1 py-0.5 rounded border border-slate-700/60 font-bold inline-flex items-center gap-0.5 text-[10px]"><MoreVertical className="w-3.5 h-3.5" /> Menu Button</span> at the corner of your screen.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold mt-0.5 font-mono">3</span>
                <p className="text-xs flex items-center gap-1.5 flex-wrap">
                  Select <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded border border-slate-700 font-bold text-[10px] inline-flex items-center gap-1"><Download className="w-3 h-3 text-blue-400" /> Install app</span> or <span className="text-slate-200 font-semibold font-sans text-xs">Add to Home screen</span>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-3.5 animate-in fade-in duration-200 text-slate-300">
              <p className="text-[11px] text-amber-400/90 font-medium mb-1">Desktop Computer Guide:</p>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold mt-0.5 font-mono">1</span>
                <p className="text-xs">Look in your desktop browser's address bar at the top-right corner.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold mt-0.5 font-mono">2</span>
                <p className="text-xs flex items-center gap-1 flex-wrap">
                  Tap the computer <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 border border-blue-500/20 rounded inline-flex items-center gap-1 font-bold text-[10px]"><Download className="w-3 h-3" /> Install icon</span> in the bar.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold mt-0.5 font-mono">3</span>
                <p className="text-xs font-sans">App will install instantly and a desktop shortcut icon will appear.</p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Fallback Copy Utility */}
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 text-center font-sans">
            Unable to install? Copy URL to open inside Chrome or Safari browser:
          </p>
          <button
            onClick={handleCopyLink}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 active:scale-[0.98] text-slate-200 hover:text-white font-medium rounded-xl transition-all border border-slate-800 hover:border-slate-700 flex items-center justify-center gap-2 cursor-pointer text-xs focus:outline-none"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
            {copied ? 'Link Copied successfully!' : 'Copy Direct URL Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

