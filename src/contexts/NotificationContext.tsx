import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { sendPushNotification, playNotificationSound } from '../lib/utils';
import { toast } from 'sonner';

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
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const prevTripStatuses = useRef<Record<string, string>>({});
  const initialLoadRef = useRef(true);

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

    // Determine firestore query based on role
    let q;
    if (profile.role === 'user') {
      q = query(collection(db, 'trips'), where('userId', '==', profile.userId));
    } else if (profile.role === 'driver') {
      q = query(collection(db, 'trips'), where('driverId', '==', profile.userId));
    } else {
      // Admins listen to all trips
      q = query(collection(db, 'trips'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialLoadRef.current) {
        // Just store the initial states without alerting
        snapshot.docs.forEach((doc) => {
          prevTripStatuses.current[doc.id] = doc.data().status;
        });
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const trip = change.doc.data();
        const tripId = change.doc.id;
        const prevStatus = prevTripStatuses.current[tripId];

        // Ensure we only process state transitions or new assignments
        if (prevStatus !== trip.status) {
          prevTripStatuses.current[tripId] = trip.status;

          // 1. Handle Added / Newly Assigned Trip
          if (change.type === 'added' || (change.type === 'modified' && prevStatus === undefined)) {
            if (profile.role === 'driver' && trip.status === 'allocated') {
              triggerNotification({
                tripId,
                title: 'New Trip Allocated! 🚗',
                description: `Assigned a booking from ${trip.pickupAddress} to ${trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress}.`,
                type: 'success',
                status: trip.status,
              });
            } else if (profile.role === 'user' && trip.status === 'pending') {
              triggerNotification({
                tripId,
                title: 'Trip Requested 📅',
                description: `Your booking request from ${trip.pickupAddress} has been received and is pending allocation.`,
                type: 'info',
                status: trip.status,
              });
            }
          }

          // 2. Handle Status Changes (Modified)
          if (change.type === 'modified' && prevStatus !== undefined) {
            const jointText = trip.isJointTrip ? ' (Joint Trip)' : '';
            const dest = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;

            // --- PASSENGER ALERTS ---
            if (profile.role === 'user') {
              if (trip.status === 'allocated') {
                triggerNotification({
                  tripId,
                  title: `Driver Allocated!${jointText} 🚕`,
                  description: `Driver ${trip.driverName || 'assigned'} has been allocated with vehicle ${trip.vehicleName || 'assigned'} for your trip to ${dest}.`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'driver_started') {
                triggerNotification({
                  tripId,
                  title: 'Driver Arrived! 📍',
                  description: `Your driver has arrived at the pickup location (${trip.pickupAddress}). Please confirm the Start Odometer to begin.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'in_progress') {
                triggerNotification({
                  tripId,
                  title: 'Trip Started 🚀',
                  description: `Your trip is now in progress. Safe travels!`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'driver_ended') {
                triggerNotification({
                  tripId,
                  title: 'Destination Reached! 🏁',
                  description: `You have arrived at your destination. Please input/confirm the End Odometer with your driver to complete the trip.`,
                  type: 'info',
                  status: trip.status,
                });
              } else if (trip.status === 'completed') {
                triggerNotification({
                  tripId,
                  title: trip.forceCompleted ? 'Trip Finalized (Admin) ✅' : 'Trip Completed ✅',
                  description: trip.forceCompleted 
                    ? `Admin force-completed your trip. Thank you for your journey.`
                    : `Trip completed successfully. End odometer confirmed. Thank you!`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'cancelled') {
                triggerNotification({
                  tripId,
                  title: 'Booking Cancelled ❌',
                  description: `Your trip requested for ${trip.pickupAddress} was cancelled.`,
                  type: 'error',
                  status: trip.status,
                });
              }
            }

            // --- DRIVER ALERTS ---
            if (profile.role === 'driver') {
              if (trip.status === 'allocated') {
                triggerNotification({
                  tripId,
                  title: `New Trip Assigned!${jointText} 📋`,
                  description: `${trip.passengerName} requested a trip from ${trip.pickupAddress} to ${dest}.`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'in_progress') {
                triggerNotification({
                  tripId,
                  title: 'Odometer Confirmed - Trip Active 🏁',
                  description: `The passenger has confirmed the Start Odometer. The trip is now active under your console.`,
                  type: 'success',
                  status: trip.status,
                });
              } else if (trip.status === 'completed') {
                triggerNotification({
                  tripId,
                  title: 'Trip Completed! 🎉',
                  description: `Passenger ${trip.passengerName} confirmed the End Odometer. Your trip is finalized.`,
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

            // --- ADMIN ALERTS ---
            if (profile.role === 'admin') {
              if (trip.status === 'pending') {
                triggerNotification({
                  tripId,
                  title: 'New Booking Request 📩',
                  description: `Passenger ${trip.passengerName} requested a trip from ${trip.pickupAddress}.`,
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

    playNotificationSound();
    sendPushNotification(fresh.title, { body: fresh.description });

    if (fresh.type === 'success') {
      toast.success(fresh.title, { description: fresh.description, duration: 6000 });
    } else if (fresh.type === 'error') {
      toast.error(fresh.title, { description: fresh.description, duration: 6000 });
    } else if (fresh.type === 'warning') {
      toast.warning(fresh.title, { description: fresh.description, duration: 6000 });
    } else {
      toast.info(fresh.title, { description: fresh.description, duration: 6000 });
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
