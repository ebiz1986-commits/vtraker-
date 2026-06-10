import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { toast } from 'sonner';

import { ChevronDown, ArrowRight, MapPin, Clock, Users, Edit, Check, X } from 'lucide-react';
import { TripItemSkeleton, LiveDriverItemSkeleton, Skeleton } from '../components/ui/Skeleton';

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
  selectedVehicle,
  setWipeModal,
  setAmendTripId,
  setAmendTimeVal,
  index = 0
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;

  useEffect(() => {
    if (allocatingTrip === trip.id) setExpanded(true);
  }, [allocatingTrip, trip.id]);

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
      className={`glass-card ${isCouplingMode && coupledTripIds.includes(trip.id) ? 'border-orange-500/50 bg-orange-500/20 shadow-[0_0_15px_rgba(255,140,0,0.3)]' : ''} mb-4 overflow-hidden`}
    >
      <div 
        className="p-4 sm:p-5 flex flex-col gap-3 transition-colors hover:bg-slate-800/30 group cursor-pointer"
        onClick={() => {
           if (isCouplingMode) {
             if (coupledTripIds.includes(trip.id)) setCoupledTripIds(coupledTripIds.filter((id: string) => id !== trip.id));
             else setCoupledTripIds([...coupledTripIds, trip.id]);
           } else {
             setExpanded(!expanded);
           }
        }}
      >
        <div className="flex items-start justify-between w-full gap-4">
          <div className="flex items-start gap-3 min-w-0">
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
            
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium uppercase tracking-wider border flex items-center gap-2 max-w-fit bg-yellow-900/30 text-yellow-500 border-yellow-900/50`}>
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
              {trip.nominatedName && (
                <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-400/20 flex items-center gap-1.5 animate-pulse">
                  <Users className="w-3.5 h-3.5 text-amber-500" />
                  Nominee trip: {trip.nominatedName}
                </span>
              )}
              <span className="text-[10px] font-bold text-slate-300 bg-[#1e293b] px-2 py-0.5 rounded uppercase tracking-wider">
                {(!trip.tripType || trip.tripType === 'dropoff') ? 'Drop down trip' : trip.tripType === 'return' ? 'Round trip' : trip.tripType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-right flex-shrink-0">
            <div className="flex flex-col items-end justify-center">
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider hidden sm:flex">
                <Clock className="w-3 h-3" /> Req. Time
              </p>
              <p className="font-bold text-slate-100 text-sm sm:text-base leading-none">{trip.requestedStartTime || 'N/A'}</p>
            </div>
            <div className={`p-1.5 rounded-full bg-slate-800 text-slate-400 transition-colors group-hover:text-slate-200 group-hover:bg-slate-700`}>
              <ChevronDown className={`w-5 h-5 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pl-0 sm:pl-8">
           <div>
             <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
               USER: <span className="text-blue-300 font-bold ml-1">{allUsers.find((u: any) => (u.userId || u.id) === trip.userId)?.name || trip.passengerName || 'Unknown User'}</span>
             </span>
           </div>
           
           <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-slate-200 font-medium text-sm leading-snug break-words">
                {trip.pickupAddress}
              </span>
              
              <div className="hidden sm:flex text-slate-500 items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
              </div>
              
              <div className="flex items-start sm:items-center text-slate-200 font-medium text-sm leading-snug break-words">
                <span className="sm:hidden text-slate-500 text-[10px] font-bold mr-1.5 mt-0.5 uppercase tracking-wider">TO</span>
                <span>{destination}</span>
              </div>
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

            {/* Odometer Process Setting */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl hover:bg-slate-900/80 transition-colors mb-4 max-w-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${trip.normal !== false ? 'bg-orange-500 animate-pulse' : 'bg-slate-500'}`}></span>
                  <p className="text-sm font-semibold text-slate-100">Normal Flow</p>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">Driver logs start/end ODO directly (removes passenger steps)</p>
              </div>
              <div className="relative flex items-center pr-1.5">
                <input 
                  type="checkbox"
                  id={`normal-flow-checkbox-${trip.id}`}
                  checked={trip.normal !== false}
                  onChange={async (e) => {
                    try {
                      const checked = e.target.checked;
                      await updateDoc(doc(db, 'trips', trip.id), {
                        normal: checked,
                        updatedAt: serverTimestamp()
                      });
                      toast.success(`Normal flow ${checked ? 'enabled' : 'disabled'} for this specific booking!`);
                    } catch (err) {
                      toast.error("Failed to update booking mode.");
                    }
                  }}
                  className="w-4 h-4 rounded accent-orange-600 bg-slate-950 border-slate-705 cursor-pointer"
                />
              </div>
            </div>

            {!isCouplingMode && allocatingTrip === trip.id ? (
              <div className="bg-blue-900/10 p-4 border border-blue-900/40 rounded-lg mt-2 shadow-lg mb-2">
                 <h4 className="text-sm font-semibold mb-4 text-blue-300 uppercase tracking-widest flex items-center gap-2">Allocate Trip</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                   <div>{renderDriverSelect()}</div>
                   <div>{renderVehicleSelect()}</div>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3">
                   <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-auto py-3 px-4 text-white font-semibold text-sm w-full whitespace-normal" onClick={() => handleAllocate(trip.id)} disabled={!selectedDriver || !selectedVehicle}>Confirm Dispatch</Button>
                   <Button variant="outline" className="h-auto py-3 px-4 sm:w-1/3 text-sm whitespace-normal" onClick={() => setAllocatingTrip(null)}>Cancel</Button>
                 </div>
              </div>
            ) : !isCouplingMode && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                 <Button onClick={() => { setAllocatingTrip(trip.id); setExpanded(true); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold">Allocate Driver</Button>
                 <Button onClick={() => {
                    setAmendTripId(trip.id);
                    setAmendTimeVal(trip.requestedStartTime || "08:00");
                    setWipeModal('amend');

                 }} variant="outline" className="flex-1">Amend Time</Button>
                 <Button onClick={() => handleRejectTrip(trip.id)} variant="destructive" className="flex-1">Reject Trip</Button>
              </div>
            )}
         </div>
      </div>
    </motion.div>
  );
};

const AdminActiveTripItem = ({ trip, drivers, handleForceCompleteTrip, handleCancelTrip, allUsers, index = 0, vehicles = [] }: any) => {
  const [expanded, setExpanded] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
  const driver = drivers.find((d: any) => (d.userId || d.id) === trip.driverId);
  const passengerUser = allUsers?.find((u: any) => (u.userId || u.id) === trip.userId);

  // States for hot-swapping and odometer bypass inside the card
  const [midDriverId, setMidDriverId] = useState(trip.driverId || '');
  const [midStartOdo, setMidStartOdo] = useState(trip.startOdometer !== undefined ? String(trip.startOdometer) : '');
  const [midEndOdo, setMidEndOdo] = useState(trip.endOdometer !== undefined ? String(trip.endOdometer) : '');

  // Keep internal inputs in sync if the database updates externally
  useEffect(() => {
    if (trip.driverId) setMidDriverId(trip.driverId);
    if (trip.startOdometer !== undefined) setMidStartOdo(String(trip.startOdometer));
    if (trip.endOdometer !== undefined) setMidEndOdo(String(trip.endOdometer));
  }, [trip.driverId, trip.startOdometer, trip.endOdometer]);

  const handleDriverMidSwap = async () => {
    if (!midDriverId) {
      toast.error("Please pick a driver to swap to.");
      return;
    }
    try {
      const newD = drivers.find((d: any) => (d.userId || d.id) === midDriverId);
      if (!newD) {
        toast.error("Selected driver not registered.");
        return;
      }

      await updateDoc(doc(db, 'trips', trip.id), {
        driverId: midDriverId,
        driverName: newD.name || 'Unknown Driver',
        driverPhone: newD.phone || '',
        driverHasSmartphone: newD.hasSmartphone !== false,
        updatedAt: serverTimestamp()
      });
      toast.success(`Successfully reassigned driver to ${newD.name} inside active journey!`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `trips/${trip.id}`);
    }
  };

  const handleBypassOdometer = async () => {
    try {
      const payload: any = {
        updatedAt: serverTimestamp(),
        status: 'completed',
        dropoffTime: Date.now(),
        forceCompleted: true
      };

      const startNum = midStartOdo !== '' ? Number(midStartOdo) : undefined;
      const endNum = midEndOdo !== '' ? Number(midEndOdo) : undefined;

      if (startNum !== undefined && isNaN(startNum)) {
        toast.error("Please insert a numeric start odometer.");
        return;
      }
      if (endNum !== undefined && isNaN(endNum)) {
        toast.error("Please insert a numeric end odometer.");
        return;
      }

      // Determine final start odometer
      let finalStart = 0;
      if (startNum !== undefined) {
        finalStart = startNum;
      } else if (trip.startOdometer !== undefined) {
        finalStart = Number(trip.startOdometer);
      } else if (trip.currentOdometer !== undefined) {
        finalStart = Number(trip.currentOdometer);
      }

      payload.startOdometer = finalStart;
      payload.currentOdometer = finalStart;

      // Determine final end odometer
      let finalEnd = 0;
      if (endNum !== undefined) {
        finalEnd = endNum;
      } else if (trip.endOdometer !== undefined) {
        finalEnd = Number(trip.endOdometer);
      } else {
        const expDistance = Number(trip.expectedDistance) || 15;
        finalEnd = finalStart + expDistance;
      }

      payload.endOdometer = finalEnd;
      payload.expectedEndOdometer = finalEnd;

      await updateDoc(doc(db, 'trips', trip.id), payload);
      toast.success("Odometer bypass applied! Trip forced to completion and removed from Active Trips.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `trips/${trip.id}`);
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
      className="glass-card mb-4 overflow-hidden border border-white/5 bg-[#0d1425]/60 hover:bg-[#111a31]/75 transition-all duration-300"
    >
      <div 
        className="p-4 sm:p-5 flex flex-col gap-3 transition-colors hover:bg-slate-800/30 group cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between w-full gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium uppercase tracking-wider border flex items-center gap-2 max-w-fit
                ${trip.status === 'allocated' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' : 
                  trip.status === 'in_progress' ? 'bg-purple-900/30 text-purple-400 border-purple-900/50' : 'bg-amber-900/30 text-amber-500 border-amber-900/50'}`}>
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
              {trip.nominatedName && (
                <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-400/20 flex items-center gap-1.5 animate-pulse">
                  <Users className="w-3.5 h-3.5 text-amber-500" />
                  Nominee trip: {trip.nominatedName}
                </span>
              )}
              <span className="text-[10px] font-bold text-slate-300 bg-[#1e293b] px-2 py-0.5 rounded uppercase tracking-wider">
                {(!trip.tripType || trip.tripType === 'dropoff') ? 'Drop down trip' : trip.tripType === 'return' ? 'Round trip' : trip.tripType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-right flex-shrink-0">
            <div className="flex flex-col items-end justify-center">
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider hidden sm:flex">
                <Clock className="w-3 h-3" /> Req. Time
              </p>
              <p className="font-bold text-slate-100 text-sm sm:text-base leading-none">{trip.requestedStartTime || 'N/A'}</p>
            </div>
            {trip.status === 'allocated' && (
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelTrip(trip.id);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] h-8 px-3 rounded shadow-md shrink-0 font-sans cursor-pointer"
              >
                Cancel Booking
              </Button>
            )}
            <div className={`p-1.5 rounded-full bg-slate-800 text-slate-400 transition-colors group-hover:text-slate-200 group-hover:bg-slate-700`}>
              <ChevronDown className={`w-5 h-5 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
           <div className="flex flex-col sm:flex-row gap-y-1 gap-x-4">
             <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
               USER: <span className="text-blue-300 font-bold ml-1">{passengerUser?.name || trip.passengerName || 'Unknown User'}</span>
             </span>
             <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
               DRIVER: <span className="text-emerald-300 font-bold ml-1">{driver?.name || trip.driverName || 'Unknown Driver'}</span>
             </span>
           </div>
           
           <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-slate-200 font-medium text-sm leading-snug break-words">
                {trip.pickupAddress}
              </span>
              
              <div className="hidden sm:flex text-slate-500 items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
              </div>
              
              <div className="flex items-start sm:items-center text-slate-200 font-medium text-sm leading-snug break-words">
                <span className="sm:hidden text-slate-500 text-[10px] font-bold mr-1.5 mt-0.5 uppercase tracking-wider">TO</span>
                <span>{destination}</span>
              </div>
           </div>
        </div>
      </div>

      <div className={`transition-all duration-300 ease-in-out origin-top ${expanded ? 'max-h-[1500px] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0'}`}>
         <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/50">
            {/* Detailed Allocations Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4 mb-4">
              
              {/* Box 1: Trip & Passenger Details */}
              <div className="bg-[#0f172a] border border-[#1e293b] p-3.5 rounded-lg shadow-inner">
                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1 font-sans">
                  👤 Passenger Details
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300 font-sans">
                  <p><span className="text-slate-500 font-medium">Name:</span> <span className="text-slate-100 font-semibold">{trip.passengerName || passengerUser?.name || 'N/A'}</span></p>
                  <p><span className="text-slate-500 font-medium">Department:</span> <span className="text-slate-100">{trip.passengerDepartment || passengerUser?.department || 'N/A'}</span></p>
                  <p><span className="text-slate-500 font-medium font-sans">Contact:</span> <span className="text-blue-300 font-mono select-all font-semibold">{passengerUser?.phone || 'N/A'}</span></p>
                  {trip.passengerCount && <p><span className="text-slate-500 font-medium font-sans font-sans">Group Size:</span> <span className="text-slate-100">{trip.passengerCount} pax</span></p>}
                </div>
              </div>

              {/* Box 2: Driver & Vehicle Allocation */}
              <div className="bg-[#0f172a] border border-[#1e293b] p-3.5 rounded-lg shadow-inner font-sans">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1 font-sans">
                  🚗 Driver & Vehicle Detail
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300 font-sans">
                  <p><span className="text-slate-500 font-medium">Driver:</span> <span className="text-slate-100 font-semibold">{driver?.name || trip.driverName || 'N/A'}</span></p>
                  <p><span className="text-slate-500 font-medium font-sans">Driver Phone:</span> <span className="text-emerald-300 font-mono select-all font-semibold font-sans">{driver?.phone || trip.driverPhone || 'N/A'}</span></p>
                  <p><span className="text-slate-500 font-medium font-sans">Vehicle info:</span> <span className="text-amber-300 font-semibold">{trip.vehicleName || 'N/A'}</span></p>
                  {trip.vehicleId && (
                    <p>
                      <span className="text-slate-500 font-medium font-sans">Vehicle plate number:</span>{' '}
                      <span className="text-slate-400 font-mono font-semibold">
                        {vehicles.find(v => v.id === trip.vehicleId)?.registrationNumber || trip.vehicleId}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Box 3: Journey & Routing */}
              <div className="bg-[#0f172a] border border-[#1e293b] p-3.5 rounded-lg shadow-inner font-sans font-sans">
                <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-1 font-sans font-sans">
                  📍 Journey Route
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300 font-sans">
                  <p className="line-clamp-2"><span className="text-slate-500 font-medium">From:</span> <span className="text-slate-200">{trip.pickupAddress}</span></p>
                  <p className="line-clamp-2"><span className="text-slate-500 font-medium">To:</span> <span className="text-slate-200">{destination}</span></p>
                  <p><span className="text-slate-500 font-medium font-sans font-sans">Requested:</span> <span className="text-slate-200">{trip.requestedDate} @ {trip.requestedStartTime}</span></p>
                  <p className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium font-sans font-sans font-sans">Odometer:</span>
                    <span className="text-slate-200 font-mono font-semibold">
                      {trip.startOdometer !== undefined ? `${trip.startOdometer} km` : 'N/A'} &rarr; {trip.endOdometer !== undefined ? `${trip.endOdometer} km` : 'N/A'}
                    </span>
                  </p>
                </div>
              </div>

            </div>


            {/* Admin Override & hot-swap control strip */}
            <div className="border border-[#1e293b] bg-[#0c1424] p-4 rounded-lg mt-2 mb-4 space-y-4 shadow-md font-sans">
              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <span className="p-1 rounded bg-[#ff9900]/10 text-[#ff9900]">🔧</span>
                Admin Authority Panel
              </h4>

              {/* Odometer Process Setting */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl hover:bg-slate-900/80 transition-colors font-sans">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${trip.normal !== false ? 'bg-orange-500 animate-pulse' : 'bg-slate-500'}`}></span>
                    <p className="text-sm font-semibold text-slate-100">Normal Flow</p>
                  </div>
                  <p className="text-[11px] text-slate-400">Driver logs start/end ODO directly (removes passenger steps)</p>
                </div>
                <div className="relative flex items-center pr-1.5">
                  <input 
                    type="checkbox"
                    id={`normal-flow-action-checkbox-${trip.id}`}
                    checked={trip.normal !== false}
                    onChange={async (e) => {
                      try {
                        const checked = e.target.checked;
                        await updateDoc(doc(db, 'trips', trip.id), {
                          normal: checked,
                          updatedAt: serverTimestamp()
                        });
                        toast.success(`Normal flow ${checked ? 'enabled' : 'disabled'} for this active booking!`);
                      } catch (err) {
                        toast.error("Failed to update booking mode.");
                      }
                    }}
                    className="w-4 h-4 rounded accent-orange-600 bg-slate-950 border-slate-705 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Hot driver selection swap */}
                <div className="space-y-2 bg-[#090e1a]/85 p-3 rounded-lg border border-white/5 font-sans">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Change Driver (Mid-Journey / On the go)
                  </span>
                  <div className="flex gap-2">
                    <select
                      value={midDriverId}
                      onChange={(e) => setMidDriverId(e.target.value)}
                      className="flex-1 bg-[#16213e] border border-[#2c3e66] text-white rounded px-2 text-xs py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    >
                      <option value="">Select driver ...</option>
                      {drivers.map((d: any) => (
                        <option key={d.userId || d.id} value={d.userId || d.id} className="font-sans">
                          {d.name} {d.phone ? `(${d.phone})` : ''}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={handleDriverMidSwap}
                      disabled={!midDriverId || midDriverId === trip.driverId}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold font-mono px-3 py-1.5 h-auto rounded transition-colors font-sans"
                    >
                      Swap
                    </Button>
                  </div>
                </div>

                {/* Bypass odometer input fields */}
                <div className="space-y-2 bg-[#090e1a]/85 p-3 rounded-lg border border-white/5 font-sans">
                  <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider block">
                    Bypass Passenger Odometer Input & Force Halt
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 font-sans font-medium text-slate-200 font-sans">
                      <div className="flex-1">
                        <span className="text-[8px] text-slate-500 font-bold block mb-1">START METER (KM)</span>
                        <input
                          type="number"
                          value={midStartOdo}
                          onChange={(e) => setMidStartOdo(e.target.value)}
                          className="w-full bg-[#16213e] border border-[#2c3e66] text-white rounded px-2 py-1 text-xs font-mono"
                          placeholder="Wait-on-User"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[8px] text-slate-500 font-bold block mb-1 font-sans font-sans">END METER (KM)</span>
                        <input
                          type="number"
                          value={midEndOdo}
                          onChange={(e) => setMidEndOdo(e.target.value)}
                          className="w-full bg-[#16213e] border border-[#2c3e66] text-white rounded px-2 py-1 text-xs font-mono"
                          placeholder="Wait-on-User"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleBypassOdometer}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-1.5 h-auto rounded transition-colors font-sans"
                    >
                      Bypass User & Save Details
                    </Button>
                  </div>
                </div>

              </div>
            </div>

            {/* For allocated (unstarted) trips, show cancellation option */}
            {trip.status === 'allocated' && (
              <div className="border border-red-900/30 bg-red-950/10 p-4 rounded-lg mt-2 mb-4 space-y-2.5 shadow-md">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <span>⚠️</span>
                  Cancel Unstarted Allocation
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-[11.5px] text-slate-400 max-w-xl font-sans font-medium">
                    This trip is allocated but the journey has not started yet. You can cancel this booking allocation to release the driver and vehicle.
                  </p>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => handleCancelTrip(trip.id)}
                    className="w-full sm:w-auto shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    Cancel Booking
                  </Button>
                </div>
              </div>
            )}

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
    </motion.div>
  );
};

const AdminCompletedTripItem = ({ trip, drivers, allUsers, index = 0, vehicles = [] }: any) => {
  const [expanded, setExpanded] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
  const driver = drivers.find((d: any) => (d.userId || d.id) === trip.driverId);
  const passenger = allUsers?.find((u: any) => (u.userId || u.id) === trip.userId);

  // A visually appealing trip ID based on original document ID
  const displayId = `SO-${new Date().getFullYear()}-${trip.id.substring(0, 4).toUpperCase()}`;

  const formatTime = (timeMs: any) => {
    if (!timeMs) return 'N/A';
    try {
      return new Date(timeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 0.9, y: 0 }}
      whileHover={{ opacity: 1, scale: 1.005 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: Math.min(index * 0.04, 0.2)
      }}
      className="border border-white/5 bg-[#0f172a]/40 rounded-xl overflow-hidden transition-all duration-300 hover:border-slate-800/85 mb-3 shadow-[0_4px_35px_rgba(0,0,0,0.15)]"
    >
      <div 
        className="p-4 flex flex-col gap-3 transition-colors hover:bg-slate-800/10 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between w-full gap-4">
          <div className="flex items-start gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium uppercase tracking-wider border flex items-center gap-1.5
              ${trip.status === 'completed' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-950/45' : 'bg-red-950/20 text-red-400 border-red-900/30'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${trip.status === 'completed' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {trip.status}
            </span>
            {trip.forceCompleted && (
              <span className="bg-amber-900/20 text-[#ff9900]/80 text-[10px] px-2 py-0.5 rounded border border-amber-900/30 font-medium uppercase tracking-wider">
                Force Finished
              </span>
            )}
            <span className="text-[10px] font-mono text-slate-500 bg-[#1e293b]/50 px-1.5 py-0.5 rounded uppercase">
              {displayId}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/40 px-1.5 py-0.5 rounded capitalize">
              {(!trip.tripType || trip.tripType === 'dropoff') ? 'Drop down trip' : trip.tripType === 'return' ? 'Round trip' : trip.tripType}
            </span>
            {trip.nominatedName && (
              <span className="bg-amber-950/20 text-amber-400 text-[10px] px-2 py-0.5 rounded border border-amber-900/30 font-medium uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-500" />
                Nominee trip: {trip.nominatedName}
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded border font-medium uppercase tracking-wider
              ${trip.normal !== false ? 'bg-orange-950/20 text-orange-400 border-orange-900/30' : 'bg-slate-800/40 text-slate-400 border-slate-700/50'}`}>
              {trip.normal !== false ? 'Normal Mode' : 'Passenger ODO Mode'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-right">
            <div className="flex flex-col items-end">
              <p className="font-bold text-slate-300 text-xs">{trip.requestedStartTime || 'N/A'}</p>
            </div>
            <div className="p-1 rounded bg-[#1e293b]/20 text-slate-500 hover:text-slate-200">
              <ChevronDown className={`w-3.5 h-3.5 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-slate-300 text-xs font-semibold">
            <span>UP: <span className="text-blue-300">{passenger?.name || trip.passengerName || 'Unknown User'}</span></span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span>DR: <span className="text-emerald-300">{driver?.name || trip.driverName || 'Unknown Driver'}</span></span>
          </div>
          
          <p className="text-xs text-slate-400 truncate max-w-xl">
            {trip.pickupAddress} &rarr; {destination}
          </p>
        </div>
      </div>

      <div className={`transition-all duration-300 ease-in-out ${expanded ? 'max-h-[800px] opacity-100 scale-y-100 border-t border-slate-800/30' : 'max-h-0 opacity-0 scale-y-0'}`}>
        <div className="p-4 bg-[#0a0f1c]/30 text-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Passenger Details</p>
              <p className="font-medium text-slate-300 mt-0.5">{passenger?.name || trip.passengerName || 'Unknown User'} ({passenger?.department || trip.passengerDepartment || 'N/A'})</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Driver & Vehicle</p>
              <p className="font-medium text-slate-300 mt-0.5">
                {driver?.name || trip.driverName || 'Unknown Driver'}{' '}
                {trip.vehicleId ? `[Vehicle: ${vehicles.find(v => v.id === trip.vehicleId)?.registrationNumber || trip.vehicleId}]` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-slate-800/50">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Distance Odometer</p>
              <p className="font-semibold text-slate-300 mt-0.5">
                Start: <span className="font-mono text-emerald-400">{trip.startOdometer !== undefined ? `${trip.startOdometer} km` : 'N/A'}</span>
              </p>
              <p className="font-semibold text-slate-300">
                End: <span className="font-mono text-emerald-400">{trip.endOdometer !== undefined ? `${trip.endOdometer} km` : 'N/A'}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Timestamps</p>
              <p className="text-slate-400 mt-0.5">Requested Date: <span className="text-slate-200">{trip.requestedDate || 'TBD'}</span></p>
              {trip.dropoffTime && (
                <p className="text-slate-400">Completed At: <span className="text-slate-200">{formatTime(trip.dropoffTime)}</span></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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

  // Interactive UI Modal State (IFrame-proof alerts & prompts)
  const [wipeModal, setWipeModal] = useState<'none' | 'operations' | 'everything' | 'amend'>('none');
  const [amendTripId, setAmendTripId] = useState<string | null>(null);
  const [amendTimeVal, setAmendTimeVal] = useState('');
  
  // Filtering and sorting state for allocation
  const [driverFilter, setDriverFilter] = useState('all'); // all, available, busy
  const [vehicleFilter, setVehicleFilter] = useState('all'); // all, available, busy
  const [completedTripsRange, setCompletedTripsRange] = useState<'today' | '7days' | '30days' | 'all'>('30days');
  
  // New Vehicle state
  const [newVehicle, setNewVehicle] = useState({ type: 'car', reg: '' });
  
  // New User state
  const [newUser, setNewUser] = useState({ name: '', role: 'driver', pin: '', department: '', hasSmartphone: true });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [tick, setTick] = useState(0);

  // States for inline editing of user names
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');

  // Normal flow config state
  const [isNormalFlow, setIsNormalFlow] = useState<boolean>(true);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        setIsNormalFlow(snap.data().normal !== false);
      } else {
        setIsNormalFlow(true);
      }
    }, (err) => {
      console.error("Failed to load settings:", err);
    });
    return unsubSettings;
  }, []);

  const handleToggleNormalFlow = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const checked = e.target.checked;
      await setDoc(doc(db, 'settings', 'system'), { normal: checked }, { merge: true });
      toast.success(`Normal flow ${checked ? 'enabled' : 'disabled'}!`);
    } catch (error) {
      console.error("Error toggling system flow:", error);
      toast.error("Failed to update system setting.");
    }
  };

  // Date folding state for records more than 1 day old
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const isMoreThan1DayOld = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unspecified Date') return false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      const differenceInTime = today.getTime() - date.getTime();
      const differenceInDays = differenceInTime / (1000 * 3600 * 24);
      return differenceInDays > 1;
    } catch (e) {
      return false;
    }
  };

  const handleToggleDate = (key: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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
      toast.success('Trip assigned to driver');
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

  const handleCancelTrip = async (tripId: string) => {
    if (!window.confirm("Are you sure you want to cancel this allocated trip? This will free up the associated driver and vehicle.")) return;
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
      toast.success("Trip allocation cancelled successfully");
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

  const handleUpdateUserName = async (userId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        name: newName.trim()
      });
      setEditingUserId(null);
      toast.success("User display name updated successfully!");
    } catch (error) {
      console.error("Failed to update user's name:", error);
      toast.error("Failed to update user's name");
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
      
      const userData: any = {
        userId: newUid,
        email: generatedEmail,
        name: newUser.name,
        role: newUser.role,
        department: newUser.department,
        createdAt: serverTimestamp()
      };
      if (newUser.role === 'driver') {
        userData.hasSmartphone = newUser.hasSmartphone;
      }
      
      await setDoc(doc(db, 'users', newUid), userData);
      
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

  const handleExportCSV = (days: number = 30) => {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentTrips = trips.filter(t => {
      const tripTime = t.createdAt?.toMillis?.() || (t.requestedDate ? new Date(t.requestedDate).getTime() : Date.now());
      return (Date.now() - tripTime) <= days * 24 * 60 * 60 * 1000;
    });
    
    if (recentTrips.length === 0) {
      alert(`No trips found in the last ${days} days.`);
      return;
    }

    const headers = [
      'Trip ID', 'Status', 'Date', 'Requested Date', 'Type', 'User Name', 'User Email', 'Driver Name', 
      'Vehicle ID', 'Pickup Address', 'Dropoff Address', 'Return Locations', 'Requested Start', 
      'Passengers', 'Remarks', 'Start ODO', 'End ODO', 'KM Traveled'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    recentTrips.forEach(trip => {
      const user = allUsers.find(u => (u.userId || u.id) === trip.userId) || {};
      const driver = allUsers.find(d => (d.userId || d.id) === trip.driverId) || {};
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
        `"${(!trip.tripType || trip.tripType === 'dropoff') ? 'Drop down trip' : trip.tripType === 'return' ? 'Round trip' : trip.tripType}"`,
        `"${user.name || trip.passengerName || ''}"`,
        `"${user.email || ''}"`,
        `"${driver.name || trip.driverName || ''}"`,
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
    link.setAttribute('download', `Trips_${days}_Days_${new Date().toISOString().slice(0, 10)}.csv`);
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
  const completedTrips = trips.filter(t => {
    if (t.status !== 'completed' && t.status !== 'cancelled') return false;
    if (completedTripsRange === 'all') return true;

    const tripTime = t.createdAt?.toMillis?.() || (t.requestedDate ? new Date(t.requestedDate).getTime() : Date.now());
    const now = Date.now();

    if (completedTripsRange === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return t.requestedDate === todayStr;
    }
    if (completedTripsRange === '7days') {
      return (now - tripTime) <= 7 * 24 * 60 * 60 * 1000;
    }
    if (completedTripsRange === '30days') {
      return (now - tripTime) <= 30 * 24 * 60 * 60 * 1000;
    }
    return true;
  });

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
      <div className="flex flex-wrap justify-between items-center gap-2">
        <label className="text-xs font-medium text-slate-400">Select Driver</label>
        <div className="flex gap-1 text-[10px]">
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${driverFilter === 'all' ? 'bg-[#ff9900] text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setDriverFilter('all')}>All</button>
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${driverFilter === 'available' ? 'bg-emerald-600 text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setDriverFilter('available')}>Available</button>
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${driverFilter === 'busy' ? 'bg-orange-600 text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setDriverFilter('busy')}>Busy</button>
        </div>
      </div>
      <select 
        className="input-field py-2 px-3 w-full"
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
      <div className="flex flex-wrap justify-between items-center gap-2">
        <label className="text-xs font-medium text-slate-400">Select Vehicle</label>
        <div className="flex gap-1 text-[10px]">
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${vehicleFilter === 'all' ? 'bg-[#ff9900] text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setVehicleFilter('all')}>All</button>
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${vehicleFilter === 'available' ? 'bg-emerald-600 text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setVehicleFilter('available')}>Available</button>
          <button type="button" className={`px-2 py-0.5 rounded transition-colors ${vehicleFilter === 'busy' ? 'bg-orange-600 text-white' : 'bg-[#1e293b] hover:bg-[#1f2937]'}`} onClick={() => setVehicleFilter('busy')}>Busy</button>
        </div>
      </div>
      <select 
        className="input-field py-2 px-3 w-full"
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

  const handleClearData = () => {
    setWipeModal('operations');
  };

  const handleFullWipe = () => {
    setWipeModal('everything');
  };

  const executeClearData = async () => {
    try {
      toast.info("Clearing operations data...");
      const tripsPromise = trips.map(t => deleteDoc(doc(db, 'trips', t.id)).catch(e => console.error("Error deleting trip", e)));
      const timesheetsSnap = await getDocs(collection(db, 'timesheets')).catch(e => { console.log(e); return {docs: []}; });
      const timesheetsPromise = timesheetsSnap.docs.map(d => deleteDoc(doc(db, 'timesheets', d.id)).catch(e => console.error(e)));
      await Promise.all([...tripsPromise, ...timesheetsPromise]);
      setWipeModal('none');
      toast.success("Operations test data cleared successfully. System ready!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to clear operations data.");
    }
  };

  const executeFullWipe = async () => {
    try {
      toast.info("Performing total wipe...");
      const tripsPromise = trips.map(t => deleteDoc(doc(db, 'trips', t.id)));
      const timesheetsSnap = await getDocs(collection(db, 'timesheets'));
      const timesheetsPromise = timesheetsSnap.docs.map(d => deleteDoc(doc(db, 'timesheets', d.id)));
      const vehiclesPromise = vehicles.map(v => deleteDoc(doc(db, 'vehicles', v.id)));
      await Promise.all([...tripsPromise, ...timesheetsPromise, ...vehiclesPromise]);
      setWipeModal('none');
      toast.success("Total system wipe complete. All test data successfully cleaned!");
    } catch (error) {
      console.error(error);
      toast.error("Error during full wipe.");
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
            <CardContent className="space-y-4">
              <Button onClick={() => handleExportCSV(7)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-1">
                Export 7-Day Travel Record (CSV)
              </Button>
              <Button onClick={() => handleExportCSV(30)} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                Export 30-Day Travel Record (CSV)
              </Button>
              <Button onClick={handleClearData} className="w-full bg-orange-600 hover:bg-orange-700 text-white" variant="destructive">
                Reset Operations Data
              </Button>
              <Button onClick={handleFullWipe} className="w-full bg-red-600 hover:bg-red-700 text-white" variant="destructive">
                WIPE EVERYTHING (Go Live)
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
                    <li key={v.id} className="py-2 flex justify-between items-center group">
                      <span className="capitalize">{v.type} ({v.registrationNumber})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 capitalize">{v.status}</span>
                        <button 
                          type="button"
                          onClick={async () => {
                            if(window.confirm(`Are you sure you want to delete ${v.registrationNumber}?`)) {
                              try {
                                await deleteDoc(doc(db, 'vehicles', v.id));
                                toast.success("Vehicle deleted");
                              } catch(error) {
                                handleFirestoreError(error, OperationType.DELETE, `vehicles/${v.id}`);
                              }
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded bg-red-500/10 transition-opacity"
                        >
                          Delete
                        </button>
                      </div>
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
                  {loading ? (
                    <div className="space-y-2 py-1">
                      <LiveDriverItemSkeleton />
                      <LiveDriverItemSkeleton />
                      <LiveDriverItemSkeleton />
                    </div>
                  ) : allUsers.length === 0 ? (
                    <li className="py-2 text-slate-400 text-xs">No users found.</li>
                  ) : (
                    allUsers.filter(u => u.role !== 'admin').map(u => (
                      <li key={u.id} className="py-2.5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-[#1f2937] transition-all hover:bg-[#1e293b]/50 -mx-2 px-2 rounded-md">
                        <div className="flex-1 min-w-0">
                          {editingUserId === u.userId ? (
                            <div className="flex items-center gap-2 mt-1 max-w-xs">
                              <input 
                                type="text"
                                value={editingUserName}
                                onChange={(e) => setEditingUserName(e.target.value)}
                                className="px-2 py-1 text-xs border border-slate-700 bg-slate-950 text-slate-100 rounded w-full focus:outline-none focus:border-blue-500 font-medium"
                                placeholder="Edit Name"
                                autoFocus
                              />
                              <button 
                                className="p-1 text-emerald-400 hover:bg-white/5 rounded shrink-0"
                                onClick={() => handleUpdateUserName(u.userId, editingUserName)}
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                className="p-1 text-red-400 hover:bg-white/5 rounded shrink-0"
                                onClick={() => setEditingUserId(null)}
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-slate-100">{u.name || (u.role === 'driver' ? 'Driver' : 'User')}</span>
                              <button 
                                onClick={() => {
                                  setEditingUserId(u.userId);
                                  setEditingUserName(u.name || '');
                                }}
                                className="text-slate-400 hover:text-slate-200 p-0.5 shrink-0 transition-colors"
                                title="Edit Name"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono text-slate-500 bg-[#0f172a] border border-[#1f2937] px-1.5 py-0.5 rounded break-all leading-tight">{u.email}</span>
                            <span className="text-[10px] font-semibold text-[#4a90e2] bg-blue-900/20 px-1.5 py-0.5 rounded capitalize w-fit">{u.role}</span>
                          </div>
                        </div>
                        <div className="flex flex-row gap-1.5 pt-1.5 sm:pt-0 mt-1 sm:mt-0 shrink-0">
                          {u.role === 'user' ? (
                            <button className="text-[10px] bg-[#0a0f1c] border border-[#1f2937] text-slate-300 px-2.5 py-1 rounded shadow-sm hover:bg-[#1e293b] hover:text-slate-100 transition-colors font-medium cursor-pointer" onClick={() => handleSetRole(u.userId, 'driver')}>Make Driver</button>
                          ) : (
                            <button className="text-[10px] bg-[#0a0f1c] border border-[#1f2937] text-slate-300 px-2.5 py-1 rounded shadow-sm hover:bg-[#1e293b] hover:text-slate-100 transition-colors font-medium cursor-pointer" onClick={() => handleSetRole(u.userId, 'user')}>Make User</button>
                          )}
                          <button className="text-[10px] bg-red-900/20 border border-red-900/50 text-red-600 px-2.5 py-1 rounded shadow-sm hover:bg-red-900/40 transition-colors font-medium cursor-pointer" onClick={() => handleDeleteUser(u.userId)}>Remove</button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dispatch */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-sky-500/20 bg-sky-950/5">
            <CardHeader className="bg-sky-500/10 rounded-t-lg border-b border-sky-500/20 flex flex-col gap-3">
              <CardTitle className="text-sky-300 flex justify-between items-center font-bold tracking-wide">
                Pending Bookings
                <div className="flex gap-2 items-center">
                  <span className="bg-sky-500/20 text-sky-300 border border-sky-500/35 text-xs px-2.5 py-1 rounded-full font-bold">{pendingTrips.length}</span>
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
              {loading ? (
                <div className="space-y-4">
                  <TripItemSkeleton />
                  <TripItemSkeleton />
                </div>
              ) : pendingTrips.length === 0 ? (
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
                      const hasOlderState = isMoreThan1DayOld(date);
                      const groupKey = `pending-${date}`;
                      const isCollapsed = hasOlderState && !expandedDates[groupKey];
                      
                      return (
                        <div key={date} className="mb-6 last:mb-0 animate-in fade-in duration-500">
                          <div 
                            className={`flex items-center gap-3 mb-4 select-none ${hasOlderState ? 'cursor-pointer group/date' : ''}`}
                            onClick={() => hasOlderState && handleToggleDate(groupKey)}
                          >
                            <div className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded flex items-center gap-2 transition-colors
                              ${isToday ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse' : 
                                isTomorrow ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50' : 
                                'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'}`}>
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
                              {dateLabel}
                              {hasOlderState && (
                                <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`} />
                              )}
                            </div>
                            <div className="h-px bg-slate-800 flex-1"></div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider group-hover/date:text-slate-400 transition-colors">
                              {groups[date].length} Bookings {hasOlderState && (isCollapsed ? '(Click to expand)' : '(Click to collapse)')}
                            </span>
                          </div>

                          {!isCollapsed && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                              {groups[date].map((trip, idx) => (
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
                                  setWipeModal={setWipeModal}
                                  setAmendTripId={setAmendTripId}
                                  setAmendTimeVal={setAmendTimeVal}
                                  index={idx}
                                />
                              ))}
                            </div>
                          )}
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
              {loading ? (
                <div className="space-y-4">
                  <TripItemSkeleton />
                  <TripItemSkeleton />
                </div>
              ) : activeTrips.length === 0 ? (
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
                      const hasOlderState = isMoreThan1DayOld(date);
                      const groupKey = `active-${date}`;
                      const isCollapsed = hasOlderState && !expandedDates[groupKey];
                      
                      return (
                        <div key={date} className="mb-6 last:mb-0 animate-in fade-in duration-500">
                          <div 
                            className={`flex items-center gap-3 mb-4 select-none ${hasOlderState ? 'cursor-pointer group/date' : ''}`}
                            onClick={() => hasOlderState && handleToggleDate(groupKey)}
                          >
                            <div className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded flex items-center gap-2 transition-colors
                              ${isToday ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse' : 
                                isTomorrow ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50' : 
                                'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'}`}>
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
                              {dateLabel}
                              {hasOlderState && (
                                <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`} />
                              )}
                            </div>
                            <div className="h-px bg-slate-800 flex-1"></div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider group-hover/date:text-slate-400 transition-colors">
                              {groups[date].length} Active Bookings {hasOlderState && (isCollapsed ? '(Click to expand)' : '(Click to collapse)')}
                            </span>
                          </div>

                          {!isCollapsed && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                              {groups[date].map((trip, idx) => (
                                <AdminActiveTripItem 
                                  key={trip.id} 
                                  trip={trip} 
                                  drivers={drivers} 
                                  handleForceCompleteTrip={handleForceCompleteTrip} 
                                  handleCancelTrip={handleCancelTrip}
                                  allUsers={allUsers}
                                  index={idx}
                                  vehicles={vehicles}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-950/5">
            <CardHeader className="bg-emerald-950/10 rounded-t-lg border-b border-emerald-500/20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                <CardTitle className="text-emerald-400 flex items-center gap-2">
                  Completed & Cancelled Trips (History)
                  <span className="bg-emerald-950/45 text-emerald-400 text-xs px-2 py-1 rounded-full font-mono">{completedTrips.length}</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium font-mono">Filter Range:</span>
                  <select 
                    value={completedTripsRange || '30days'} 
                    onChange={(e: any) => setCompletedTripsRange(e.target.value)}
                    className="bg-slate-950 border border-emerald-500/30 text-emerald-300 text-xs rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer font-medium font-sans"
                  >
                    <option value="today">Today Only</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days (Default)</option>
                    <option value="all">All History</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 p-3 sm:p-4 rounded-xl border border-emerald-500/10 bg-emerald-950/20">
                    <div className="space-y-2">
                      <Skeleton className="h-3.5 w-16 bg-slate-500/15" />
                      <Skeleton className="h-6 w-10 bg-slate-400/20" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3.5 w-16 bg-slate-500/15" />
                      <Skeleton className="h-6 w-10 bg-slate-400/20" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3.5 w-20 bg-slate-500/15" />
                      <Skeleton className="h-6 w-16 bg-slate-400/20" />
                    </div>
                  </div>
                  <TripItemSkeleton />
                  <TripItemSkeleton />
                </div>
              ) : (
                <>
                  {completedTrips.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 p-3 sm:p-4 rounded-xl border border-emerald-500/10 bg-emerald-950/20 text-xs text-slate-300">
                      <div className="space-y-1">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Bookings</p>
                        <p className="text-sm sm:text-lg font-bold text-slate-200 font-mono">{completedTrips.length}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Completed</p>
                        <p className="text-sm sm:text-lg font-bold text-emerald-400 font-mono">
                          {completedTrips.filter(t => t.status === 'completed').length}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">KM Traveled</p>
                        <p className="text-sm sm:text-lg font-bold text-blue-400 font-mono">
                          {completedTrips.reduce((acc, t) => {
                            if (t.status === 'completed' && t.startOdometer !== undefined && t.endOdometer !== undefined) {
                              const diff = Number(t.endOdometer) - Number(t.startOdometer);
                              if (!isNaN(diff) && diff > 0) return acc + diff;
                            }
                            return acc;
                          }, 0).toLocaleString()} km
                        </p>
                      </div>
                    </div>
                  )}

                  {completedTrips.length === 0 ? (
                    <div className="text-slate-400 text-center py-6">No completed/cancelled trips in the selected range ({completedTripsRange}).</div>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const groups: { [key: string]: typeof completedTrips } = {};
                        completedTrips.forEach(trip => {
                          const date = trip.requestedDate || 'Unspecified Date';
                          if (!groups[date]) groups[date] = [];
                          groups[date].push(trip);
                        });
                        
                        const sortedDates = Object.keys(groups).sort((a, b) => {
                          if (a === 'Unspecified Date') return 1;
                          if (b === 'Unspecified Date') return -1;
                          return b.localeCompare(a); // Today / most recent first!
                        });
                        
                        return sortedDates.map(date => {
                          const isToday = date === new Date().toISOString().split('T')[0];
                          const isTomorrow = date === new Date(Date.now() + 86400000).toISOString().split('T')[0];
                          const dateLabel = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : date;
                          const hasOlderState = isMoreThan1DayOld(date);
                          const groupKey = `completed-${date}`;
                          const isCollapsed = hasOlderState && !expandedDates[groupKey];
                          
                          return (
                            <div key={date} className="mb-6 last:mb-0 animate-in fade-in duration-500">
                              <div 
                                className={`flex items-center gap-3 mb-4 select-none ${hasOlderState ? 'cursor-pointer group/date' : ''}`}
                                onClick={() => hasOlderState && handleToggleDate(groupKey)}
                              >
                                <div className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded flex items-center gap-2 transition-colors
                                  ${isToday ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse' : 
                                    isTomorrow ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50' : 
                                    'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'}`}>
                                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
                                  {dateLabel}
                                  {hasOlderState && (
                                    <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`} />
                                  )}
                                </div>
                                <div className="h-px bg-slate-800/50 flex-1"></div>
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider group-hover/date:text-slate-400 transition-colors">
                                  {groups[date].length} Bookings {hasOlderState && (isCollapsed ? '(Click to expand)' : '(Click to collapse)')}
                                </span>
                              </div>

                              {!isCollapsed && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                  {groups[date].map((trip, idx) => (
                                    <AdminCompletedTripItem 
                                      key={trip.id} 
                                      trip={trip} 
                                      drivers={drivers} 
                                      allUsers={allUsers}
                                      index={idx}
                                      vehicles={vehicles}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Wipe & Clean Data Modal Overlays (Sandboxed Live App Compatible) */}
      {wipeModal !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            {wipeModal === 'amend' && (
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-100">Amend Request Start Time</h3>
                  <p className="text-xs text-slate-400">Change the scheduled pickup hour. Format is 24h (HH:MM).</p>
                </div>
                <div className="pt-2">
                  <input
                    type="text"
                    className="w-full bg-[#0a0f1c] border border-blue-500/30 text-slate-100 font-mono rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
                    placeholder="e.g. 14:30"
                    value={amendTimeVal}
                    onChange={(e) => setAmendTimeVal(e.target.value)}
                  />
                </div>
                <div className="flex gap-2.5 pt-4">
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    onClick={async () => {
                      if (!amendTimeVal || !amendTripId) return;
                      await handleAmendTrip(amendTripId, amendTimeVal);
                      setWipeModal('none');
                    }}
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => setWipeModal('none')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {wipeModal === 'operations' && (
              <div className="p-6 space-y-4">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/25 flex items-start gap-2.5">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h4 className="text-sm font-bold">Clear Operations Data (Start Fresh)</h4>
                    <p className="text-xs text-amber-400/80 mt-1">This will permanently delete all logged trips, bookings, and timesheets from the system, preparing it for clean test runs or going live.</p>
                  </div>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed pt-2">
                  Are you absolutely sure you want to proceed? This will revert your system statistics back to zero.
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 pt-4">
                  <Button 
                    className="w-full sm:flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                    onClick={executeClearData}
                  >
                    Yes, Clear All Logs
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full sm:flex-1"
                    onClick={() => setWipeModal('none')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {wipeModal === 'everything' && (
              <div className="p-6 space-y-4">
                <div className="p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/25 flex items-start gap-2.5">
                  <span className="text-xl">🛑</span>
                  <div>
                    <h4 className="text-sm font-bold">DANGER: System Core Reset</h4>
                    <p className="text-xs text-red-400/80 mt-1 font-sans">Wipes everything: All bookings, timesheets, and vehicle logs. Users & logins will be kept intact.</p>
                  </div>
                </div>
                <div className="text-sm text-slate-300 pt-2 font-sans">
                  This action is permanent. All active operations, vehicles, history records, and trip allocation logs will be wiped out completely.
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 pt-4">
                  <Button 
                    className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                    onClick={executeFullWipe}
                  >
                    Yes, WIPE SYSTEM
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full sm:flex-1"
                    onClick={() => setWipeModal('none')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </Layout>
  );
}
