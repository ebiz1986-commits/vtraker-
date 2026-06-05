import React, { useState, useEffect } from 'react';
import { X, Smartphone, Share, Copy, Check, ExternalLink, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Determine iframe residency
    const insideIframe = window.self !== window.top;
    setIsInIframe(insideIframe);

    // Check if device is iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);
      
    // Check if already installed / standalone
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    // Initial check of local dismiss state
    const isDismissed = localStorage.getItem('vbooking_pwa_dismissed') === 'true';
    setDismissed(isDismissed);

    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleCopyLink = () => {
    // Get absolute URL of the web server
    const appUrl = window.location.origin;
    navigator.clipboard.writeText(appUrl)
      .then(() => {
        setCopied(true);
        toast.success("App URL copied to clipboard!");
        setTimeout(() => setCopied(false), 2500);
      })
      .catch((err) => {
        console.error("Failed to copy URL:", err);
        toast.error("Could not auto-copy. Please copy from the address bar.");
      });
  };

  const handleLaunchExternal = () => {
    window.open(window.location.origin, '_blank');
  };

  const handleInstallClick = async () => {
    if (!promptInstall) {
      return;
    }
    await promptInstall.prompt();
    const { outcome } = await promptInstall.userChoice;
    if (outcome === 'accepted') {
      setSupportsPWA(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('vbooking_pwa_dismissed', 'true');
    setDismissed(true);
  };

  // If already added to home screen / standalone app, don't show prompt
  if (isStandalone) {
    return null;
  }

  // If dismissed, don't display
  if (dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 glass-card p-5 shadow-2xl z-50 flex flex-col gap-4 border border-orange-500/20">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-orange-600/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">Add VBooking Shortcut Icon</h4>
            <p className="text-[11px] text-slate-400">Zero-install direct link to phone screen</p>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* CORE EXPLANATION */}
      <div className="text-xs text-slate-300 leading-relaxed space-y-2 font-sans">
        <p>
          Yes! This saves a **lightweight launcher shortcut** with a custom icon directly on your telephone home screen. You **do not need to download or install** any heavy application files from any App Store. It is instant and occupies <span className="text-white font-semibold">0 MB</span> of space.
        </p>
        <p className="border-l-2 border-slate-700 pl-2 text-slate-400 italic">
          To protect you from random websites silently cluttering your screen, phone operating systems require adding the icon shortcut manually through your browser menu.
        </p>
      </div>

      {/* CONDITIONAL RENDERING / USER ACTIONS */}
      {isInIframe ? (
        /* SPECIAL AI STUDIO IFRAME CASE */
        <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-lg text-xs space-y-2.5">
          <div className="flex gap-2 text-amber-300 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-sans font-bold">Preview Environment Warning</span>
          </div>
          <p className="text-slate-300 leading-normal font-sans">
            Because you are testing this application inside the AI Studio frame, your mobile browser restricts standard installation popups. Open the direct link on your phone to add the shortcut elegantly!
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied URL!' : 'Copy Direct Hook URL'}
            </button>
            <button
              onClick={handleLaunchExternal}
              className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg transition-all border border-slate-700 cursor-pointer"
              title="Open full page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : isIOS ? (
        /* IOS USER FLOW */
        <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-lg space-y-2.5 text-xs text-slate-300">
          <div className="font-bold text-white flex items-center gap-1.5">
            <Share className="w-4 h-4 text-orange-400" />
            <span>iOS / Safari Guide:</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 leading-normal font-sans">
            <li>Tap the <strong className="text-orange-400">Share</strong> button at the bottom of Safari.</li>
            <li>Scroll down and select <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-semibold text-[11px]">Add to Home Screen</strong>.</li>
            <li>A beautiful VBooking icon will be saved straight to your iPhone's home grid!</li>
          </ol>
        </div>
      ) : (
        /* ANDROID / CHROME / BROWSER FLOW */
        <div className="space-y-3">
          <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-lg text-xs text-slate-400 space-y-2 leading-normal">
            <div className="font-bold text-slate-200">Android / Chrome Guide:</div>
            <p className="font-sans">
              Tap your browser’s menu <span className="font-bold">⋮</span> on the top-right and tap <strong className="text-slate-200">"Add to Home Screen"</strong> or trigger standard shortcut integration below:
            </p>
          </div>
          
          <button 
            onClick={supportsPWA ? handleInstallClick : handleCopyLink}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
          >
            <Download className="w-4 h-4" />
            {supportsPWA ? 'Add Shortcut Icon' : 'Grab Direct App URL'}
          </button>
        </div>
      )}
    </div>
  );
}
