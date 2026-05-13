import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { toast } from 'sonner';

import { ChevronDown, ArrowRight, MapPin, Clock } from 'lucide-react';

const AdminPendingTripItem = ({ 
  trip, 
  allUsers, 
  isCouplingMode, 
  coupledTripIds, 
  setCoupledTripIds,
  allocatingTrip,
  setAllocatingTrip,
  handleAllocate,
  handleAmendTrip,
  handleRejectTrip,
  renderDriverSelect,
  renderVehicleSelect,
  selectedDriver,
  selectedVehicle
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;

  useEffect(() => {
    if (allocatingTrip === trip.id) setExpanded(true);
  }, [allocatingTrip, trip.id]);

  return (
    <div className={`glass-card ${isCouplingMode && coupledTripIds.includes(trip.id) ? 'border-orange-500/50 bg-orange-500/20 shadow-[0_0_15px_rgba(255,140,0,0.3)]' : ''} mb-4 animate-in slide-in-from-bottom-6 fade-in fill-mode-both duration-500 overflow-hidden`}>
      <div 
        className="p-4 sm:p-5 flex justify-between items-center gap-4 transition-colors hover:bg-slate-800/30 group cursor-pointer"
        onClick={() => {
           if (isCouplingMode) {
             if (coupledTripIds.includes(trip.id)) setCoupledTripIds(coupledTripIds.filter((id: string) => id !== trip.id));
             else setCoupledTripIds([...coupledTripIds, trip.id]);
           } else {
             setExpanded(!expanded);
           }
        }}
      >
        <div className="flex-1 min-w-0 flex items-start gap-3">
          {isCouplingMode && (
            <div className="pt-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-orange-600 cursor-pointer"
                checked={coupledTripIds.includes(trip.id)}
                onChange={(e) => {
                  if (e.target.checked) setCoupledTripIds([...coupledTripIds, trip.id]);
                  else setCoupledTripIds(coupledTripIds.filter((id: string) => id !== trip.id));
                }}
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
             <div className="flex flex-wrap items-center gap-2 mb-2">
               <span className={`px-2 py-0.5 text-xs rounded-full font-medium uppercase tracking-wider border flex items-center gap-2 max-w-fit bg-yellow-900/30 text-yellow-400 border-yellow-900/50`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {trip.status.replace('_', ' ')}
               </span>
               <span className="text-xs font-medium text-slate-300 bg-[#1e293b] px-2 py-0.5 rounded uppercase tracking-wider">
                 {trip.tripType || 'dropoff'}
               </span>
               <span className="text-[10px] text-slate-400 font-medium ml-1">User: {allUsers.find((u: any) => u.userId === trip.userId)?.name || 'Unknown'}</span>
             </div>
             
             <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                <div className="flex items-center gap-2 min-w-0 text-slate-100 font-semibold md:text-md">
                  <span className="truncate">{trip.pickupAddress}</span>
                </div>
                
                <ArrowRight className="w-4 h-4 text-slate-500 hidden sm:block flex-shrink-0" />
                
                <div className="flex items-center gap-2 min-w-0 text-slate-100 font-semibold md:text-md">
                  <span className="sm:hidden text-slate-500 text-sm font-medium mr-1">to</span>
                  <span className="truncate">{destination}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right flex-shrink-0">
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-slate-400 mb-0.5 flex items-center justify-end gap-1 uppercase tracking-wider">
              <Clock className="w-3 h-3" /> Req. Time
            </p>
            <p className="font-semibold text-slate-200">{trip.requestedStartTime || 'N/A'}</p>
          </div>
          <div className="sm:hidden">
            <p className="font-semibold text-slate-200 text-sm">{trip.requestedStartTime || 'N/A'}</p>
          </div>
          <div className={`p-1.5 rounded-full bg-slate-800 text-slate-400 transition-colors group-hover:text-slate-200 group-hover:bg-slate-700`}>
            <ChevronDown className={`w-5 h-5 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      <div className={`transition-all duration-300 ease-in-out origin-top ${expanded ? 'max-h-[1500px] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0'}`}>
         <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/50">
            <div className="space-y-3 mb-6 bg-[#0f172a] border border-[#1e293b] p-4 rounded-md mt-4 shadow-inner">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Pickup</p>
                    <p className="font-medium text-slate-100 mt-0.5">{trip.pickupAddress}</p>
                 </div>
                 {trip.tripType === 'return' ? (
                   <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Destinations</p>
                      <p className="font-medium text-slate-100 mt-0.5">{trip.returnLocations}</p>
                   </div>
                 ) : (
                   <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Dropoff</p>
                      <p className="font-medium text-slate-100 mt-0.5">{trip.dropoffAddress}</p>
                   </div>
                 )}
               </div>
               
               <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700/50">
                  {trip.requestedDate && (
                    <div><p className="text-xs font-semibold text-slate-400 uppercase">Req. Date</p><p className="font-medium text-slate-100">{trip.requestedDate}</p></div>
                  )}
                  {trip.requestedStartTime && (
                    <div><p className="text-xs font-semibold text-slate-400 uppercase">Req. Start</p><p className="font-medium text-slate-100">{trip.requestedStartTime}</p></div>
                  )}
                  {trip.estimatedDestinationTime && (
                    <div><p className="text-xs font-semibold text-slate-400 uppercase">Est. Time</p><p className="font-medium text-slate-100">{trip.estimatedDestinationTime}</p></div>
                  )}
                  {trip.passengerCount && (
                    <div><p className="text-xs font-semibold text-slate-400 uppercase">Passengers</p><p className="font-medium text-slate-100">{trip.passengerCount}</p></div>
                  )}
               </div>

               {trip.remarks && (
                 <div className="pt-3 mt-3 border-t border-slate-700/50">
                   <p className="text-xs font-semibold text-slate-400 uppercase">Remarks / Notes</p>
                   <p className="italic text-slate-300 mt-1 bg-slate-800/50 p-2 rounded border border-slate-700">"{trip.remarks}"</p>
                 </div>
               )}
            </div>

            {!isCouplingMode && allocatingTrip === trip.id ? (
              <div className="bg-blue-900/10 p-4 border border-blue-900/40 rounded-lg mt-2 shadow-lg mb-2">
                 <h4 className="text-sm font-semibold mb-4 text-blue-300 uppercase tracking-widest flex items-center gap-2">Allocate Trip</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                   <div>{renderDriverSelect()}</div>
                   <div>{renderVehicleSelect()}</div>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3">
                   <Button className="flex-1 bg-blue-600 hover:bg-blue-700 py-6 text-white font-semibold text-lg" onClick={() => handleAllocate(trip.id)} disabled={!selectedDriver || !selectedVehicle}>Confirm Dispatch</Button>
                   <Button variant="outline" className="py-6 sm:w-1/3" onClick={() => setAllocatingTrip(null)}>Cancel</Button>
                 </div>
              </div>
            ) : !isCouplingMode && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                 <Button onClick={() => { setAllocatingTrip(trip.id); setExpanded(true); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold">Allocate Driver</Button>
                 <Button onClick={() => {
                   const nt = prompt("Amend Time (HH:MM) - 24 hour format", trip.requestedStartTime || "08:00");
                   if (nt) handleAmendTrip(trip.id, nt);
                 }} variant="outline" className="flex-1">Amend Time</Button>
                 <Button onClick={() => handleRejectTrip(trip.id)} variant="destructive" className="flex-1">Reject Trip</Button>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

const AdminActiveTripItem = ({ trip, drivers, handleForceCompleteTrip }: any) => {
  const [expanded, setExpanded] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
  const driver = drivers.find((d: any) => d.userId === trip.driverId);

  return (
    <div className="glass-card mb-4 animate-in slide-in-from-bottom-6 fade-in fill-mode-both duration-500 overflow-hidden">
      <div 
        className="p-4 sm:p-5 cursor-pointer flex justify-between items-center gap-4 transition-colors hover:bg-slate-800/30 group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium uppercase tracking-wider border flex items-center gap-2 max-w-fit
              ${trip.status === 'allocated' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' : 
                trip.status === 'in_progress' ? 'bg-purple-900/30 text-purple-400 border-purple-900/50' : 'bg-amber-900/30 text-amber-500 border-amber-900/50'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              {trip.status.replace('_', ' ')}
            </span>
            {trip.isJointTrip && (
              <span className="text-xs font-medium text-[#ff9900] bg-[#ff9900]/10 px-2 py-0.5 rounded uppercase tracking-wider border border-[#ff9900]/20">
                JOINT
              </span>
            )}
            {trip.tripType && (
              <span className="text-xs font-medium text-slate-300 bg-[#1e293b] px-2 py-0.5 rounded uppercase tracking-wider">
                {trip.tripType}
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-medium ml-1">Driver: {driver?.name || 'Unknown'}</span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
            <div className="flex items-center gap-2 min-w-0 text-slate-100 font-semibold md:text-md">
              <span className="truncate">{trip.pickupAddress}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 hidden sm:block flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0 text-slate-100 font-semibold md:text-md">
              <span className="sm:hidden text-slate-500 text-sm font-medium mr-1">to</span>
              <span className="truncate">{destination}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right flex-shrink-0">
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-slate-400 mb-0.5 flex items-center justify-end gap-1 uppercase tracking-wider">
              <Clock className="w-3 h-3" /> Date
            </p>
            <p className="font-semibold text-slate-200">{trip.requestedDate || 'N/A'}</p>
          </div>
          <div className={`p-1.5 rounded-full bg-slate-800 text-slate-400 transition-colors group-hover:text-slate-200 group-hover:bg-slate-700`}>
            <ChevronDown className={`w-5 h-5 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      <div className={`transition-all duration-300 ease-in-out origin-top ${expanded ? 'max-h-[1500px] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0'}`}>
         <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/50">
            <div className="space-y-3 mb-4 bg-[#0f172a] border border-[#1e293b] p-4 rounded-md mt-4 shadow-inner">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Pickup</p>
                    <p className="font-medium text-slate-100 mt-0.5">{trip.pickupAddress}</p>
                 </div>
                 {trip.tripType === 'return' ? (
                   <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Destinations</p>
                      <p className="font-medium text-slate-100 mt-0.5">{trip.returnLocations}</p>
                   </div>
                 ) : (
                   <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Dropoff</p>
                      <p className="font-medium text-slate-100 mt-0.5">{trip.dropoffAddress}</p>
                   </div>
                 )}
               </div>
               
               <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700/50">
                  {trip.requestedDate && (
                    <div><p className="text-xs font-semibold text-slate-400 uppercase">Req. Date</p><p className="font-medium text-slate-100">{trip.requestedDate}</p></div>
                  )}
                  {trip.requestedStartTime && (
                    <div><p className="text-xs font-semibold text-slate-400 uppercase">Req. Start</p><p className="font-medium text-slate-100">{trip.requestedStartTime}</p></div>
                  )}
               </div>
            </div>

            {trip.status === 'driver_ended' && Date.now() - (trip.driverEndedTime || 0) > 10 * 60 * 1000 && (
              <div className="bg-red-900/10 p-4 border border-red-900/40 rounded-lg flex flex-col gap-3 shadow-lg mt-4">
                <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <span className="bg-red-500/20 p-1 rounded-full text-red-300 shrink-0">⚠️</span>
                  Driver ended this trip &gt;10 mins ago, but passenger has not confirmed End Odometer.
                </p>
                <Button size="lg" variant="destructive" className="w-full sm:w-auto self-start" onClick={() => handleForceCompleteTrip(trip.id)}>
                  Force Complete Trip
                </Button>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialLoadRef = useRef(true);

  // Selection state for allocation
  const [allocatingTrip, setAllocatingTrip] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [isCouplingMode, setIsCouplingMode] = useState(false);
  const [coupledTripIds, setCoupledTripIds] = useState<string[]>([]);
  
  // Filtering and sorting state for allocation
  const [driverFilter, setDriverFilter] = useState('all'); // all, available, busy
  const [vehicleFilter, setVehicleFilter] = useState('all'); // all, available, busy
  
  // New Vehicle state
  const [newVehicle, setNewVehicle] = useState({ type: 'car', reg: '' });
  
  // New User state
  const [newUser, setNewUser] = useState({ name: '', role: 'driver', pin: '', department: '', hasSmartphone: true });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen to Trips
    const qTrips = query(collection(db, 'trips'));
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      // Check for notifications
      if (!initialLoadRef.current) {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const trip = change.doc.data();
            const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
            if (trip.status === 'pending') {
              toast('New Trip Request', {
                description: `From ${trip.pickupAddress} to ${destination}`,
                action: {
                  label: 'View',
                  onClick: () => window.scrollTo(0, 0),
                },
              });
            }
          }
        });
      }
      
      const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setTrips(data);
      
      initialLoadRef.current = false;
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'trips'));

    // Listen to Users (for roles)
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const allUsers = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setDrivers(allUsers.filter(u => u.role === 'driver'));
      // Adding all users to state if we want to list them
      setAllUsers(allUsers);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // Listen to Vehicles
    const qVehicles = query(collection(db, 'vehicles'));
    const unsubVehicles = onSnapshot(qVehicles, (snap) => {
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'vehicles'));

    return () => {
      unsubTrips();
      unsubUsers();
      unsubVehicles();
    };
  }, []);

  const handleAllocate = async (tripId: string) => {
    if (!selectedDriver || !selectedVehicle) return;
    try {
      const driver = drivers.find(d => d.id === selectedDriver);
      const vehicle = vehicles.find(v => v.id === selectedVehicle);
      
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'allocated',
        driverId: selectedDriver,
        driverName: driver?.name || 'Unknown Driver',
        driverPhone: driver?.phone || '',
        driverHasSmartphone: driver?.hasSmartphone !== false, // Default to true if undefined
        vehicleId: selectedVehicle,
        vehicleName: vehicle ? `${vehicle.registrationNumber} (${vehicle.type})` : 'Unknown Vehicle',
        allocatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setAllocatingTrip(null);
      setSelectedDriver('');
      setSelectedVehicle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const handleAllocateCoupledTrips = async () => {
    if (!selectedDriver || !selectedVehicle || coupledTripIds.length === 0) return;
    try {
      const driver = drivers.find(d => d.id === selectedDriver);
      const vehicle = vehicles.find(v => v.id === selectedVehicle);
      
      const coupledTripDocs = pendingTrips.filter(t => coupledTripIds.includes(t.id));
      const jointPassengers = coupledTripDocs.map(t => ({ name: t.passengerName || 'Unknown', department: t.passengerDepartment || '' }));

      const promises = coupledTripIds.map(id => updateDoc(doc(db, 'trips', id), {
        status: 'allocated',
        driverId: selectedDriver,
        driverName: driver?.name || 'Unknown Driver',
        driverPhone: driver?.phone || '',
        driverHasSmartphone: driver?.hasSmartphone !== false,
        vehicleId: selectedVehicle,
        vehicleName: vehicle ? `${vehicle.registrationNumber} (${vehicle.type})` : 'Unknown Vehicle',
        isJointTrip: true,
        jointPassengers,
        allocatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
      
      await Promise.all(promises);
      toast.success(`Successfully allocated ${coupledTripIds.length} coupled trips`);
      
      setIsCouplingMode(false);
      setCoupledTripIds([]);
      setSelectedDriver('');
      setSelectedVehicle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/coupled-multiple`);
    }
  };

  const handleRejectTrip = async (tripId: string) => {
    if (!window.confirm("Are you sure you want to reject this trip request?")) return;
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
      toast.success("Trip rejected");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const handleForceCompleteTrip = async (tripId: string) => {
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'completed',
        dropoffTime: Date.now(),
        forceCompleted: true,
        updatedAt: serverTimestamp()
      });
      toast.success("Trip marked as completed");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const handleAmendTrip = async (tripId: string, newTimeStr: string) => {
    try {
      const timeParts = newTimeStr.split(':');
      const now = new Date();
      now.setHours(parseInt(timeParts[0] || '0', 10), parseInt(timeParts[1] || '0', 10), 0, 0);
      
      await updateDoc(doc(db, 'trips', tripId), {
        requestedStartTime: newTimeStr,
        pickupTime: now.getTime(),
        updatedAt: serverTimestamp()
      });
      toast.success("Trip time amended");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.reg) return;
    
    // Generate a random ID since we are using setDoc
    const vtId = 'veh_' + Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, 'vehicles', vtId), {
        type: newVehicle.type,
        registrationNumber: newVehicle.reg,
        status: 'available',
      });
      setNewVehicle({ type: 'car', reg: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'vehicles');
    }
  };

  const handleSetRole = async (userId: string, targetRole: 'driver' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: targetRole
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently remove this user from the system?")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success("User removed from the system");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.pin || newUser.pin.length < 6) return;
    setIsCreatingUser(true);
    
    const generatedEmail = `${newUser.pin}@sanken.app`;
    
    try {
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, generatedEmail, newUser.pin);
      const newUid = userCredential.user.uid;
      
      await signOut(secondaryAuth);
      
      await setDoc(doc(db, 'users', newUid), {
        userId: newUid,
        email: generatedEmail,
        name: newUser.name,
        role: newUser.role,
        department: newUser.department,
        hasSmartphone: newUser.role === 'driver' ? newUser.hasSmartphone : undefined,
        createdAt: serverTimestamp()
      });
      
      setNewUser({ name: '', role: 'driver', pin: '', department: '', hasSmartphone: true });
      setIsCreatingUser(false);
    } catch (error: any) {
      setIsCreatingUser(false);
      if (error.message.includes('auth/email-already-in-use')) {
        alert("This PIN code is already in use.");
      } else {
        alert("Error creating user: " + error.message);
      }
    }
  };

  const handleExportCSV = () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentTrips = trips.filter(t => t.createdAt && (t.createdAt?.toMillis?.() || 0) > sevenDaysAgo);
    
    if (recentTrips.length === 0) {
      alert("No trips found in the last 7 days.");
      return;
    }

    const headers = [
      'Trip ID', 'Status', 'Date', 'Requested Date', 'Type', 'User Name', 'User Email', 'Driver Name', 
      'Vehicle ID', 'Pickup Address', 'Dropoff Address', 'Return Locations', 'Requested Start', 
      'Passengers', 'Remarks', 'Start ODO', 'End ODO', 'KM Traveled'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    recentTrips.forEach(trip => {
      const user = allUsers.find(u => u.userId === trip.userId) || {};
      const driver = allUsers.find(d => d.userId === trip.driverId) || {};
      const vehicle = vehicles.find(v => v.id === trip.vehicleId) || {};
      
      const tripDate = trip.createdAt ? new Date(trip.createdAt?.toMillis?.() || Date.now()).toLocaleString().replace(/,/g, '') : '';
      const startOdo = trip.startOdometer || '';
      const endOdo = trip.endOdometer || '';
      const kmTraveled = (typeof startOdo === 'number' && typeof endOdo === 'number') ? (endOdo - startOdo) : '';
      
      const row = [
        trip.id,
        trip.status,
        tripDate,
        `"${trip.requestedDate || ''}"`,
        `"${trip.tripType || 'dropoff'}"`,
        `"${user.name || ''}"`,
        `"${user.email || ''}"`,
        `"${driver.name || ''}"`,
        `"${vehicle.registrationNumber || ''}"`,
        `"${(trip.pickupAddress || '').replace(/"/g, '""')}"`,
        `"${(trip.dropoffAddress || '').replace(/"/g, '""')}"`,
        `"${(trip.returnLocations || '').replace(/"/g, '""')}"`,
        `"${trip.requestedStartTime || ''}"`,
        trip.passengerCount || 1,
        `"${(trip.remarks || '').replace(/"/g, '""')}"`,
        startOdo,
        endOdo,
        kmTraveled
      ];
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Trips_7_Days_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const computedDrivers = drivers.map(d => {
    const driversTrips = trips.filter(t => t.driverId === d.userId).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const activeTrip = driversTrips.find(t => !['completed', 'cancelled', 'pending'].includes(t.status));
    const lastTrip = driversTrips.find(t => t.status === 'completed');

    const status = activeTrip ? 'busy' : 'available';
    const location = activeTrip ? `${activeTrip.dropoffAddress}${activeTrip.tripType === 'return' ? ` / ${activeTrip.returnLocations}` : ''}` : (lastTrip ? `${lastTrip.dropoffAddress}${lastTrip.tripType === 'return' ? ` / ${lastTrip.returnLocations}` : ''}` : 'Unknown');

    return { ...d, computedStatus: status, computedLocation: location };
  });

  const computedVehicles = vehicles.map(v => {
    const vehTrips = trips.filter(t => t.vehicleId === v.id).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const activeTrip = vehTrips.find(t => !['completed', 'cancelled', 'pending'].includes(t.status));
    const lastTrip = vehTrips.find(t => t.status === 'completed');

    const status = activeTrip ? 'busy' : 'available';
    const location = activeTrip ? `${activeTrip.dropoffAddress}${activeTrip.tripType === 'return' ? ` / ${activeTrip.returnLocations}` : ''}` : (lastTrip ? `${lastTrip.dropoffAddress}${lastTrip.tripType === 'return' ? ` / ${lastTrip.returnLocations}` : ''}` : 'Unknown');

    return { ...v, computedStatus: status, computedLocation: location };
  });

  const pendingTrips = trips.filter(t => t.status === 'pending');
  const activeTrips = trips.filter(t => t.status === 'allocated' || t.status === 'driver_started' || t.status === 'in_progress' || t.status === 'driver_ended');

  const filteredDrivers = computedDrivers.filter(d => driverFilter === 'all' || d.computedStatus === driverFilter).sort((a, b) => {
    if (a.computedStatus !== b.computedStatus) return a.computedStatus === 'available' ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });
  const filteredVehicles = computedVehicles.filter(v => vehicleFilter === 'all' || v.computedStatus === vehicleFilter).sort((a, b) => {
    if (a.computedStatus !== b.computedStatus) return a.computedStatus === 'available' ? -1 : 1;
    return (a.registrationNumber || '').localeCompare(b.registrationNumber || '');
  });

  const renderDriverSelect = () => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-slate-400">Select Driver</label>
        <div className="flex gap-1 text-[10px]">
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${driverFilter === 'all' ? 'bg-[#ff9900] text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setDriverFilter('all')}>All</button>
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${driverFilter === 'available' ? 'bg-emerald-600 text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setDriverFilter('available')}>Available</button>
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${driverFilter === 'busy' ? 'bg-orange-600 text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setDriverFilter('busy')}>Busy</button>
        </div>
      </div>
      <select 
        className="w-full text-sm p-2 border border-[#1f2937] rounded focus:ring-2 focus:ring-[#ff9900] outline-none bg-[#0a0f1c] text-slate-100"
        value={selectedDriver}
        onChange={e => setSelectedDriver(e.target.value)}
      >
        <option value="">-- Choose Driver --</option>
        {filteredDrivers.map(d => (
          <option key={d.id} value={d.userId}>
            {d.name || d.email} [{d.computedStatus === 'available' ? 'Available' : 'Busy'}] - {d.computedLocation}
          </option>
        ))}
      </select>
    </div>
  );

  const renderVehicleSelect = () => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-slate-400">Select Vehicle</label>
        <div className="flex gap-1 text-[10px]">
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${vehicleFilter === 'all' ? 'bg-[#ff9900] text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setVehicleFilter('all')}>All</button>
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${vehicleFilter === 'available' ? 'bg-emerald-600 text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setVehicleFilter('available')}>Available</button>
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${vehicleFilter === 'busy' ? 'bg-orange-600 text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setVehicleFilter('busy')}>Busy</button>
        </div>
      </div>
      <select 
        className="w-full text-sm p-2 border border-[#1f2937] rounded focus:ring-2 focus:ring-[#ff9900] outline-none bg-[#0a0f1c] text-slate-100"
        value={selectedVehicle}
        onChange={e => setSelectedVehicle(e.target.value)}
      >
        <option value="">-- Choose Vehicle --</option>
        {filteredVehicles.map(v => (
          <option key={v.id} value={v.id}>
            {v.registrationNumber} ({v.type}) [{v.computedStatus === 'available' ? 'Available' : 'Busy'}] - {v.computedLocation}
          </option>
        ))}
      </select>
    </div>
  );

  const handleClearData = async () => {
    if (!window.confirm("Are you sure you want to clear ALL trips and timesheets? This action cannot be undone.")) return;
    try {
      const tripsPromise = trips.map(t => deleteDoc(doc(db, 'trips', t.id)).catch(e => console.error("Error deleting trip", e)));
      const timesheetsSnap = await getDocs(collection(db, 'timesheets')).catch(e => { console.log(e); return {docs: []}; });
      const timesheetsPromise = timesheetsSnap.docs.map(d => deleteDoc(doc(db, 'timesheets', d.id)).catch(e => console.error(e)));
      await Promise.all([...tripsPromise, ...timesheetsPromise]);
      toast.success("Testing data cleared successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to clear some data. Check console.");
    }
  };

  return (
    <Layout title="Admin Control Center">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Management */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle>Reports & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleExportCSV} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Export 7-Day Travel Record
              </Button>
              <Button onClick={handleClearData} className="w-full bg-red-600 hover:bg-red-700 text-white" variant="destructive">
                Clear Testing Data
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Fleet Management</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddVehicle} className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Vehicle Type</label>
                  <select 
                    className="w-full mt-1 p-2 border border-[#1f2937] rounded bg-[#0a0f1c] text-slate-100"
                    value={newVehicle.type}
                    onChange={e => setNewVehicle({...newVehicle, type: e.target.value})}
                  >
                    <option value="car">Car</option>
                    <option value="cab">Cab</option>
                    <option value="wagon r">Wagon R</option>
                    <option value="van">Van</option>
                    <option value="bus">Bus</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Registration No.</label>
                  <input 
                    type="text" 
                    required
                    value={newVehicle.reg}
                    onChange={e => setNewVehicle({...newVehicle, reg: e.target.value})}
                    className="w-full mt-1 p-2 border border-[#1f2937] rounded bg-[#0a0f1c] text-slate-100"
                    placeholder="e.g. ABC-1234"
                  />
                </div>
                <Button type="submit" size="sm" className="w-full">Add Vehicle</Button>
              </form>

              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">Total Vehicles ({vehicles.length})</h4>
                <ul className="text-sm divide-y divide-zinc-100">
                  {vehicles.map(v => (
                    <li key={v.id} className="py-2 flex justify-between">
                      <span className="capitalize">{v.type} ({v.registrationNumber})</span>
                      <span className="text-slate-400 capitalize">{v.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-400">Role</label>
                    <select 
                      className="w-full mt-1 p-2 text-sm border border-[#1f2937] rounded bg-[#0a0f1c] text-slate-100"
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value})}
                    >
                      <option value="driver">Driver</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">PIN (6+ digits)</label>
                    <input 
                      type="text" 
                      required
                      minLength={6}
                      value={newUser.pin}
                      onChange={e => setNewUser({...newUser, pin: e.target.value})}
                      className="w-full mt-1 p-2 text-sm border border-[#1f2937] rounded bg-[#0a0f1c] text-slate-100"
                      placeholder="e.g. 123456"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-400">Name</label>
                    <input 
                      type="text" 
                      required
                      value={newUser.name}
                      onChange={e => setNewUser({...newUser, name: e.target.value})}
                      className="w-full mt-1 p-2 text-sm border border-[#1f2937] rounded bg-[#0a0f1c] text-slate-100"
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Department</label>
                    <input 
                      type="text" 
                      value={newUser.department}
                      onChange={e => setNewUser({...newUser, department: e.target.value})}
                      className="w-full mt-1 p-2 text-sm border border-[#1f2937] rounded bg-[#0a0f1c] text-slate-100"
                      placeholder="Department"
                    />
                  </div>
                </div>
                {newUser.role === 'driver' && (
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="hasSmartphone"
                      checked={newUser.hasSmartphone}
                      onChange={e => setNewUser({...newUser, hasSmartphone: e.target.checked})}
                      className="w-4 h-4 rounded border-[#1f2937] bg-[#0a0f1c] text-blue-600 focus:ring-blue-500 focus:ring-offset-[#0f172a]"
                    />
                    <label htmlFor="hasSmartphone" className="text-sm font-medium text-slate-300 cursor-pointer">
                      Driver Has Smartphone
                    </label>
                  </div>
                )}
                <Button type="submit" size="sm" className="w-full" disabled={isCreatingUser}>
                  {isCreatingUser ? 'Creating...' : 'Create Account'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Roles</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="text-sm divide-y divide-zinc-100 max-h-64 overflow-y-auto pr-2">
                  {allUsers.length === 0 && <li className="py-2 text-slate-400 text-xs">No users found.</li>}
                  {allUsers.filter(u => u.role !== 'admin').map(u => (
                    <li key={u.id} className="py-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-b border-[#1f2937] transition-all hover:bg-[#1e293b]/50 -mx-2 px-2 rounded-md">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-slate-700">{u.name || (u.role === 'driver' ? 'Driver' : 'User')}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-mono text-slate-500 bg-[#0f172a] border border-[#1f2937] px-1 py-0.5 rounded truncate max-w-[130px] sm:max-w-xs">{u.email}</span>
                          <span className="text-[10px] font-semibold text-[#4a90e2] bg-blue-900/20 px-1.5 py-0.5 rounded capitalize">{u.role}</span>
                        </div>
                      </div>
                      <div className="flex flex-row gap-1.5 pt-1.5 sm:pt-0 mt-1 sm:mt-0">
                        {u.role === 'user' ? (
                          <button className="text-[10px] bg-[#0a0f1c] border border-[#1f2937] text-slate-300 px-2.5 py-1 rounded shadow-sm hover:bg-[#1e293b] hover:text-slate-100 transition-colors font-medium cursor-pointer" onClick={() => handleSetRole(u.userId, 'driver')}>Make Driver</button>
                        ) : (
                          <button className="text-[10px] bg-[#0a0f1c] border border-[#1f2937] text-slate-300 px-2.5 py-1 rounded shadow-sm hover:bg-[#1e293b] hover:text-slate-100 transition-colors font-medium cursor-pointer" onClick={() => handleSetRole(u.userId, 'user')}>Make User</button>
                        )}
                        <button className="text-[10px] bg-red-900/20 border border-red-900/50 text-red-600 px-2.5 py-1 rounded shadow-sm hover:bg-red-900/40 transition-colors font-medium cursor-pointer" onClick={() => handleDeleteUser(u.userId)}>Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dispatch */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[#ff9900]/40">
            <CardHeader className="bg-[#ff9900]/10 rounded-t-lg border-b border-[#ff9900]/30 flex flex-col gap-3">
              <CardTitle className="text-[#ff9900] flex justify-between items-center">
                Pending Bookings
                <div className="flex gap-2 items-center">
                  <span className="bg-[#ff9900]/30 text-[#ff9900] text-xs px-2 py-1 rounded-full">{pendingTrips.length}</span>
                </div>
              </CardTitle>
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  variant={isCouplingMode ? "default" : "outline"} 
                  onClick={() => {
                    setIsCouplingMode(!isCouplingMode);
                    setCoupledTripIds([]);
                    setAllocatingTrip(null);
                  }}
                >
                  {isCouplingMode ? "Cancel Join Trips" : "Join Trips"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {pendingTrips.length === 0 ? (
                <div className="text-slate-400 text-center">No pending trips.</div>
              ) : (
                <div className="space-y-4">
                  {isCouplingMode && (
                    <div className="glass-card mb-4">
                      <h4 className="text-sm font-semibold mb-3 text-white">Allocate Coupled Trips ({coupledTripIds.length} selected)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                        <div>
                          {renderDriverSelect()}
                        </div>
                        <div>
                          {renderVehicleSelect()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAllocateCoupledTrips} disabled={coupledTripIds.length === 0 || !selectedDriver || !selectedVehicle}>Join & Dispatch</Button>
                      </div>
                    </div>
                  )}
                  {(() => {
                    const groups: { [key: string]: typeof pendingTrips } = {};
                    pendingTrips.forEach(trip => {
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
                            {groups[date].map(trip => (
                              <AdminPendingTripItem
                                key={trip.id}
                                trip={trip}
                                allUsers={allUsers}
                                isCouplingMode={isCouplingMode}
                                coupledTripIds={coupledTripIds}
                                setCoupledTripIds={setCoupledTripIds}
                                allocatingTrip={allocatingTrip}
                                setAllocatingTrip={setAllocatingTrip}
                                handleAllocate={handleAllocate}
                                handleAmendTrip={handleAmendTrip}
                                handleRejectTrip={handleRejectTrip}
                                renderDriverSelect={renderDriverSelect}
                                renderVehicleSelect={renderVehicleSelect}
                                selectedDriver={selectedDriver}
                                selectedVehicle={selectedVehicle}
                              />
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

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Active Trips
                <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-1 rounded-full">{activeTrips.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTrips.length === 0 ? (
                <div className="text-slate-400 text-center">No active trips.</div>
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
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{groups[date].length} Active Bookings</span>
                          </div>

                          <div className="space-y-4">
                            {groups[date].map(trip => (
                              <AdminActiveTripItem 
                                key={trip.id} 
                                trip={trip} 
                                drivers={drivers} 
                                handleForceCompleteTrip={handleForceCompleteTrip} 
                              />
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
