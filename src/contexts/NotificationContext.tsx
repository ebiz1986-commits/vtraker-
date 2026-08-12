import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { sendPushNotification, playNotificationSound, getNotificationSoundPreset, setNotificationSoundPreset, SOUND_PRESETS, SoundPreset } from '../lib/utils';
import { toast } from 'sonner';
import { Volume2, BellRing, X, CheckCircle, AlertTriangle, Info, Check, Music } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
  tripId: string;
  status: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  activeAlert: NotificationItem | null;
  soundPreset: SoundPreset;
  changeSoundPreset: (preset: SoundPreset) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  dismissAlert: () => void;
  testSound: (customPreset?: SoundPreset) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  activeAlert: null,
  soundPreset: 'dispatch_chime',
  changeSoundPreset: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
  dismissAlert: () => {},
  testSound: () => {},
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeAlert, setActiveAlert] = useState<NotificationItem | null>(null);
  const prevTripStatuses = useRef<Record<string, string>>({});
  const prevAdminStatusUpdates = useRef<Record<string, string>>({});
  const initialLoadRef = useRef(true);
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss active alert popup after 12 seconds
  useEffect(() => {
    if (activeAlert) {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      alertTimerRef.current = setTimeout(() => {
        setActiveAlert(null);
      }, 12000);
    }
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, [activeAlert]);

  // Load saved notifications from localStorage on mount
  useEffect(() => {
    if (profile?.userId) {
      try {
        const saved = localStorage.getItem(`sko_notifications_${profile.userId}`);
        if (saved) {
          setNotifications(JSON.parse(saved));
        } else {
          setNotifications([]);
        }
      } catch (e) {
        console.error("Failed to load/parse notifications from localStorage", e);
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
  }, [profile]);

  // Helper to save notifications to localStorage and update state
  const saveNotifications = (newNotis: NotificationItem[] | ((prev: NotificationItem[]) => NotificationItem[])) => {
    setNotifications((prev) => {
      const resolved = typeof newNotis === 'function' ? newNotis(prev) : newNotis;
      if (profile?.userId) {
        try {
          localStorage.setItem(`sko_notifications_${profile.userId}`, JSON.stringify(resolved));
        } catch (e) {
          console.error("Failed to save notifications to localStorage", e);
        }
      }
      return resolved;
    });
  };

  useEffect(() => {
    if (!profile?.userId) return;

    // Reset initial load whenever profile changes
    initialLoadRef.current = true;
    prevTripStatuses.current = {};
    prevAdminStatusUpdates.current = {};

    // Listen to all trips to guarantee real-time updates for Passengers, Nominees, Joint Passengers, Drivers, and Admins
    const q = query(collection(db, 'trips'));

    const isRelevant = (trip: any) => {
      if (profile.role === 'admin') return true;
      if (profile.role === 'driver') {
        return trip.driverId === profile.userId || trip.driverName === profile.name;
      }
      if (profile.role === 'user') {
        const isOwner = trip.userId === profile.userId || trip.nominatedUserId === profile.userId;
        const isNameMatch = trip.passengerName === profile.name || trip.requestedBy === profile.name;
        const isJoint = Array.isArray(trip.jointPassengers) && trip.jointPassengers.some(
          (p: any) => p.userId === profile.userId || p.id === profile.userId || p.name === profile.name
        );
        return isOwner || isNameMatch || isJoint;
      }
      return false;
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialLoadRef.current) {
        // Populate initial cache without alerting on page load
        snapshot.docs.forEach((doc) => {
          const trip = doc.data();
          if (isRelevant(trip)) {
            prevTripStatuses.current[doc.id] = trip.status;
            prevAdminStatusUpdates.current[doc.id] = trip.adminStatusUpdate || '';
          }
        });
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const trip = change.doc.data();
        const tripId = change.doc.id;

        if (!isRelevant(trip)) return;

        const prevStatus = prevTripStatuses.current[tripId];
        const prevAdminMsg = prevAdminStatusUpdates.current[tripId] || '';
        const currentAdminMsg = trip.adminStatusUpdate || '';

        const jointText = trip.isJointTrip ? ' (Joint Trip)' : '';
        const dest = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;

        // 1. Check status transition updates
        if (prevStatus !== trip.status) {
          prevTripStatuses.current[tripId] = trip.status;

          // --- ADDED / NEW BOOKINGS ---
          if (change.type === 'added' || prevStatus === undefined) {
            if (profile.role === 'driver' && trip.status === 'allocated') {
              triggerNotification({
                tripId,
                title: `New Trip Allocated!${jointText} 🚗`,
                description: `Assigned a booking for ${trip.passengerName || 'Passenger'} from ${trip.pickupAddress} to ${dest}.`,
                type: 'success',
                status: trip.status,
              });
            } else if (profile.role === 'user' && trip.status === 'pending') {
              triggerNotification({
                tripId,
                title: 'Trip Requested 📅',
                description: `Your booking request from ${trip.pickupAddress} to ${dest} has been received and is pending allocation.`,
                type: 'info',
                status: trip.status,
              });
            } else if (profile.role === 'admin' && trip.status === 'pending') {
              triggerNotification({
                tripId,
                title: 'New Booking Request 📩',
                description: `Passenger ${trip.passengerName || 'User'} requested a trip from ${trip.pickupAddress} to ${dest}.`,
                type: 'info',
                status: trip.status,
              });
            }
          }

          // --- STATUS CHANGES (MODIFIED) ---
          if (change.type === 'modified' && prevStatus !== undefined) {
            // PASSENGER / USER ALERTS
            if (profile.role === 'user') {
              if (trip.status === 'allocated') {
                triggerNotification({
                  tripId,
                  title: `Driver Allocated!${jointText} 🚕`,
                  description: `Driver ${trip.driverName || 'assigned'} with vehicle ${trip.vehicleName || 'assigned'} is allocated for your trip to ${dest}.`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'driver_started') {
                triggerNotification({
                  tripId,
                  title: 'Driver Arrived at Pickup! 📍',
                  description: `Your driver (${trip.driverName || 'Driver'}) has arrived at ${trip.pickupAddress}. Please confirm Start Odometer.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'in_progress') {
                triggerNotification({
                  tripId,
                  title: 'Trip In Progress 🚀',
                  description: `Start Odometer confirmed! Your trip to ${dest} is now underway. Safe travels!`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'driver_ended') {
                triggerNotification({
                  tripId,
                  title: 'Destination Reached! 🏁',
                  description: `You arrived at ${dest}. Please confirm the End Odometer reading to complete your journey.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'completed') {
                triggerNotification({
                  tripId,
                  title: trip.forceCompleted ? 'Trip Finalized (Admin) ✅' : 'Trip Completed ✅',
                  description: trip.forceCompleted 
                    ? `Admin force-completed your trip to ${dest}. Thank you!`
                    : `Trip completed successfully. End odometer confirmed. Thank you for riding with Sanken!`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'cancelled') {
                triggerNotification({
                  tripId,
                  title: 'Booking Cancelled ❌',
                  description: `Your trip request from ${trip.pickupAddress} to ${dest} was cancelled.`,
                  type: 'error',
                  status: trip.status,
                });
              }
            }

            // DRIVER ALERTS
            if (profile.role === 'driver') {
              if (trip.status === 'allocated') {
                triggerNotification({
                  tripId,
                  title: `New Trip Assigned!${jointText} 📋`,
                  description: `Passenger ${trip.passengerName || 'User'} needs transport from ${trip.pickupAddress} to ${dest}.`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'driver_started') {
                triggerNotification({
                  tripId,
                  title: 'Pickup Location Marked 📍',
                  description: `You marked arrival at ${trip.pickupAddress}. Passenger has been notified to confirm Start Odometer.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'in_progress') {
                triggerNotification({
                  tripId,
                  title: 'Start Odometer Confirmed - Trip Active 🚀',
                  description: `Passenger confirmed Start Odometer (${trip.startOdometer} KM). Proceed to destination: ${dest}.`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'driver_ended') {
                triggerNotification({
                  tripId,
                  title: 'Destination Marked - End Odometer Sent 🏁',
                  description: `End Odometer (${trip.endOdometer} KM) sent. Awaiting passenger confirmation.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'completed') {
                triggerNotification({
                  tripId,
                  title: 'Trip Completed & Finalized! 🎉',
                  description: `Passenger ${trip.passengerName} confirmed End Odometer. Great job!`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'cancelled') {
                triggerNotification({
                  tripId,
                  title: 'Trip Cancelled by Passenger ❌',
                  description: `Booking for ${trip.passengerName} (${trip.pickupAddress} → ${dest}) was cancelled.`,
                  type: 'error',
                  status: trip.status,
                });
              }
            }

            // ADMIN ALERTS
            if (profile.role === 'admin') {
              if (trip.status === 'pending') {
                triggerNotification({
                  tripId,
                  title: 'New Booking Request 📩',
                  description: `Passenger ${trip.passengerName || 'User'} requested a trip from ${trip.pickupAddress}.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'allocated') {
                triggerNotification({
                  tripId,
                  title: 'Driver Allocated 🚕',
                  description: `Driver ${trip.driverName || 'N/A'} allocated for ${trip.passengerName || 'User'}.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'driver_started') {
                triggerNotification({
                  tripId,
                  title: 'Driver Arrived at Pickup 📍',
                  description: `Driver ${trip.driverName || 'Driver'} arrived at ${trip.pickupAddress} for ${trip.passengerName}.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'in_progress') {
                triggerNotification({
                  tripId,
                  title: 'Trip In Progress 🚀',
                  description: `Trip for ${trip.passengerName} with driver ${trip.driverName || 'Driver'} is now active.`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'driver_ended') {
                triggerNotification({
                  tripId,
                  title: 'Driver Reached Destination 🏁',
                  description: `Driver ${trip.driverName || 'Driver'} arrived at ${dest} for ${trip.passengerName}.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'completed') {
                triggerNotification({
                  tripId,
                  title: 'Trip Finalized & Completed 🗃️',
                  description: `Trip with driver ${trip.driverName || 'N/A'} for ${trip.passengerName} was completed.`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'cancelled') {
                triggerNotification({
                  tripId,
                  title: 'Booking Cancelled 🛑',
                  description: `Trip request from ${trip.passengerName} has been cancelled.`,
                  type: 'warning',
                  status: trip.status,
                });
              }
            }
          }
        }

        // 2. Check Live Admin Broadcast / Message updates
        if (currentAdminMsg && currentAdminMsg !== prevAdminMsg) {
          prevAdminStatusUpdates.current[tripId] = currentAdminMsg;
          if (profile.role !== 'admin') {
            triggerNotification({
              tripId,
              title: 'Transport Admin Update 📢',
              description: `"${currentAdminMsg}" (Trip: ${trip.pickupAddress} → ${dest})`,
              type: 'info',
              status: trip.status,
            });
          }
        }
      });
    }, (error) => {
      console.warn("Firestore listener warning:", error.message);
    });

    return () => unsubscribe();
  }, [profile]);

  const triggerNotification = (bullet: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const fresh: NotificationItem = {
      ...bullet,
      id: `${bullet.tripId}_${bullet.status}_${Date.now()}`,
      timestamp: Date.now(),
      read: false,
    };

    saveNotifications((prev) => [fresh, ...prev].slice(0, 50));
    setActiveAlert(fresh);

    // Play loud attention chime sound
    playNotificationSound();
    sendPushNotification(fresh.title, { body: fresh.description });

    if (fresh.type === 'success') {
      toast.success(fresh.title, { description: fresh.description, duration: 8000 });
    } else if (fresh.type === 'error') {
      toast.error(fresh.title, { description: fresh.description, duration: 8000 });
    } else if (fresh.type === 'warning') {
      toast.warning(fresh.title, { description: fresh.description, duration: 8000 });
    } else {
      toast.info(fresh.title, { description: fresh.description, duration: 8000 });
    }
  };

  const markAsRead = (id: string) => {
    saveNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    saveNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read.");
  };

  const clearAll = () => {
    saveNotifications([]);
    toast.success("Notification history cleared.");
  };

  const [soundPreset, setSoundPreset] = useState<SoundPreset>(() => getNotificationSoundPreset());

  const changeSoundPreset = (preset: SoundPreset) => {
    setSoundPreset(preset);
    setNotificationSoundPreset(preset);
    playNotificationSound(preset);
    const found = SOUND_PRESETS.find(p => p.id === preset);
    toast.success(`Notification Sound updated to: ${found?.name || preset}`, {
      description: "Sample sound played. This tone will be used for all new trip alerts."
    });
  };

  const dismissAlert = () => {
    if (activeAlert) {
      markAsRead(activeAlert.id);
    }
    setActiveAlert(null);
  };

  const testSound = (customPreset?: SoundPreset) => {
    const targetPreset = customPreset || soundPreset;
    playNotificationSound(targetPreset);
    const found = SOUND_PRESETS.find(p => p.id === targetPreset);
    toast.success(`🔊 Played ${found?.name || 'Alert Tone'} test!`, {
      description: "Audio alert preview active."
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, activeAlert, soundPreset, changeSoundPreset, markAsRead, markAllAsRead, clearAll, dismissAlert, testSound }}>
      {children}

      {/* Loud Alert Pop-up Modal Banner Overlay */}
      {activeAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-24px)] max-w-lg px-2 animate-in fade-in slide-in-from-top-6 duration-300">
          <div className="relative overflow-hidden rounded-2xl bg-[#0a0f1d]/95 border border-amber-500/60 p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(223,149,20,0.35)] backdrop-blur-2xl text-white">
            {/* Top flashing glow border pulse */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-pulse" />

            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0 animate-bounce">
                <BellRing className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-amber-400 animate-pulse" />
                    LOUD ALERT
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(activeAlert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <h4 className="text-sm sm:text-base font-extrabold text-white tracking-wide leading-tight mb-1">
                  {activeAlert.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                  {activeAlert.description}
                </p>

                {/* Interactive Action Buttons */}
                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    onClick={() => {
                      playNotificationSound();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Replay Sound 🔊
                  </button>

                  <button
                    onClick={dismissAlert}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Dismiss
                  </button>
                </div>
              </div>

              <button
                onClick={dismissAlert}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

