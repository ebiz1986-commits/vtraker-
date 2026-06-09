import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { sendPushNotification, playNotificationSound } from '../lib/utils';
import { ChevronDown, ArrowRight, MapPin, Clock, Bell, BellOff, Volume2, Info } from 'lucide-react';
import { TripItemSkeleton, Skeleton } from '../components/ui/Skeleton';
import { TripMap } from '../components/TripMap';

const TripItem = ({ trip, index, handleUpdateStatus }: any) => {
  const [expanded, setExpanded] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;

  const handleIncrementCurrentOdo = async (tripItem: any, amount: number) => {
    const startOdo = Number(tripItem.startOdometer) || 0;
    const currentOdo = Number(tripItem.currentOdometer) || startOdo;
    const nextOdo = currentOdo + amount;

    if (nextOdo < startOdo) {
      toast.error(`Odometer cannot go below starting reading (${startOdo} KM)`);
      return;
    }

    try {
      await updateDoc(doc(db, 'trips', tripItem.id), {
        currentOdometer: nextOdo,
        updatedAt: serverTimestamp()
      });
      toast.success(`Current Odometer updated to ${nextOdo} KM`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update current odometer.');
    }
  };

  const handleDirectUpdateCurrentOdo = async (tripItem: any, value: number) => {
    const startOdo = Number(tripItem.startOdometer) || 0;
    if (value < startOdo) {
      toast.error(`Odometer cannot go below starting reading (${startOdo} KM)`);
      return;
    }

    try {
      await updateDoc(doc(db, 'trips', tripItem.id), {
        currentOdometer: value,
        updatedAt: serverTimestamp()
      });
      toast.success(`Current Odometer updated to ${value} KM`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update current odometer.');
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: Math.min(index * 0.05, 0.3)
      }}
      className="border border-[#1f2937] bg-[#0a0f1c]/50 rounded-lg transition-all duration-300 hover:shadow-2xl hover:border-slate-600 hover:bg-[#0f172a] overflow-hidden"
    >
      {/* Clickable Header */}
      <div 
        className="p-4 sm:p-5 flex flex-col gap-3 transition-colors hover:bg-slate-800/30 group cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between w-full gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium uppercase tracking-wider border flex items-center gap-2 max-w-fit
                ${trip.status === 'allocated' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' : 'bg-purple-900/30 text-purple-400 border-purple-900/50'}`}>
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                </span>
                {trip.status.replace('_', ' ')}
              </span>
              {trip.isJointTrip && (
                <span className="text-xs font-medium text-[#ff9900] bg-[#ff9900]/10 px-2 py-0.5 rounded uppercase tracking-wider border border-[#ff9900]/20 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                  </span>
                  JOINT
                </span>
              )}
              {trip.tripType && (
                <span className="text-[10px] font-bold text-slate-300 bg-[#1e293b] px-2 py-0.5 rounded uppercase tracking-wider">
                  {trip.tripType === 'dropoff' ? 'Drop down trip' : trip.tripType === 'return' ? 'Round trip' : trip.tripType}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-right flex-shrink-0">
            <div className="flex flex-col items-end justify-center">
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider hidden sm:flex">
                <Clock className="w-3 h-3" /> Time
              </p>
              <p className="font-bold text-slate-100 text-sm sm:text-base leading-none">{trip.pickupTime ? format(new Date(trip.pickupTime), 'h:mm a') : (trip.requestedStartTime || 'N/A')}</p>
            </div>
            <div className={`p-1.5 rounded-full bg-slate-800 text-slate-400 transition-colors group-hover:text-slate-200 group-hover:bg-slate-700`}>
              <ChevronDown className={`w-5 h-5 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
           <div>
             <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
               USER: <span className="text-blue-300 font-bold ml-1">{(!trip.passengerName || trip.passengerName === 'Unknown' || trip.passengerName === 'Unknown User') ? 'Sanken User' : trip.passengerName}</span>{trip.nominatedName && <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-500/20 uppercase tracking-widest ml-2 inline-flex items-center">Nominee: {trip.nominatedName}</span>}
             </span>
           </div>
           
           <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
             <span className="text-slate-100 font-medium text-sm sm:text-base leading-snug break-words">
               {trip.pickupAddress}
             </span>
             <div className="hidden sm:flex text-slate-500 items-center justify-center">
               <ArrowRight className="w-4 h-4 flex-shrink-0" />
             </div>
             <div className="flex items-start sm:items-center text-slate-100 font-medium text-sm sm:text-base leading-snug break-words">
               <span className="sm:hidden text-slate-500 text-[10px] font-bold mr-1.5 mt-0.5 uppercase tracking-wider">TO</span>
               <span>{destination}</span>
             </div>
           </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div 
        className={`transition-all duration-300 ease-in-out origin-top ${expanded ? 'max-h-[1500px] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0'}`}
      >
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/50">
          <div className="space-y-3 mb-6 bg-[#0f172a] border border-[#1e293b] p-4 rounded-md mt-4 shadow-inner">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Pickup Location</p>
              <p className="font-medium text-slate-100 mt-0.5">{trip.pickupAddress}</p>
            </div>
            <div className="w-px h-4 bg-[#1e293b] ml-2"></div>
            {trip.tripType === 'return' ? (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Destinations</p>
                <p className="font-medium text-slate-100 mt-0.5">{trip.returnLocations}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Dropoff Location</p>
                <p className="font-medium text-slate-100 mt-0.5">{trip.dropoffAddress}</p>
              </div>
            )}
            {trip.isJointTrip && trip.jointPassengers && trip.jointPassengers.length > 0 ? (
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <p className="text-xs font-semibold text-[#ff9900] uppercase tracking-wider mb-2">Passengers</p>
                <div className="grid gap-1.5">
                  {trip.jointPassengers.map((p: any, i: number) => (
                    <div key={i} className={`flex justify-between bg-slate-800/80 px-2 py-2 rounded items-center border ${p.name === trip.passengerName ? 'border-blue-900/50' : 'border-slate-700'}`}>
                      <span className={`text-sm font-medium ${p.name === trip.passengerName ? 'text-blue-300' : 'text-slate-200'}`}>
                        {p.name || 'Unknown User'} {p.name === trip.passengerName ? '(Primary)' : ''}
                      </span>
                      {p.department && <span className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-900 px-1.5 py-0.5 rounded">{p.department}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">{trip.nominatedName ? 'Requester & Nominee' : 'Requester'}</p>
                <div className="flex justify-between bg-slate-800/80 px-3 py-2 rounded items-center border border-slate-700">
                  <span className="text-[11px] text-slate-400 font-medium">Booked By: </span><span className="text-sm font-medium text-slate-200 mr-2">{(!trip.passengerName || trip.passengerName === 'Unknown' || trip.passengerName === 'Unknown User') ? 'Sanken User' : trip.passengerName}</span>{trip.nominatedName && <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center w-full"><span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Nominated Traveler:</span><span className="text-sm font-bold text-orange-400">{trip.nominatedName}</span></div>}
                  {trip.passengerDepartment && <span className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-900 px-1.5 py-0.5 rounded">{trip.passengerDepartment}</span>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700/50">
              {trip.requestedDate && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Requested Date</p>
                  <p className="font-medium text-slate-100">{trip.requestedDate}</p>
                </div>
              )}
              {trip.requestedStartTime && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Requested Start</p>
                  <p className="font-medium text-slate-100">{trip.requestedStartTime}</p>
                </div>
              )}
              {trip.estimatedDestinationTime && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Total Est. Time</p>
                  <p className="font-medium text-slate-100">{trip.estimatedDestinationTime}</p>
                </div>
              )}
              {trip.passengerCount && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Passengers</p>
                  <p className="font-medium text-slate-100">{trip.passengerCount}</p>
                </div>
              )}
            </div>
            {trip.remarks && (
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <p className="text-xs font-semibold text-slate-400 uppercase">Remarks / Notes</p>
                <p className="italic text-[#E0E0E0] mt-1 bg-slate-800/50 p-2 rounded border border-slate-700">"{trip.remarks}"</p>
              </div>
            )}
          </div>
          
          {/* Interactive Current Odometer Updates Controls */}
          {trip.status === 'in_progress' && (
            <div className="p-4 bg-orange-600/5 border border-orange-500/20 rounded-xl space-y-3 shadow-md mb-4 text-center">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5 justify-center">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></span>
                Update Current Odometer (KM)
              </p>
              
              <div className="flex items-center gap-2.5 justify-center">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-md transition-all active:scale-95 text-[11px] font-semibold"
                  onClick={() => handleIncrementCurrentOdo(trip, -1)}
                >
                  -1 KM
                </button>
                <div className="flex items-center gap-1 font-mono text-white text-xs font-bold bg-[#0c1222] px-3 py-1.5 border border-slate-800 rounded-lg shadow-inner">
                  <span>{trip.currentOdometer || trip.startOdometer || 0} km</span>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-md transition-all active:scale-95 text-[11px] font-semibold"
                  onClick={() => handleIncrementCurrentOdo(trip, 1)}
                >
                  +1 KM
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20 rounded-md transition-all active:scale-95 text-[11px] font-semibold"
                  onClick={() => handleIncrementCurrentOdo(trip, 5)}
                >
                  +5 KM
                </button>
              </div>
              
              <div className="flex gap-2 max-w-[200px] mx-auto items-center">
                <span className="text-[10px] text-slate-500 shrink-0 font-medium">Direct:</span>
                <input
                  type="number"
                  placeholder="Set reading"
                  className="input-field text-center font-mono py-1 text-xs bg-slate-950/60"
                  defaultValue={trip.currentOdometer || trip.startOdometer || 0}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val) {
                      handleDirectUpdateCurrentOdo(trip, val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = Number((e.target as HTMLInputElement).value);
                      if (val) {
                        handleDirectUpdateCurrentOdo(trip, val);
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {trip.status === 'allocated' && (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 h-auto whitespace-normal text-lg shadow-lg shadow-blue-900/20" 
                  onClick={() => handleUpdateStatus(trip.id, trip.status)}
                >
                  Start Trip
                </Button>
              )}
              {trip.status === 'driver_started' && (
                <div className="p-4 w-full bg-amber-900/20 text-amber-500 border border-amber-900/50 rounded flex items-center justify-center gap-2 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Waiting for passenger to enter Start Odometer...
                </div>
              )}
              {trip.status === 'in_progress' && (
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 h-auto whitespace-normal text-lg shadow-lg shadow-emerald-900/20"
                  onClick={() => handleUpdateStatus(trip.id, trip.status)}
                >
                  End Trip (Drop-off)
                </Button>
              )}
              {trip.status === 'driver_ended' && (
                <div className="p-4 w-full bg-amber-900/20 text-amber-500 border border-amber-900/50 rounded flex items-center justify-center gap-2 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Waiting for passenger to enter End Odometer...
                </div>
              )}
            </div>
          </div>
          
          {['allocated', 'driver_started', 'in_progress', 'driver_ended'].includes(trip.status) && (
            <TripMap trip={trip} isDriver={true} />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function DriverDashboard() {
  const { profile } = useAuth();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [completedTripsCount, setCompletedTripsCount] = useState(0);
  const [completedHours, setCompletedHours] = useState('0.0');
  const [totalKmLogged, setTotalKmLogged] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notiPermission, setNotiPermission] = useState<NotificationPermission>('default');
  
  const initialLoadRef = useRef(true);
  const prevTripStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if ('Notification' in window) {
      setNotiPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Push notifications are not supported in this browser.');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotiPermission(permission);
      if (permission === 'granted') {
        toast.success('Notifications Enabled!', {
          description: 'You will receive instant chimes and notices for incoming trips.'
        });
        sendPushNotification('Driver Alerts Active! 🚀', {
          body: 'You are now ready to receive immediate push alerts for incoming trips.'
        });
        playNotificationSound();
      } else if (permission === 'denied') {
        toast.warning('Notifications Blocked', {
          description: 'Please enable notifications in your browser settings to receive live bookings.'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestSound = () => {
    playNotificationSound();
    toast.info('Test chime played!', {
      description: 'If you did not hear anything, please check your device volume.'
    });
  };

  useEffect(() => {
    if (!profile?.userId) return;
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Get all trips for this driver
    const q = query(
      collection(db, 'trips'),
      where('driverId', '==', profile.userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => {
        prevTripStatusRef.current[doc.id] = doc.data().status;
        return { id: doc.id, ...(doc.data() as any) }
      });
      
      const active = tripsData.filter(t => t.status === 'allocated' || t.status === 'driver_started' || t.status === 'in_progress' || t.status === 'driver_ended');
      active.sort((a, b) => (a.pickupTime || 0) - (b.pickupTime || 0)); // earliest first
      setActiveTrips(active);
      
      // Calculate today's completed trips and hours
      const today = new Date().setHours(0, 0, 0, 0);
      const completedToday = tripsData.filter(t => 
        t.status === 'completed' && 
        t.dropoffTime && 
        t.dropoffTime > today
      );
      
      let totalTimeMillis = 0;
      let totalKm = 0;
      completedToday.forEach(t => {
         if (t.pickupTime && t.dropoffTime) {
            totalTimeMillis += (t.dropoffTime - t.pickupTime);
         }
         if (t.startOdometer && t.endOdometer) {
            totalKm += (t.endOdometer - t.startOdometer);
         }
      });
      const hours = (totalTimeMillis / (1000 * 60 * 60)).toFixed(1);
      
      setCompletedTripsCount(completedToday.length);
      setCompletedHours(hours);
      setTotalKmLogged(totalKm);
      setLoading(false);
      initialLoadRef.current = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trips');
    });
    
    return unsubscribe;
  }, [profile]);
  
  const handleUpdateStatus = async (tripId: string, currentStatus: string) => {
    try {
      const updates: any = {
        updatedAt: serverTimestamp()
      };
      
      if (currentStatus === 'allocated') {
        updates.status = 'driver_started';
        toast.info("Status updated! Waiting for passenger to enter Start Odometer.", { duration: 5000 });
      } else if (currentStatus === 'in_progress') {
        updates.status = 'driver_ended';
        updates.driverEndedTime = Date.now();
        toast.info("Status updated! Waiting for passenger to enter End Odometer.", { duration: 5000 });
      }
      
      await updateDoc(doc(db, 'trips', tripId), updates);
      
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  return (
    <Layout title="Driver Console">
      {/* Alert Notification Setup Manager */}
      <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300
          ${notiPermission === 'granted' 
            ? 'bg-emerald-950/15 border-emerald-500/20 text-[#E0E0E0]' 
            : notiPermission === 'denied'
            ? 'bg-red-950/15 border-red-500/20 text-[#E0E0E0]'
            : 'bg-amber-950/15 border-amber-500/20 text-[#E0E0E0]'}`}>
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-lg shrink-0 flex items-center justify-center mt-0.5
              ${notiPermission === 'granted' 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : notiPermission === 'denied'
                ? 'bg-red-500/10 text-red-500'
                : 'bg-amber-500/10 text-amber-500 animate-pulse'}`}>
              {notiPermission === 'granted' ? (
                <Bell className="w-5 h-5" />
              ) : notiPermission === 'denied' ? (
                <BellOff className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                Driver Instant Travel Alert System
                <span className={`px-2 py-0.5 text-[9px] font-mono tracking-widest font-semibold uppercase rounded-full border
                  ${notiPermission === 'granted' 
                    ? 'bg-emerald-950/35 text-emerald-400 border-emerald-500/30' 
                    : notiPermission === 'denied'
                    ? 'bg-red-950/35 text-red-400 border-red-500/30'
                    : 'bg-amber-950/35 text-[#ff9900]/70 border-amber-500/30 animate-pulse'}`}>
                  {notiPermission === 'granted' ? 'Fully Active' : notiPermission === 'denied' ? 'Blocked' : 'Action Required'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {notiPermission === 'granted' ? (
                  "Your device is successfully configured to receive instant audio-visual chimes. You will receive alert popups immediately when admin allocates new trips."
                ) : notiPermission === 'denied' ? (
                  "Browser alerts are blocked. To receive live assignments, you must unblock notification permissions in your browser's address bar settings."
                ) : (
                  "Enable background notifications and auditory ringing so you can instantly respond to assigned bookings even when this tab is closed or minimized."
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2.5 w-full md:w-auto shrink-0 mt-2 md:mt-0">
            {notiPermission !== 'granted' && (
              <Button 
                onClick={requestPermission} 
                className="w-full md:w-auto bg-[#ff9900] hover:bg-[#e08800] text-black font-semibold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#ff9900]/5 hover:shadow-[#ff9900]/15"
              >
                <Bell className="w-3.5 h-3.5" /> Request Permissions
              </Button>
            )}
            <Button 
              onClick={handleTestSound} 
              variant="outline"
              className="w-full md:w-auto border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" /> Test Sound Chime
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-[#111827] border-[#1e293b] shadow-xl text-slate-100">
            <CardHeader>
              <CardTitle className="text-slate-100 font-bold">Daily Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Date</p>
                  <p className="text-xl font-medium">{format(new Date(), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Trips Completed Today</p>
                  {loading ? (
                    <Skeleton className="h-9 w-16 bg-slate-400/10 mt-1" />
                  ) : (
                    <p className="text-4xl font-bold">{completedTripsCount}</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">KM Traveled</p>
                  {loading ? (
                    <Skeleton className="h-8 w-24 bg-slate-400/10 mt-1" />
                  ) : (
                    <p className="text-3xl font-semibold">{totalKmLogged} km</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Hours Logged</p>
                  {loading ? (
                    <Skeleton className="h-8 w-20 bg-slate-400/10 mt-1" />
                  ) : (
                    <p className="text-3xl font-semibold">{completedHours}h</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card className="h-full bg-[#111827] border-[#1e293b] text-slate-100 shadow-xl">
            <CardHeader>
              <CardTitle>My Active Trips</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <TripItemSkeleton />
                  <TripItemSkeleton />
                </div>
              ) : activeTrips.length === 0 ? (
                <div className="text-slate-400 text-center py-8">No assigned trips right now. You will be notified when Admin assigns you a trip.</div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const groups: { [key: string]: typeof activeTrips } = {};
                    activeTrips.forEach(trip => {
                      const date = trip.requestedDate || 'Unspecified Date';
                      if (!groups[date]) groups[date] = [];
                      groups[date].push(trip);
                    });
                    
                    const sortedDates = Object.keys(groups).sort((a, b) => {
                      if (a === 'Unspecified Date') return 1;
                      if (b === 'Unspecified Date') return -1;
                      return a.localeCompare(b);
                    });
                    
                    return sortedDates.map(date => {
                      const isToday = date === new Date().toISOString().split('T')[0];
                      const isTomorrow = date === new Date(Date.now() + 86400000).toISOString().split('T')[0];
                      const dateLabel = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : date;
                      
                      return (
                        <div key={date} className="mb-6 last:mb-0 animate-in fade-in duration-500">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded flex items-center gap-2
                              ${isToday ? 'bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/50 animate-pulse' : 
                                isTomorrow ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50' : 
                                'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
                              {dateLabel}
                            </div>
                            <div className="h-px bg-slate-800 flex-1"></div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{groups[date].length} Bookings</span>
                          </div>
                      
                          <div className="space-y-4">
                            {groups[date].map((trip, index) => (
                              <TripItem key={trip.id} trip={trip} index={index} handleUpdateStatus={handleUpdateStatus} />
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
