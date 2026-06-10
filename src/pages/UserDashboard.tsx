import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, or } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { sendPushNotification } from '../lib/utils';
import { ChevronDown, ArrowRight, MapPin, Clock, Car, Calendar, Crosshair, Users, Minus, Plus, Navigation, Edit, Check, X, ShieldAlert } from 'lucide-react';
import { TripItemSkeleton } from '../components/ui/Skeleton';
import { TripMap } from '../components/TripMap';

const UserTripItem = ({ 
  trip, 
  index, 
  profile, 
  isNormalFlow, 
  userOdometerValues, 
  setUserOdometerValues, 
  handleCancelTrip, 
  handleConfirmOdometer, 
  handleUpdateStatus 
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
  
  const isAllocatedOrLater = ['allocated', 'driver_started', 'in_progress', 'driver_ended', 'completed'].includes(trip.status);
  const statusColor = trip.status === 'pending' ? 'text-yellow-500' : 'text-green-500';
  const statusBgColor = trip.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500';
  const formattedStatus = trip.forceCompleted ? 'Force Completed' : trip.status.replace('_', ' ');

  // Nominated check
  const isNominated = trip.nominatedName && profile?.name && trip.nominatedName.toLowerCase().trim() === profile?.name.toLowerCase().trim();

  // A visually appealing trip ID based on original document ID
  const displayId = `SO-${new Date().getFullYear()}-${trip.id.substring(0, 4).toUpperCase()}`;

  // Journey metrics for real-time progress indicator
  const odometerStart = Number(trip.startOdometer) || 0;
  const odometerCurrent = Number(trip.currentOdometer) || odometerStart;
  const expectedEnd = Number(trip.expectedEndOdometer) || (odometerStart + (Number(trip.expectedDistance) || 15));
  const distanceCovered = odometerCurrent - odometerStart;
  const totalEstimatedDist = expectedEnd - odometerStart;
  const progressPercent = totalEstimatedDist > 0 
    ? Math.min(100, Math.max(0, (distanceCovered / totalEstimatedDist) * 100))
    : 0;
  const showJourneyProgress = odometerStart > 0 && ['in_progress', 'driver_ended', 'completed'].includes(trip.status);

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
      className="glass-card mb-4 overflow-hidden"
    >
      {/* Clickable Area */}
      <div 
        className="p-1 cursor-pointer relative z-10"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header: Status and ID */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex gap-2 items-center">
            <span className={`status-badge status-${trip.status}`}>
              {['pending', 'allocated', 'driver_started', 'in_progress'].includes(trip.status) && (
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                </span>
              )}
              {formattedStatus}
            </span>
            {trip.isJointTrip && (
              <span className="text-[10px] font-bold text-[#ff9900] bg-[#ff9900]/10 px-2 py-1 rounded-md uppercase tracking-wider border border-[#ff9900]/20 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff9900] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ff9900]"></span>
                </span>
                JOINT
              </span>
            )}
            {trip.nominatedName && (
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md uppercase tracking-wider border border-amber-500/20 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                Nominee trip
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-[#A0A0A0]">
            Trip ID: {displayId}
          </p>
        </div>
        
        {/* Middle: Route & Car */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex-1 relative pl-2">
            {/* Visual Route Line */}
            <div className="absolute left-3.5 top-2.5 bottom-2.5 w-px border-l-2 border-dashed border-slate-700/50"></div>
            
            <div className="flex items-start gap-4 mb-4 relative z-10">
              <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-[#0F1419] mt-1 shrink-0" />
              <p className="text-sm font-medium text-slate-200">
                {trip.pickupAddress}
              </p>
            </div>
            
            <div className="flex items-start gap-4 relative z-10">
              <MapPin className="w-4 h-4 text-orange-500 -ml-0.5 shrink-0" />
              <p className="text-sm font-medium text-slate-200">
                {destination}
              </p>
            </div>
          </div>
          <div className="ml-4 shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 shadow-inner">
            <Car className="w-6 h-6 text-slate-300" />
          </div>
        </div>
        
        {/* Horizontal Line Break */}
        <div className="h-px bg-white/5 w-full mb-4"></div>
        
        {/* Footer: Date & Time & Chevron */}
        <div className="flex justify-between items-center text-slate-400">
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>{trip.requestedDate || 'TBD'}</span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>{trip.requestedStartTime || 'TBD'}</span>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-500 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
        {isNominated && trip.passengerName && (
          <div className="mt-3 text-[11px] text-slate-400 bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10 flex items-center gap-2 max-w-fit">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            <span>Booked for you by: <span className="text-slate-300 font-bold">{trip.passengerName}</span></span>
          </div>
        )}
      </div>

      {/* Expandable Content (Actions & Details) */}
      <div className={`transition-all duration-300 ease-in-out origin-top relative z-0 ${expanded ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-5 pt-0">
          <div className="bg-black/30 border border-white/5 p-4 rounded-xl mt-2">
            <div className="grid grid-cols-2 gap-4">
              {showJourneyProgress && (
                <div className="col-span-2 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-orange-400">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                      Journey Progress
                    </span>
                    <span className="text-slate-300 font-bold">{distanceCovered.toFixed(0)} KM covered / {totalEstimatedDist.toFixed(0)} KM expected</span>
                  </div>
                  <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(234,88,12,0.4)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                    <span>Odometer Start: {odometerStart} KM</span>
                    <span>Expected End: {expectedEnd} KM</span>
                  </div>
                </div>
              )}
              {trip.estimatedDestinationTime && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Est. Time</p>
                  <p className="text-sm font-medium text-slate-200">{trip.estimatedDestinationTime}</p>
                </div>
              )}
              {trip.passengerCount && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Passengers</p>
                  <p className="text-sm font-medium text-slate-200">{trip.passengerCount}</p>
                </div>
              )}
            </div>

            {trip.isJointTrip && trip.jointPassengers && trip.jointPassengers.length > 1 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider mb-2">Traveling With</p>
                <div className="grid gap-2">
                  {trip.jointPassengers.map((p: any, i: number) => {
                    const isMe = p.name === profile?.name;
                    return (
                      <div key={i} className={`flex justify-between items-center px-3 py-2 rounded-lg border ${isMe ? 'bg-orange-500/10 border-orange-500/20 text-orange-300' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                        <span className="text-sm font-medium">{p.name || 'Unknown'} {isMe ? '(Me)' : ''}</span>
                        {p.department && <span className="text-[10px] tracking-wider uppercase font-semibold opacity-70">{p.department}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {trip.remarks && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Remarks</p>
                <p className="text-sm italic text-slate-300">"{trip.remarks}"</p>
              </div>
            )}
          </div>
          
          {/* Driver Information block */}
          {trip.driverId && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 mt-4 shadow-lg backdrop-blur-sm">
              <div className="font-bold text-green-300 mb-2 flex items-center gap-2">
                <span className="bg-green-500/20 p-1.5 rounded-full"><MapPin className="w-4 h-4 text-green-400" /></span> 
                Driver Assigned
              </div>
              <div className="flex flex-col space-y-1.5 text-green-400/80 ml-8">
                {trip.driverName && <div><span className="font-medium text-green-300">Name:</span> {trip.driverName}</div>}
                {trip.vehicleName && <div><span className="font-medium text-green-300">Vehicle:</span> {trip.vehicleName}</div>}
                {trip.driverPhone && <div><span className="font-medium text-green-300">Phone:</span> {trip.driverPhone}</div>}
              </div>
            </div>
          )}

          {/* Action buttons based on status */}
          <div className="flex flex-col gap-3 mt-4 shrink-0">
            {trip.status === 'pending' && (
              <Button variant="outline" size="sm" onClick={() => handleCancelTrip(trip.id)} className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/50 py-3 h-auto whitespace-normal text-sm font-semibold rounded-xl transition-all">
                Cancel Booking
              </Button>
            )}
            
            {trip.status === 'allocated' && trip.driverHasSmartphone === false && !isNormalFlow && (
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 h-auto whitespace-normal text-sm rounded-xl shadow-lg ring-1 ring-orange-500/50 transition-all" 
                onClick={() => handleUpdateStatus(trip.id, trip.status)}
              >
                Driver Arrived - Start Trip
              </Button>
            )}
            
            {trip.status === 'driver_started' && (
              isNormalFlow ? (
                <div className="text-base font-semibold text-orange-400 bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 flex justify-center items-center gap-3 backdrop-blur-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse animate-duration-1000"></span>
                  Driver Arrived
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm shadow-xl mt-2 backdrop-blur-sm">
                  <p className="font-bold text-orange-400 text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                    Driver Arrived
                  </p>
                  <div className="text-orange-100">
                    <label className="text-orange-400/80 text-[10px] uppercase font-bold tracking-wider block mb-1.5">Start Odometer (KM)</label>
                    <input 
                      type="number" 
                      className="input-field font-mono"
                      placeholder="e.g. 15020"
                      value={userOdometerValues[trip.id] || ''} 
                      onChange={(e) => setUserOdometerValues({...userOdometerValues, [trip.id]: e.target.value})} 
                    />
                    <Button size="lg" onClick={() => handleConfirmOdometer(trip, 'start')} className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0 mt-3 font-semibold rounded-lg shadow-lg shadow-orange-900/20 transition-all py-5">Confirm Start</Button>
                  </div>
                </div>
              )
            )}
            
            {trip.status === 'in_progress' && (
              <>
                <div className="text-base font-semibold text-green-400 bg-green-500/10 p-4 rounded-xl border border-green-500/20 flex justify-center items-center gap-3 backdrop-blur-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse animate-duration-1000"></span>
                  Trip in Progress
                </div>
                {trip.driverHasSmartphone === false && !isNormalFlow && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 h-auto whitespace-normal text-sm rounded-xl shadow-lg ring-1 ring-green-500/50 transition-all mt-2" 
                    onClick={() => handleUpdateStatus(trip.id, trip.status)}
                  >
                    End Trip (Drop-off)
                  </Button>
                )}
              </>
            )}
            
            {trip.status === 'driver_ended' && (
              isNormalFlow ? (
                <div className="text-base font-semibold text-emerald-400 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex justify-center items-center gap-3 backdrop-blur-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse animate-duration-1000"></span>
                  Completed & Awaiting Receipt...
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm shadow-xl mt-2 backdrop-blur-sm">
                  <p className="font-bold text-orange-400 text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                    Destination Reached
                  </p>
                  <div className="text-orange-100">
                    <label className="text-orange-400/80 text-[10px] uppercase font-bold tracking-wider block mb-1.5">End Odometer (KM)</label>
                    <input 
                      type="number" 
                      className="input-field font-mono"
                      placeholder="e.g. 15045"
                      value={userOdometerValues[trip.id] || ''} 
                      onChange={(e) => setUserOdometerValues({...userOdometerValues, [trip.id]: e.target.value})} 
                    />
                    <Button size="lg" onClick={() => handleConfirmOdometer(trip, 'end')} className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0 mt-3 font-semibold rounded-lg shadow-lg shadow-orange-900/20 transition-all py-5">Confirm Drop-off</Button>
                  </div>
                </div>
              )
            )}
          </div>
          
          {['allocated', 'driver_started', 'in_progress'].includes(trip.status) && (
            <TripMap trip={trip} isDriver={false} />
          )}
        </div>
      </div>
    </motion.div>
  );
};

const isPinLikeName = (name: string) => {
  if (!name) return false;
  const cleaned = name.trim();
  return /^[a-zA-Z]{1,3}\d+$/.test(cleaned) || /^\d+$/.test(cleaned);
};

export default function UserDashboard() {
  const { profile } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // System settings configurations state
  const [isNormalFlow, setIsNormalFlow] = useState<boolean>(true);

  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfileName, setTempProfileName] = useState('');
  const [tempProfileDept, setTempProfileDept] = useState('');

  useEffect(() => {
    if (profile) {
      setTempProfileName(profile.name || '');
      setTempProfileDept(profile.department || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!tempProfileName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      const userDocRef = doc(db, 'users', profile!.userId);
      await updateDoc(userDocRef, {
        name: tempProfileName.trim(),
        department: tempProfileDept.trim()
      });
      setIsEditingProfile(false);
      toast.success("Profile saved successfully!");
    } catch (error) {
      console.error("Failed to update profile name:", error);
      toast.error("Failed to update profile.");
    }
  };

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        setIsNormalFlow(snap.data().normal !== false);
      } else {
        setIsNormalFlow(true);
      }
    });
    return unsubSettings;
  }, []);
  
  const initialLoadRef = useRef(true);
  const prevTripStatusRef = useRef<Record<string, string>>({});

  // Form State
  const [pickupAddress, setPickupAddress] = useState('');
  const [tripType, setTripType] = useState<'dropoff' | 'return'>('dropoff');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [returnLocations, setReturnLocations] = useState('');
  const [expectedDistance, setExpectedDistance] = useState('15');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedStartTime, setRequestedStartTime] = useState('');
  const [estimatedDestinationTime, setEstimatedDestinationTime] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [remarks, setRemarks] = useState('');
  const [userOdometerValues, setUserOdometerValues] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [nominatePerson, setNominatePerson] = useState(false);
  const [nominatedName, setNominatedName] = useState('');
  // Simulating coordinates for now

  const setQuickDateTime = (type: 'now' | 'today' | 'tomorrow') => {
    const d = new Date();
    if (type === 'now') {
      setRequestedDate(d.toISOString().split('T')[0]);
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      setRequestedStartTime(`${hours}:${mins}`);
      toast.success("Set departure time to Immediate (Now)", { position: 'bottom-right' });
    } else if (type === 'today') {
      setRequestedDate(d.toISOString().split('T')[0]);
      toast.success("Set departure date to Today", { position: 'bottom-right' });
    } else if (type === 'tomorrow') {
      const tomorrow = new Date(Date.now() + 86400000);
      setRequestedDate(tomorrow.toISOString().split('T')[0]);
      setRequestedStartTime("08:00");
      toast.success("Set departure to Tomorrow at 8:00 AM", { position: 'bottom-right' });
    }
  };
  
  const handleConfirmOdometer = async (trip: any, type: 'start' | 'end') => {
    const odoStr = userOdometerValues[trip.id];
    if (!odoStr || isNaN(Number(odoStr))) {
      toast.error("Please enter a valid numeric odometer reading (KM).");
      return;
    }
    const odometer = Number(odoStr);

    try {
      const updates: any = {
        updatedAt: serverTimestamp()
      };
      
      if (type === 'start') {
        updates.status = 'in_progress';
        updates.startOdometer = odometer;
        updates.currentOdometer = odometer;
        const expDistance = Number(trip.expectedDistance) || 15;
        updates.expectedEndOdometer = odometer + expDistance;
      } else {
        updates.status = 'completed';
        updates.dropoffTime = Date.now();
        updates.endOdometer = odometer;
      }
      
      await updateDoc(doc(db, 'trips', trip.id), updates);
      
      setUserOdometerValues(prev => {
        const next = {...prev};
        delete next[trip.id];
        return next;
      });
      toast.success(`Odometer ${type === 'start' ? 'Start' : 'End'} Confirmed`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${trip.id}`);
    }
  };
  
  const handleUpdateStatus = async (tripId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'allocated' ? 'driver_started' : 'driver_ended';
      await updateDoc(doc(db, 'trips', tripId), {
        status: nextStatus,
        [currentStatus === 'allocated' ? 'driverStartedTime' : 'driverEndedTime']: Date.now(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };
  
  useEffect(() => {
    if (!profile?.userId) return;
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const nameToQuery = profile.name?.trim() || '';
    // Security check: Only run the OR query containing nominatedName if the token's displayName has synchronized.
    // If not, we fall back to a safe query for the user's owned trips to prevent "Missing or insufficient permissions" error.
    const isTokenSynced = auth.currentUser?.displayName === nameToQuery;

    const q = (nameToQuery && isTokenSynced)
      ? query(
          collection(db, 'trips'),
          or(
            where('userId', '==', profile.userId),
            where('nominatedName', '==', nameToQuery)
          )
        )
      : query(
          collection(db, 'trips'),
          where('userId', '==', profile.userId)
        );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialLoadRef.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'modified') {
            const docId = change.doc.id;
            const trip = change.doc.data();
            const prevStatus = prevTripStatusRef.current[docId];
            if (prevStatus && prevStatus !== trip.status) {
              if (trip.status === 'in_progress') {
                toast.info("Your trip has started!", {
                  description: `Odometer reading started at ${trip.startOdometer} KM`,
                  duration: 8000,
                  position: 'top-center'
                });
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification("Trip Started 🚗", {
                    body: `Your trip has started! Odometer: ${trip.startOdometer} KM.`
                  });
                }
              } else if (trip.status === 'completed') {
                toast.success("Your trip is completed!", {
                  description: `Ended at ${trip.endOdometer} KM. Thank you!`,
                  duration: 8000,
                  position: 'top-center'
                });
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification("Trip Completed ✅", {
                    body: `Your trip has completed! Odometer: ${trip.endOdometer} KM.`
                  });
                }
              }
            }
          }
        });
      }

      const tripsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const oldVal = prevTripStatusRef.current[doc.id];
        prevTripStatusRef.current[doc.id] = data.status;
        return { id: doc.id, ...(data as any) }
      });
      // Sort in memory since we don't have an index yet
      tripsData.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setTrips(tripsData);
      setLoading(false);
      initialLoadRef.current = false;
    }, (error) => {
      console.warn("Firestore onSnapshot warning/error (possible token sync latency):", error);
      // Fallback: If we fail because of token sync latency, let's retry with the safe query
      if (isTokenSynced) {
        const safeQ = query(
          collection(db, 'trips'),
          where('userId', '==', profile.userId)
        );
        onSnapshot(safeQ, (fallbackSnapshot) => {
          const tripsData = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          tripsData.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
          setTrips(tripsData);
          setLoading(false);
        }, (fallbackError) => {
          handleFirestoreError(fallbackError, OperationType.GET, 'trips');
        });
      } else {
        handleFirestoreError(error, OperationType.GET, 'trips');
      }
    });
    
    return unsubscribe;
  }, [profile, auth.currentUser?.displayName]);
  
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupAddress || !requestedDate || !requestedStartTime || passengerCount < 1) return;
    if (tripType === 'dropoff' && !dropoffAddress) return;
    if (tripType === 'return' && !returnLocations) return;
    
    try {
      await addDoc(collection(db, 'trips'), {
        userId: profile!.userId,
        passengerName: profile?.name?.trim() || profile?.email?.split('@')[0] || 'Unknown User',
        passengerDepartment: profile?.department || '',
        status: 'pending',
        pickupAddress,
        tripType,
        dropoffAddress: tripType === 'dropoff' ? dropoffAddress : null,
        returnLocations: tripType === 'return' ? returnLocations : null,
        expectedDistance: Number(expectedDistance) || 15,
        requestedDate,
        requestedStartTime,
        estimatedDestinationTime: estimatedDestinationTime ? estimatedDestinationTime : null,
        passengerCount,
        remarks: remarks || null,
        pickupLat: 0, // Mock for now
        pickupLng: 0,
        dropoffLat: 0,
        dropoffLng: 0,
        pickupTime: Date.now(),
        ...(nominatePerson ? {
          nominatedName: nominatedName.trim()
        } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setPickupAddress('');
      setTripType('dropoff');
      setDropoffAddress('');
      setReturnLocations('');
      setExpectedDistance('15');
      setRequestedDate('');
      setRequestedStartTime('');
      setEstimatedDestinationTime('');
      setPassengerCount(1);
      setRemarks('');
      setNominatePerson(false);
      setNominatedName('');
      toast.success('Trip requested successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trips');
    }
  };
  
  const handleCancelTrip = async (tripId: string) => {
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  return (
    <Layout title="My Bookings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="glass-card booking-card-attractive h-fit">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Book a Vehicle</h2>
              <p className="text-sm text-[#A0A0A0]">Fill in the details below to request your booking</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ff8c00]/10 border border-[#ff8c00]/20 rounded-full shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff8c00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff8c00]"></span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#ff8c00]">Instant Allocator</span>
            </div>
          </div>
          
          <form onSubmit={handleCreateTrip} className="space-y-6">
            <div>
              <label className="label">Trip Type</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Car className="w-5 h-5" />
                </div>
                <select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as 'dropoff' | 'return')}
                  className="input-field pl-icon appearance-none bg-[#0c1222] text-white cursor-pointer"
                >
                  <option value="dropoff" className="bg-[#0c1222] text-white font-medium">Drop down trip</option>
                  <option value="return" className="bg-[#0c1222] text-white font-medium">Round trip</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="label">Pickup Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="input-field pl-icon"
                  placeholder="Enter pickup location"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 cursor-pointer hover:text-slate-300">
                  <Crosshair className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            {tripType === 'dropoff' ? (
              <div>
                <label className="label">Dropoff Address</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    className="input-field pl-icon"
                    placeholder="Enter dropoff location"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 cursor-pointer hover:text-slate-300">
                    <Crosshair className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Destinations</label>
                <div className="relative">
                  <div className="absolute left-3 top-3.5 text-slate-500">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <textarea 
                    required
                    value={returnLocations}
                    onChange={(e) => setReturnLocations(e.target.value)}
                    className="input-field pl-icon"
                    placeholder="Enter intended route / destinations"
                    rows={2}
                  />
                </div>
              </div>
            )}
            

            <div>
               <div className="flex items-center justify-between mb-1.5">
                 <label className="label mb-0">Date & Start Time</label>
                 <div className="flex gap-1.5">
                   <button
                     type="button"
                     onClick={() => setQuickDateTime('now')}
                     className="text-[10px] font-bold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-0.5 rounded-lg border border-orange-500/20 transition-colors cursor-pointer"
                   >
                     Now
                   </button>
                   <button
                     type="button"
                     onClick={() => setQuickDateTime('today')}
                     className="text-[10px] font-bold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-0.5 rounded-lg border border-sky-500/20 transition-colors cursor-pointer"
                   >
                     Today
                   </button>
                   <button
                     type="button"
                     onClick={() => setQuickDateTime('tomorrow')}
                     className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 transition-colors cursor-pointer"
                   >
                     Tomorrow
                   </button>
                 </div>
               </div>
               <div className="flex gap-0 border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden focus-within:border-[#FF8C00]/50 transition-colors bg-[rgba(255,255,255,0.03)]">
                 <div className="relative flex-1 border-r border-white/10">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                     <Calendar className="w-5 h-5" />
                   </div>
                   <input 
                     type="date" 
                     required
                     min={new Date().toISOString().split('T')[0]}
                     max={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                     value={requestedDate}
                     onChange={(e) => setRequestedDate(e.target.value)}
                     className="w-full pl-10 pr-3 py-3.5 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-200 [color-scheme:dark]"
                   />
                 </div>
                 <div className="relative flex-1">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                     <Clock className="w-5 h-5" />
                   </div>
                   <input 
                     type="time" 
                     required
                     value={requestedStartTime}
                     onChange={(e) => setRequestedStartTime(e.target.value)}
                     className="w-full pl-10 pr-8 py-3.5 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-200 [color-scheme:dark]"
                   />
                 </div>
               </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="label">Passengers</label>
                <div className="relative flex items-center justify-between px-3 py-2 border border-[rgba(255,255,255,0.08)] rounded-xl bg-[rgba(255,255,255,0.03)] transition-colors focus-within:border-[#FF8C00]/50">
                   <div className="flex items-center gap-2 text-slate-200">
                     <Users className="w-5 h-5 text-slate-500" />
                     <span className="text-sm">{passengerCount} {passengerCount === 1 ? 'Passenger' : 'Passengers'}</span>
                   </div>
                   <div className="flex items-center gap-3">
                     <button type="button" onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors active:scale-95 border border-white/5">
                        <Minus className="w-4 h-4" />
                     </button>
                     <span className="w-4 text-center font-medium text-slate-200">{passengerCount}</span>
                     <button type="button" onClick={() => setPassengerCount(Math.min(10, passengerCount + 1))} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors active:scale-95 border border-white/5">
                        <Plus className="w-4 h-4" />
                     </button>
                   </div>
                </div>
              </div>
            </div>

            {/* Nominate Traveler Section */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-200">Nominate Another Passenger</span>
                  <span className="text-xs text-slate-400 font-sans">Enable if someone else will be traveling</span>
                </div>
                <input
                  type="checkbox"
                  checked={nominatePerson}
                  onChange={(e) => setNominatePerson(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer"
                />
              </div>

              {nominatePerson && (
                <div className="pt-1 animate-fadeIn">
                  <div>
                    <label className="label">Nominee Name</label>
                    <input
                      type="text"
                      required={nominatePerson}
                      value={nominatedName}
                      onChange={(e) => setNominatedName(e.target.value)}
                      className="input-field"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="label">Remarks / Notes (Optional)</label>
              <textarea 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="input-field"
                placeholder="Any notes..."
                rows={2}
              />
            </div>
            
            <Button type="submit" className="btn-primary mt-6">
              Request Booking
            </Button>
          </form>

          <div className="text-center text-[10px] font-medium tracking-wider text-slate-500 select-none pt-5 mt-5 border-t border-white/5">
            Copyright © {new Date().getFullYear()} <span className="font-bold">@SKOADMIN</span>. All Rights Reserved.
          </div>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          {/* User Profile Card with Inline Name/Dept Editor */}
          {profile && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border ${
                isPinLikeName(profile.name || '')
                  ? 'border-orange-500/30 bg-orange-500/5'
                  : 'border-white/10 bg-[#0f172a]/30'
              } backdrop-blur-md`}
            >
              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-sm font-bold text-slate-200">Edit Profile Information</h4>
                    <button 
                      onClick={() => setIsEditingProfile(false)}
                      className="text-slate-400 hover:text-slate-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={tempProfileName}
                        onChange={(e) => setTempProfileName(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-orange-500"
                        placeholder="Your Name"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Department</label>
                      <input
                        type="text"
                        value={tempProfileDept}
                        onChange={(e) => setTempProfileDept(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-orange-500"
                        placeholder="Your Department"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setIsEditingProfile(false)}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveProfile}
                      className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 gap-1.5 rounded-lg border-0"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">My Profile</span>
                      {isPinLikeName(profile.name || '') && (
                        <span className="flex items-center gap-1 text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold border border-orange-500/20">
                          <ShieldAlert className="w-3 h-3" /> PIN Username Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-lg font-bold text-slate-100">
                        {profile.name}
                      </h3>
                      {profile.department && (
                        <span className="text-xs text-slate-400 font-medium">({profile.department})</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      {isPinLikeName(profile.name || '') 
                        ? "Please click 'Edit Name' to set your real passenger name for drivers and admins."
                        : `Credential code: ${profile.email?.split('@')[0] || 'N/A'}`
                      }
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTempProfileName(profile.name || '');
                      setTempProfileDept(profile.department || '');
                      setIsEditingProfile(true);
                    }}
                    className={`text-xs gap-1.5 shrink-0 select-none py-1.5 px-3 rounded-lg border-white/10 text-slate-300 hover:text-white hover:bg-white/5 border ${
                      isPinLikeName(profile.name || '') ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' : ''
                    }`}
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Name
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-0.5">My Bookings</h2>
              <p className="text-xs text-slate-400 font-sans">Track and manage your requested rides</p>
            </div>
            
            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl shadow-inner max-w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'active' 
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/15' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Active ({trips.filter(t => !['completed', 'cancelled'].includes(t.status)).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('past')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'past' 
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/15' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Past ({trips.filter(t => ['completed', 'cancelled'].includes(t.status)).length})
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              <TripItemSkeleton />
              <TripItemSkeleton />
              <TripItemSkeleton />
            </div>
          ) : activeTab === 'active' ? (
            trips.filter(t => !['completed', 'cancelled'].includes(t.status)).length === 0 ? (
              <div className="glass-card text-center py-10 text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
                <Car className="w-8 h-8 text-slate-600 animate-pulse" />
                <p className="text-xs font-semibold text-slate-300">No active bookings right now.</p>
                <p className="text-[11px] text-slate-500 max-w-[220px] leading-relaxed">Book a vehicle using the form to start your journey!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const activeTrips = trips.filter(t => !['completed', 'cancelled'].includes(t.status));
                  const sortedTrips = [...activeTrips].sort((a, b) => {
                    const dateA = a.requestedDate || '';
                    const dateB = b.requestedDate || '';
                    return dateA.localeCompare(dateB);
                  });
                  
                  return sortedTrips.map((trip, index) => (
                    <UserTripItem 
                      key={trip.id} 
                      trip={trip} 
                      index={index} 
                      profile={profile}
                      isNormalFlow={isNormalFlow}
                      userOdometerValues={userOdometerValues}
                      setUserOdometerValues={setUserOdometerValues}
                      handleCancelTrip={handleCancelTrip}
                      handleConfirmOdometer={handleConfirmOdometer}
                      handleUpdateStatus={handleUpdateStatus}
                    />
                  ));
                })()}
              </div>
            )
          ) : (
            trips.filter(t => ['completed', 'cancelled'].includes(t.status)).length === 0 ? (
              <div className="glass-card text-center py-10 text-[#A0A0A0] flex flex-col items-center justify-center gap-3">
                <Clock className="w-8 h-8 text-slate-600 animate-pulse" />
                <p className="text-xs font-semibold text-slate-300">No historical records found.</p>
                <p className="text-[11px] text-slate-500">Your completed and cancelled rides will show up here.</p>
              </div>
            ) : (
               <div className="space-y-3">
                 {trips.filter(t => ['completed', 'cancelled'].includes(t.status)).map((trip, idx) => (
                    <motion.div 
                      key={trip.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 0.9, y: 0 }}
                      whileHover={{ opacity: 1, scale: 1.01 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.2) }}
                      className="border border-white/10 bg-[#0f172a]/30 backdrop-blur-[10px] rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-4 hover:opacity-100 transition-all hover:bg-slate-800/25 shadow-md shrink-0"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${trip.status === 'cancelled' ? 'bg-red-500' : trip.forceCompleted ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'}`} />
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold ${trip.status === 'cancelled' ? 'text-red-400' : trip.forceCompleted ? 'text-amber-400' : 'text-slate-400'}`}>
                            {trip.forceCompleted ? 'Force Completed' : trip.status.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 font-bold ml-1">SO-{new Date().getFullYear()}-{trip.id.substring(0, 4).toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-200">
                          {trip.pickupAddress} &rarr; {trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress}
                        </p>
                        {trip.endOdometer !== undefined && trip.startOdometer !== undefined && (
                          <p className="text-[10px] text-orange-400/80 font-mono font-semibold mt-1">Mileage: {(Number(trip.endOdometer) - Number(trip.startOdometer))} KM ({trip.startOdometer} &rarr; {trip.endOdometer} KM)</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-slate-400 self-start sm:self-center">
                        <p className="font-semibold">{trip.requestedDate}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{trip.requestedStartTime}</p>
                      </div>
                    </motion.div>
                 ))}
               </div>
            )
          )}
        </div>
      </div>
    </Layout>
  );
}
