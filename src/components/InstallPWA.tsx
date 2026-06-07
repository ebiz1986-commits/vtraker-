import React, { useState, useEffect } from 'react';
import { X, Smartphone, Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

interface InstallPWAProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallPWA({ isOpen, onClose }: InstallPWAProps) {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
        toast.error("Could not copy link automatically.");
      });
  };

  const handleInstallClick = async () => {
    if (!promptInstall) return;
    await promptInstall.prompt();
    const { outcome } = await promptInstall.userChoice;
    if (outcome === 'accepted') {
      setSupportsPWA(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-left">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer focus:outline-none"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
        
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-orange-400 animate-bounce" style={{ animationDuration: '3s' }} />
          Add VBooking Shortcut
        </h3>
        
        <p className="text-xs text-slate-300 mb-6 leading-relaxed font-sans">
          Save a quick access launcher icon directly on your telephone home screen. Occupies 0 MB of space.
        </p>

        <div className="space-y-3">
          {supportsPWA && (
            <button 
              onClick={handleInstallClick}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none text-xs"
            >
              <Download className="w-4 h-4" />
              Add Shortcut to Home Screen
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-medium rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer text-xs focus:outline-none"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-orange-400" />}
            {copied ? 'Link Copied!' : 'Copy Quick Access Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
