import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sendPushNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, options);
      }
    });
  }
}

// Global AudioContext singleton to preserve unlocked state across user interactions
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// Auto-unlock AudioContext on first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      }).catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

export function playNotificationSound() {
  // Mobile haptic vibration if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 350]);
    } catch (e) {
      // Ignore vibration error if blocked by permissions
    }
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Force resume audio context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Function to produce a loud, bright, multi-tone chime with high gain (0.85 max volume)
    const playLoudChime = (freq1: number, freq2: number, start: number, duration: number, gainLevel: number = 0.85) => {
      // Primary Oscillator (Sine for purity & punch)
      const osc1 = ctx.createOscillator();
      // Secondary Harmonic Oscillator (Triangle for bright projection)
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(freq1, start);
      osc2.frequency.setValueAtTime(freq2, start);

      // High Volume Gain Envelope
      gain.gain.setValueAtTime(0.01, start);
      gain.gain.linearRampToValueAtTime(gainLevel, start + 0.02); // Fast attack
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration); // Smooth decay

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + duration);
      osc2.stop(start + duration);
    };

    // Loud 3-Stage Attention Siren Chime (A5 -> D6 -> F#6 -> A6)
    playLoudChime(880.00, 1760.00, now, 0.18, 0.85);        // Stage 1: A5 + A6
    playLoudChime(1174.66, 2349.32, now + 0.15, 0.20, 0.90); // Stage 2: D6 + D7
    playLoudChime(1479.98, 2959.96, now + 0.32, 0.22, 0.90); // Stage 3: F#6 + F#7
    playLoudChime(1760.00, 3520.00, now + 0.50, 0.45, 0.95); // Stage 4: High A6 (Sustained Loud Peak)

    // Repeat a secondary accent chime 0.8s later to guarantee maximum user alert notice
    playLoudChime(1174.66, 2349.32, now + 0.85, 0.18, 0.85);
    playLoudChime(1760.00, 3520.00, now + 1.00, 0.40, 0.90);

  } catch (error) {
    console.warn('Audio alert could not be played:', error);
  }
}

