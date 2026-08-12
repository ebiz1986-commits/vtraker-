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

export type SoundPreset = 
  | 'dispatch_chime' 
  | 'gentle_bell' 
  | 'digital_ping' 
  | 'urgent_siren' 
  | 'marimba_melody' 
  | 'sonar_ping'
  | 'airport_chime';

export interface SoundPresetOption {
  id: SoundPreset;
  name: string;
  icon: string;
  desc: string;
}

export const SOUND_PRESETS: SoundPresetOption[] = [
  { id: 'dispatch_chime', name: 'Sanken Dispatch Chime', icon: '📢', desc: 'Bright 4-stage multi-tone alert chime' },
  { id: 'gentle_bell', name: 'Gentle Crystal Bell', icon: '🔔', desc: 'Soft & warm harmonic crystal glass bell' },
  { id: 'digital_ping', name: 'Modern Digital Ping', icon: '📱', desc: 'Crisp two-tone smartphone notification ping' },
  { id: 'urgent_siren', name: 'Urgent Dispatch Siren', icon: '🚨', desc: 'High-pitch double pulse emergency horn' },
  { id: 'marimba_melody', name: 'Marimba Melody', icon: '🎶', desc: 'Smooth acoustic wooden marimba chord' },
  { id: 'sonar_ping', name: 'Sonar Pulse', icon: '📡', desc: 'Deep reverberating sonar ping' },
  { id: 'airport_chime', name: 'Airport Chime', icon: '✈️', desc: 'Classic 3-note airport boarding announcement' },
];

export function getNotificationSoundPreset(): SoundPreset {
  if (typeof window === 'undefined') return 'dispatch_chime';
  const saved = localStorage.getItem('sanken_notification_sound') as SoundPreset;
  if (saved && SOUND_PRESETS.some(p => p.id === saved)) {
    return saved;
  }
  return 'dispatch_chime';
}

export function setNotificationSoundPreset(preset: SoundPreset): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sanken_notification_sound', preset);
  }
}

export function playNotificationSound(customPreset?: SoundPreset) {
  const preset = customPreset || getNotificationSoundPreset();

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

    const playTone = (
      freq1: number, 
      freq2: number, 
      start: number, 
      duration: number, 
      gainLevel: number = 0.85,
      type1: OscillatorType = 'sine',
      type2: OscillatorType = 'triangle'
    ) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = type1;
      osc2.type = type2;

      osc1.frequency.setValueAtTime(freq1, start);
      osc2.frequency.setValueAtTime(freq2, start);

      gain.gain.setValueAtTime(0.01, start);
      gain.gain.linearRampToValueAtTime(gainLevel, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + duration);
      osc2.stop(start + duration);
    };

    switch (preset) {
      case 'gentle_bell': {
        // Soft harmonic crystal glass bell (C5 -> E5 -> G5 -> C6)
        playTone(523.25, 1046.50, now, 0.40, 0.60, 'sine', 'sine');
        playTone(659.25, 1318.51, now + 0.12, 0.45, 0.65, 'sine', 'sine');
        playTone(783.99, 1567.98, now + 0.24, 0.50, 0.70, 'sine', 'sine');
        playTone(1046.50, 2093.00, now + 0.38, 0.80, 0.75, 'sine', 'sine');
        break;
      }
      case 'digital_ping': {
        // Crisp smartphone notification ping (E6 -> B6)
        playTone(1318.51, 2637.02, now, 0.09, 0.80, 'sine', 'triangle');
        playTone(1975.53, 3951.07, now + 0.08, 0.25, 0.85, 'sine', 'triangle');
        break;
      }
      case 'urgent_siren': {
        // High-pitch dual pulse emergency horn
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(1760, now + 0.22);
        osc.frequency.setValueAtTime(880, now + 0.25);
        osc.frequency.linearRampToValueAtTime(1760, now + 0.47);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.75, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
        break;
      }
      case 'marimba_melody': {
        // Acoustic wooden marimba chord (F4 -> A4 -> C5 -> F5)
        playTone(349.23, 698.46, now, 0.25, 0.70, 'triangle', 'sine');
        playTone(440.00, 880.00, now + 0.12, 0.28, 0.75, 'triangle', 'sine');
        playTone(523.25, 1046.50, now + 0.24, 0.30, 0.80, 'triangle', 'sine');
        playTone(698.46, 1396.91, now + 0.38, 0.45, 0.85, 'triangle', 'sine');
        break;
      }
      case 'sonar_ping': {
        // Deep reverberating sonar ping
        playTone(1240.00, 2480.00, now, 0.60, 0.85, 'sine', 'sine');
        playTone(620.00, 1240.00, now + 0.20, 0.80, 0.50, 'sine', 'sine');
        break;
      }
      case 'airport_chime': {
        // Classic 3-note airport boarding announcement (F4 -> A4 -> C5)
        playTone(349.23, 698.46, now, 0.35, 0.75, 'sine', 'triangle');
        playTone(440.00, 880.00, now + 0.30, 0.35, 0.80, 'sine', 'triangle');
        playTone(523.25, 1046.50, now + 0.60, 0.60, 0.85, 'sine', 'triangle');
        break;
      }
      case 'dispatch_chime':
      default: {
        // Sanken Dispatch Chime (A5 -> D6 -> F#6 -> A6)
        playTone(880.00, 1760.00, now, 0.18, 0.85);        // Stage 1: A5 + A6
        playTone(1174.66, 2349.32, now + 0.15, 0.20, 0.90); // Stage 2: D6 + D7
        playTone(1479.98, 2959.96, now + 0.32, 0.22, 0.90); // Stage 3: F#6 + F#7
        playTone(1760.00, 3520.00, now + 0.50, 0.45, 0.95); // Stage 4: High A6 (Sustained Loud Peak)

        // Secondary accent chime 0.85s later
        playTone(1174.66, 2349.32, now + 0.85, 0.18, 0.85);
        playTone(1760.00, 3520.00, now + 1.00, 0.40, 0.90);
        break;
      }
    }

  } catch (error) {
    console.warn('Audio alert could not be played:', error);
  }
}

