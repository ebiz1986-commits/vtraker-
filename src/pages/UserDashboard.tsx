import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { sendPushNotification } from '../lib/utils';
import { ChevronDown, ArrowRight, MapPin, Clock, Car, Calendar, Crosshair, Users, Minus, Plus, Navigation } from 'lucide-react';

const UserTripItem = ({ trip, index, profile, userOdometerValues, setUserOdometerValues, handleCancelTrip, handleConfirmOdometer, handleUpdateStatus }: any) => {
  const [expanded, setExpanded] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
  
  const isAllocatedOrLater = ['allocated', 'driver_started', 'in_progress', 'driver_ended', 'completed'].includes(trip.status);
  const statusColor = trip.status === 'pending' ? 'text-yellow-500' : 'text-green-500';
  const statusBgColor = trip.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500';
  const formattedStatus = trip.forceCompleted ? 'Force Completed' : trip.status.replace('_', ' ');

  // A visually appealing trip ID based on original document ID
  const displayId = `SO-${new Date().getFullYear()}-${trip.id.substring(0, 4).toUpperCase()}`;

  return (
    <div style={{ animationDelay: `${index * 100}ms` }} className="glass-card mb-4 animate-in slide-in-from-bottom-4 fade-in fill-mode-both duration-500">
      {/* Clickable Area */}
      <div 
        className="p-1 cursor-pointer relative z-10"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header: Status and ID */}
        <div className="flex justify-between items-center mb-5">
          <span className={`status-badge status-${trip.status}`}>
            {formattedStatus}
          </span>
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
              <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-[#0a0f1c] mt-1 shrink-0" />
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
      </div>

      {/* Expandable Content (Actions & Details) */}
      <div className={`transition-all duration-300 ease-in-out origin-top relative z-0 ${expanded ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-5 pt-0">
          <div className="bg-black/30 border border-white/5 p-4 rounded-xl mt-2">
            <div className="grid grid-cols-2 gap-4">
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
              <Button variant="outline" size="sm" onClick={() => handleCancelTrip(trip.id)} className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/50 py-6 text-sm font-semibold rounded-xl transition-all">
                Cancel Booking
              </Button>
            )}
            
            {trip.status === 'allocated' && trip.driverHasSmartphone === false && (
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6 text-sm rounded-xl shadow-lg ring-1 ring-orange-500/50 transition-all" 
                onClick={() => handleUpdateStatus(trip.id, trip.status)}
              >
                Driver Arrived - Start Trip
              </Button>
            )}
            
            {trip.status === 'driver_started' && (
              <div className="flex flex-col gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm shadow-xl mt-2 backdrop-blur-sm">
                <p className="font-bold text-orange-400 text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                  Driver Arrived
                </p>
                <div className="text-orange-100">
                  <label className="text-orange-400/80 text-[10px] uppercase font-bold tracking-wider block mb-1.5">Start Odometer (KM)</label>
                  <input 
                    type="number" 
                    className="input-field block font-mono bg-[rgba(0,0,0,0.2)]"
                    placeholder="e.g. 15020"
                    value={userOdometerValues[trip.id] || ''} 
                    onChange={(e) => setUserOdometerValues({...userOdometerValues, [trip.id]: e.target.value})} 
                  />
                  <Button size="lg" onClick={() => handleConfirmOdometer(trip, 'start')} className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0 mt-3 font-semibold rounded-lg shadow-lg shadow-orange-900/20 transition-all py-5">Confirm Start</Button>
                </div>
              </div>
            )}
            
            {trip.status === 'in_progress' && (
              <>
                <div className="text-base font-semibold text-green-400 bg-green-500/10 p-4 rounded-xl border border-green-500/20 flex justify-center items-center gap-3 backdrop-blur-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                  Trip in Progress
                </div>
                {trip.driverHasSmartphone === false && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-sm rounded-xl shadow-lg ring-1 ring-green-500/50 transition-all mt-2" 
                    onClick={() => handleUpdateStatus(trip.id, trip.status)}
                  >
                    End Trip (Drop-off)
                  </Button>
                )}
              </>
            )}
            
            {trip.status === 'driver_ended' && (
              <div className="flex flex-col gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm shadow-xl mt-2 backdrop-blur-sm">
                <p className="font-bold text-orange-400 text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                  Destination Reached
                </p>
                <div className="text-orange-100">
                  <label className="text-orange-400/80 text-[10px] uppercase font-bold tracking-wider block mb-1.5">End Odometer (KM)</label>
                  <input 
                    type="number" 
                    className="input-field block font-mono bg-[rgba(0,0,0,0.2)]"
                    placeholder="e.g. 15045"
                    value={userOdometerValues[trip.id] || ''} 
                    onChange={(e) => setUserOdometerValues({...userOdometerValues, [trip.id]: e.target.value})} 
                  />
                  <Button size="lg" onClick={() => handleConfirmOdometer(trip, 'end')} className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0 mt-3 font-semibold rounded-lg shadow-lg shadow-orange-900/20 transition-all py-5">Confirm Drop-off</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function UserDashboard() {
  const { profile } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialLoadRef = useRef(true);

  // Form State
  const [pickupAddress, setPickupAddress] = useState('');
  const [tripType, setTripType] = useState<'dropoff' | 'return'>('dropoff');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [returnLocations, setReturnLocations] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedStartTime, setRequestedStartTime] = useState('');
  const [estimatedDestinationTime, setEstimatedDestinationTime] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [remarks, setRemarks] = useState('');
  const [userOdometerValues, setUserOdometerValues] = useState<{[key: string]: string}>({});
  // Simulating coordinates for now
  
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
    
    const q = query(
      collection(db, 'trips'),
      where('userId', '==', profile.userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialLoadRef.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'modified') {
            const trip = change.doc.data();
            const jointText = trip.isJointTrip ? ' (JOINT TRIP)' : '';
            if (trip.status === 'allocated') {
              toast.success(`Driver Allocated!${jointText}`, {
                description: `Your trip to ${trip.tripType === 'dropoff' ? trip.dropoffAddress : 'multiple destinations'} has been assigned a driver.`,
                duration: 5000,
              });
              sendPushNotification(`Driver Allocated!${jointText}`, {
                body: `Your trip to ${trip.tripType === 'dropoff' ? trip.dropoffAddress : 'multiple destinations'} has been assigned a driver.`
              });
            } else if (trip.status === 'driver_started') {
              toast.info('Driver Arrived!', {
                description: 'Your driver has arrived. Please confirm the Start Odometer reading.',
                duration: 8000,
              });
              sendPushNotification('Driver Arrived!', {
                body: 'Your driver has arrived. Please confirm the Start Odometer reading.'
              });
            } else if (trip.status === 'in_progress') {
              toast.info('Trip Started', {
                description: 'Your driver has started the trip.',
              });
              sendPushNotification('Trip Started', {
                body: 'Your driver has started the trip.'
              });
            } else if (trip.status === 'driver_ended') {
              toast.info('Driver Reached Destination!', {
                description: 'Your driver has ended the trip. Please confirm the End Odometer reading.',
                duration: 8000,
              });
              sendPushNotification('Driver Reached Destination!', {
                body: 'Your driver has ended the trip. Please confirm the End Odometer reading.'
              });
            } else if (trip.status === 'completed') {
              if (trip.forceCompleted) {
                toast.info('Trip Force-Closed by Admin', {
                  description: 'The admin has finalized your trip because the end odometer was not provided.',
                });
                sendPushNotification('Trip Force-Closed by Admin', {
                  body: 'The admin has finalized your trip because the end odometer was not provided.'
                });
              } else {
                toast.success('Trip Completed', {
                  description: 'You have reached your destination.',
                });
                sendPushNotification('Trip Completed', {
                  body: 'You have reached your destination.'
                });
              }
            }
          }
        });
      }

      const tripsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      // Sort in memory since we don't have an index yet
      tripsData.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setTrips(tripsData);
      setLoading(false);
      initialLoadRef.current = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trips');
    });
    
    return unsubscribe;
  }, [profile]);
  
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupAddress || !requestedDate || !requestedStartTime || passengerCount < 1) return;
    if (tripType === 'dropoff' && !dropoffAddress) return;
    if (tripType === 'return' && !returnLocations) return;
    
    try {
      await addDoc(collection(db, 'trips'), {
        userId: profile!.userId,
        passengerName: profile?.name || 'Unknown',
        passengerDepartment: profile?.department || '',
        status: 'pending',
        pickupAddress,
        tripType,
        dropoffAddress: tripType === 'dropoff' ? dropoffAddress : null,
        returnLocations: tripType === 'return' ? returnLocations : null,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setPickupAddress('');
      setTripType('dropoff');
      setDropoffAddress('');
      setReturnLocations('');
      setRequestedDate('');
      setRequestedStartTime('');
      setEstimatedDestinationTime('');
      setPassengerCount(1);
      setRemarks('');
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
        <div className="glass-card h-fit">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Book a Vehicle</h2>
            <p className="text-sm text-[#A0A0A0]">Fill in the details below to request your booking</p>
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
                  className="input-field pl-11 appearance-none"
                >
                  <option value="dropoff">Local Trip</option>
                  <option value="return">Return Trip / Tour</option>
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
                  className="input-field pl-11"
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
                    className="input-field pl-11"
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
                    className="input-field pl-11"
                    placeholder="Enter intended route / destinations"
                    rows={2}
                  />
                </div>
              </div>
            )}
            
            <div>
               <label className="label">Date & Start Time</label>
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
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">My Active Trips</h2>
            <p className="text-sm text-slate-400">Overview of your upcoming and ongoing trips</p>
          </div>
          
          {loading ? (
            <div className="text-slate-400 text-center py-8">Loading trips...</div>
          ) : trips.length === 0 ? (
            <div className="glass-card text-center py-8 text-[#A0A0A0]">No trips found. Book a vehicle to get started!</div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const activeTrips = trips.filter(t => !['completed', 'cancelled'].includes(t.status));
                if (activeTrips.length === 0) return <div className="glass-card text-center py-8 text-[#A0A0A0]">No active trips found.</div>;
                
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
                    userOdometerValues={userOdometerValues}
                    setUserOdometerValues={setUserOdometerValues}
                    handleCancelTrip={handleCancelTrip}
                    handleConfirmOdometer={handleConfirmOdometer}
                    handleUpdateStatus={handleUpdateStatus}
                  />
                ));
              })()}
            </div>
          )}

          {/* History Section (Simplified) */}
          {trips.filter(t => ['completed', 'cancelled'].includes(t.status)).length > 0 && (
             <div className="mt-12">
               <h3 className="text-lg font-bold text-white mb-4">Past Trips</h3>
               <div className="space-y-3">
                 {trips.filter(t => ['completed', 'cancelled'].includes(t.status)).map((trip) => (
                    <div key={trip.id} className="border border-white/10 bg-white/5 backdrop-blur-[10px] rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-4 opacity-70 hover:opacity-100 transition-all hover:bg-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${trip.status === 'cancelled' ? 'bg-red-500' : 'bg-slate-500'}`} />
                          <span className={`text-xs font-semibold capitalize ${trip.status === 'cancelled' ? 'text-red-400' : 'text-slate-400'}`}>
                            {trip.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300">
                          {trip.pickupAddress} &rarr; {trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress}
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>{trip.requestedDate}</p>
                      </div>
                    </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
