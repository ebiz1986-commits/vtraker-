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

import { ChevronDown, ChevronLeft, ChevronRight, Play, Pause, Megaphone, ArrowRight, MapPin, Clock, Users, Edit, Check, X, Fuel, TrendingUp, PlusCircle, History, Gauge, Droplet, Settings, DollarSign, Calendar, Trash2, Compass, Download, ShieldAlert, FileText, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-3 sm:gap-4">
          <div className="flex items-start gap-3 min-w-0 w-full sm:w-auto">
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
            
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-800/20 sm:border-t-0 flex-shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-0 sm:flex-col sm:items-end justify-center">
              <Clock className="w-3.5 h-3.5 text-slate-400 sm:hidden" />
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider hidden sm:flex">
                <Clock className="w-3 h-3" /> Req. Time
              </p>
              <div className="flex items-center gap-1">
                <span className="sm:hidden text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Req. Time:</span>
                <p className="font-bold text-slate-100 text-sm sm:text-base leading-none">{trip.requestedStartTime || 'N/A'}</p>
              </div>
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
  const [midVehicleId, setMidVehicleId] = useState(trip.vehicleId || '');
  const [midStartOdo, setMidStartOdo] = useState(trip.startOdometer !== undefined ? String(trip.startOdometer) : '');
  const [midEndOdo, setMidEndOdo] = useState(trip.endOdometer !== undefined ? String(trip.endOdometer) : '');

  // Keep internal inputs in sync if the database updates externally
  useEffect(() => {
    if (trip.driverId) setMidDriverId(trip.driverId);
    if (trip.vehicleId) setMidVehicleId(trip.vehicleId);
    if (trip.startOdometer !== undefined) setMidStartOdo(String(trip.startOdometer));
    if (trip.endOdometer !== undefined) setMidEndOdo(String(trip.endOdometer));
  }, [trip.driverId, trip.vehicleId, trip.startOdometer, trip.endOdometer]);

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

  const handleVehicleMidSwap = async () => {
    if (!midVehicleId) {
      toast.error("Please pick a vehicle to swap to.");
      return;
    }
    try {
      const newV = vehicles.find((v: any) => v.id === midVehicleId);
      if (!newV) {
        toast.error("Selected vehicle not registered.");
        return;
      }

      await updateDoc(doc(db, 'trips', trip.id), {
        vehicleId: midVehicleId,
        vehicleName: `${newV.registrationNumber} (${newV.type})`,
        updatedAt: serverTimestamp()
      });
      toast.success(`Successfully reassigned vehicle to ${newV.registrationNumber} (${newV.type}) inside active journey!`);
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

  const handleAdjustStartOdometer = async () => {
    const startNum = midStartOdo !== '' ? Number(midStartOdo) : undefined;
    if (startNum === undefined || isNaN(startNum) || startNum < 0) {
      toast.error("Please enter a valid numeric starting odometer of 0 KM or greater.");
      return;
    }
    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        startOdometer: startNum,
        currentOdometer: startNum,
        updatedAt: serverTimestamp()
      });
      toast.success(`Successfully adjusted start odometer to ${startNum} KM. Trip remains active, and driver will use this value for calculations.`);
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-3 sm:gap-4">
          <div className="flex items-start gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-800/20 sm:border-t-0 flex-shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-0 sm:flex-col sm:items-end justify-center">
              <Clock className="w-3.5 h-3.5 text-slate-400 sm:hidden" />
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5 flex items-center gap-1 uppercase tracking-wider hidden sm:flex">
                <Clock className="w-3 h-3" /> Req. Time
              </p>
              <div className="flex items-center gap-1">
                <span className="sm:hidden text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Req. Time:</span>
                <p className="font-bold text-slate-100 text-sm sm:text-base leading-none">{trip.requestedStartTime || 'N/A'}</p>
              </div>
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
                
                {/* Hot driver & vehicle selection swap combined */}
                <div className="space-y-3 bg-[#090e1a]/85 p-3 rounded-lg border border-white/5 font-sans">
                  {/* Driver Swap Section */}
                  <div className="space-y-1">
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

                  {/* Vehicle Swap Section */}
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Change Vehicle (Mid-Journey / On the go)
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={midVehicleId}
                        onChange={(e) => setMidVehicleId(e.target.value)}
                        className="flex-1 bg-[#16213e] border border-[#2c3e66] text-white rounded px-2 text-xs py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium font-sans"
                      >
                        <option value="">Select vehicle ...</option>
                        {vehicles.map((v: any) => (
                          <option key={v.id} value={v.id} className="font-sans">
                            {v.registrationNumber} ({v.type})
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={handleVehicleMidSwap}
                        disabled={!midVehicleId || midVehicleId === trip.vehicleId}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono px-3 py-1.5 h-auto rounded transition-colors font-sans"
                      >
                        Swap
                      </Button>
                    </div>
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
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={handleAdjustStartOdometer}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 px-1.5 h-auto rounded transition-colors font-sans"
                      >
                        Adjust Start Odo ONLY
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleBypassOdometer}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold py-2 px-1.5 h-auto rounded transition-colors font-sans"
                      >
                        Bypass & Complete
                      </Button>
                    </div>
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 w-full sm:w-auto">
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

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-800/10 sm:border-t-0 flex-shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-0 sm:flex-col sm:items-end justify-center">
              <Clock className="w-3.5 h-3.5 text-slate-400 sm:hidden" />
              <div className="flex items-center gap-1">
                <span className="sm:hidden text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Req. Time:</span>
                <p className="font-bold text-slate-300 text-xs sm:text-sm">{trip.requestedStartTime || 'N/A'}</p>
              </div>
            </div>
            <div className="p-1.5 rounded-full bg-[#1e293b]/20 text-slate-500 hover:text-slate-200">
              <ChevronDown className={`w-4 h-4 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
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
  const { profile } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialLoadRef = useRef(true);

  // Active view tab state ('dispatch' | 'fuel' | 'compliance')
  const [activeTab, setActiveTab] = useState<'dispatch' | 'fuel' | 'compliance'>('dispatch');

  // Fuel states
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  
  // Compliance states
  const [complianceRecords, setComplianceRecords] = useState<any[]>([]);
  const [accidentRecords, setAccidentRecords] = useState<any[]>([]);

  // Form states for Compliance
  const [compVehicleId, setCompVehicleId] = useState('');
  const [compRevNo, setCompRevNo] = useState('');
  const [compRevExpiry, setCompRevExpiry] = useState('');
  const [compRevFee, setCompRevFee] = useState('');
  const [compInsProvider, setCompInsProvider] = useState('');
  const [compInsPolicy, setCompInsPolicy] = useState('');
  const [compInsExpiry, setCompInsExpiry] = useState('');
  const [compInsPremium, setCompInsPremium] = useState('');
  const [compValAmount, setCompValAmount] = useState('');
  const [compValDate, setCompValDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [compValCompany, setCompValCompany] = useState('');
  const [isSavingComp, setIsSavingComp] = useState(false);

  // Form states for Accidents
  const [accVehicleId, setAccVehicleId] = useState('');
  const [accDriverId, setAccDriverId] = useState('');
  const [accDate, setAccDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [accLocation, setAccLocation] = useState('');
  const [accDescription, setAccDescription] = useState('');
  const [accSeverity, setAccSeverity] = useState<'minor' | 'moderate' | 'major'>('minor');
  const [accHasClaim, setAccHasClaim] = useState(false);
  const [accClaimStatus, setAccClaimStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [accClaimRequested, setAccClaimRequested] = useState('');
  const [accClaimApproved, setAccClaimApproved] = useState('');
  const [accInsRef, setAccInsRef] = useState('');
  const [isSavingAcc, setIsSavingAcc] = useState(false);
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelOdometer, setFuelOdometer] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelDate, setFuelDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fuelTime, setFuelTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [isSavingFuel, setIsSavingFuel] = useState(false);

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

  // News ticker / banner states
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [newsPaused, setNewsPaused] = useState(false);

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

  // Dynamically assemble notification and updates bulletins for the News Bar
  const getNewsItems = () => {
    const items: {
      id: string;
      type: 'critical' | 'warning' | 'info' | 'success';
      message: string;
      category: string;
      actionText?: string;
      action?: () => void;
    }[] = [];

    const currentTime = Date.now();
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;

    // 1. Compliance expirations
    complianceRecords.forEach(rec => {
      const revTimeLeft = rec.revenueLicenseExpiry - currentTime;
      const insTimeLeft = rec.insuranceExpiry - currentTime;

      if (revTimeLeft < 0) {
        items.push({
          id: `comp-rev-exp-${rec.id}`,
          type: 'critical',
          category: 'REVENUE LICENSE EXPIRED',
          message: `Vehicle ${rec.vehicleRegistration} Revenue License EXPIRED on ${new Date(rec.revenueLicenseExpiry).toLocaleDateString()}!`,
          actionText: 'Quick Renew',
          action: () => {
            setActiveTab('compliance');
            setCompVehicleId(rec.vehicleId);
            setCompRevNo(rec.revenueLicenseNo || '');
            setCompRevExpiry(new Date(rec.revenueLicenseExpiry).toISOString().split('T')[0]);
            setCompRevFee(rec.revenueLicenseFee?.toString() || '');
            setCompInsProvider(rec.insuranceProvider || '');
            setCompInsPolicy(rec.insurancePolicyNo || '');
            setCompInsExpiry(new Date(rec.insuranceExpiry).toISOString().split('T')[0]);
            setCompInsPremium(rec.insurancePremium?.toString() || '');
            setCompValAmount(rec.valuationAmount?.toString() || '');
            setCompValCompany(rec.valuationCompany || '');
            if (rec.valuationDate) {
              setCompValDate(new Date(rec.valuationDate).toISOString().split('T')[0]);
            }
            toast.info(`Loaded renewal details for ${rec.vehicleRegistration}`);
          }
        });
      } else if (revTimeLeft > 0 && revTimeLeft <= tenDaysMs) {
        const days = Math.ceil(revTimeLeft / (24 * 60 * 60 * 1000));
        items.push({
          id: `comp-rev-warn-${rec.id}`,
          type: 'warning',
          category: 'LICENSE EXPIRY WARN',
          message: `Vehicle ${rec.vehicleRegistration} Revenue License expires in ${days} days (${new Date(rec.revenueLicenseExpiry).toLocaleDateString()})`,
          actionText: 'Renew',
          action: () => {
            setActiveTab('compliance');
            setCompVehicleId(rec.vehicleId);
            setCompRevNo(rec.revenueLicenseNo || '');
            setCompRevExpiry(new Date(rec.revenueLicenseExpiry).toISOString().split('T')[0]);
            setCompRevFee(rec.revenueLicenseFee?.toString() || '');
            setCompInsProvider(rec.insuranceProvider || '');
            setCompInsPolicy(rec.insurancePolicyNo || '');
            setCompInsExpiry(new Date(rec.insuranceExpiry).toISOString().split('T')[0]);
            setCompInsPremium(rec.insurancePremium?.toString() || '');
            setCompValAmount(rec.valuationAmount?.toString() || '');
            setCompValCompany(rec.valuationCompany || '');
            if (rec.valuationDate) {
              setCompValDate(new Date(rec.valuationDate).toISOString().split('T')[0]);
            }
            toast.info(`Loaded renewal details for ${rec.vehicleRegistration}`);
          }
        });
      }

      if (insTimeLeft < 0) {
        items.push({
          id: `comp-ins-exp-${rec.id}`,
          type: 'critical',
          category: 'INSURANCE EXPIRED',
          message: `Vehicle ${rec.vehicleRegistration} Insurance Policy (${rec.insurancePolicyNo}) EXPIRED!`,
          actionText: 'Renew Policy',
          action: () => {
            setActiveTab('compliance');
            setCompVehicleId(rec.vehicleId);
            setCompRevNo(rec.revenueLicenseNo || '');
            setCompRevExpiry(new Date(rec.revenueLicenseExpiry).toISOString().split('T')[0]);
            setCompRevFee(rec.revenueLicenseFee?.toString() || '');
            setCompInsProvider(rec.insuranceProvider || '');
            setCompInsPolicy(rec.insurancePolicyNo || '');
            setCompInsExpiry(new Date(rec.insuranceExpiry).toISOString().split('T')[0]);
            setCompInsPremium(rec.insurancePremium?.toString() || '');
            setCompValAmount(rec.valuationAmount?.toString() || '');
            setCompValCompany(rec.valuationCompany || '');
            if (rec.valuationDate) {
              setCompValDate(new Date(rec.valuationDate).toISOString().split('T')[0]);
            }
            toast.info(`Loaded insurance renewal details for ${rec.vehicleRegistration}`);
          }
        });
      } else if (insTimeLeft > 0 && insTimeLeft <= tenDaysMs) {
        const days = Math.ceil(insTimeLeft / (24 * 60 * 60 * 1000));
        items.push({
          id: `comp-ins-warn-${rec.id}`,
          type: 'warning',
          category: 'INSURANCE WARN',
          message: `Vehicle ${rec.vehicleRegistration} Insurance Policy expires in ${days} days`,
          actionText: 'Renew Policy',
          action: () => {
            setActiveTab('compliance');
            setCompVehicleId(rec.vehicleId);
            setCompRevNo(rec.revenueLicenseNo || '');
            setCompRevExpiry(new Date(rec.revenueLicenseExpiry).toISOString().split('T')[0]);
            setCompRevFee(rec.revenueLicenseFee?.toString() || '');
            setCompInsProvider(rec.insuranceProvider || '');
            setCompInsPolicy(rec.insurancePolicyNo || '');
            setCompInsExpiry(new Date(rec.insuranceExpiry).toISOString().split('T')[0]);
            setCompInsPremium(rec.insurancePremium?.toString() || '');
            setCompValAmount(rec.valuationAmount?.toString() || '');
            setCompValCompany(rec.valuationCompany || '');
            if (rec.valuationDate) {
              setCompValDate(new Date(rec.valuationDate).toISOString().split('T')[0]);
            }
            toast.info(`Loaded insurance renewal details for ${rec.vehicleRegistration}`);
          }
        });
      }
    });

    // 2. Accident alerts
    accidentRecords.forEach(rec => {
      if (rec.severity === 'major') {
        items.push({
          id: `acc-major-${rec.id}`,
          type: 'critical',
          category: 'CRITICAL ACCIDENT',
          message: `Critical Damage on ${rec.vehicleRegistration} at ${rec.location}. Details: ${rec.description}`,
          actionText: 'View History',
          action: () => {
            setActiveTab('compliance');
            toast.info("Scrolled to Accident Logs");
          }
        });
      }
      if (rec.hasClaim && rec.claimStatus === 'pending') {
        items.push({
          id: `acc-claim-pending-${rec.id}`,
          type: 'warning',
          category: 'CLAIM PENDING',
          message: `Insurance Claim for ${rec.vehicleRegistration} is PENDING: LKR ${rec.claimAmountRequested?.toLocaleString() || 0} requested from ${complianceRecords.find(c => c.vehicleId === rec.vehicleId)?.insuranceProvider || 'provider'}.`,
          actionText: 'View Claim',
          action: () => {
            setActiveTab('compliance');
          }
        });
      }
    });

    // 3. Fuel Alerts
    if (fuelRecords.length > 0) {
      const latestFuel = [...fuelRecords].sort((a, b) => b.timestamp - a.timestamp)[0];
      if (latestFuel) {
        items.push({
          id: `fuel-latest-${latestFuel.id}`,
          type: 'success',
          category: 'FUEL REFUEL',
          message: `Fuel Event: Vehicle ${latestFuel.vehicleRegistration || 'Fleet'} was refueled with ${latestFuel.liters}L costing LKR ${latestFuel.cost?.toLocaleString() || 0}`,
          actionText: 'View Fuel Log',
          action: () => {
            setActiveTab('fuel');
          }
        });
      }
    }

    // 4. Operations Alerts
    const pendingTrips = trips.filter(t => t.status === 'requested' || t.status === 'pending');
    if (pendingTrips.length > 0) {
      items.push({
        id: `ops-pending-${pendingTrips.length}`,
        type: 'info',
        category: 'PENDING DISPATCH',
        message: `${pendingTrips.length} dispatch requests are pending allocation of drivers or vehicles!`,
        actionText: 'Allocate Now',
        action: () => {
          setActiveTab('dispatch');
        }
      });
    }

    const activeTrips = trips.filter(t => t.status === 'dispatched' || t.status === 'started');
    if (activeTrips.length > 0) {
      items.push({
        id: `ops-active-${activeTrips.length}`,
        type: 'info',
        category: 'LIVE FLEET',
        message: `Fleet Operations: There are currently ${activeTrips.length} live transport operations on the road.`,
        actionText: 'Monitor Dispatch',
        action: () => {
          setActiveTab('dispatch');
        }
      });
    }

    // 5. System Default Bulletins
    items.push({
      id: 'default-bulletin-1',
      type: 'info',
      category: 'SYSTEM STATUS',
      message: `Operational Ledger Sync is live. Normal authorization enforcement is ${isNormalFlow ? 'ENABLED' : 'DISABLED'}.`,
      actionText: 'Settings',
      action: () => {
        toast.info(`Flow control can be updated inside the dispatch board footer.`);
      }
    });

    items.push({
      id: 'default-bulletin-2',
      type: 'success',
      category: 'FLEET METRICS',
      message: `Staff Directory: ${drivers.length} registered drivers, ${vehicles.length} active fleet carriers connected.`,
      actionText: 'View Dispatch',
      action: () => {
        setActiveTab('dispatch');
      }
    });

    return items;
  };

  useEffect(() => {
    if (newsPaused) return;
    const items = getNewsItems();
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentNewsIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [newsPaused, complianceRecords, accidentRecords, fuelRecords, trips, drivers, vehicles, isNormalFlow]);

  const renderNewsBar = () => {
    const items = getNewsItems();
    if (items.length === 0) return null;

    const safeIndex = currentNewsIndex >= items.length ? 0 : currentNewsIndex;
    const activeItem = items[safeIndex];

    const nextNews = () => {
      setCurrentNewsIndex((prev) => (prev + 1) % items.length);
    };

    const prevNews = () => {
      setCurrentNewsIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    const togglePause = () => {
      setNewsPaused((prev) => !prev);
    };

    const typeStyles = {
      critical: {
        bg: 'from-rose-950/40 to-slate-900/40 border-rose-500/30 text-rose-200',
        badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        iconColor: 'text-rose-500'
      },
      warning: {
        bg: 'from-amber-950/40 to-slate-900/40 border-amber-500/30 text-amber-200',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        iconColor: 'text-amber-400'
      },
      success: {
        bg: 'from-emerald-950/40 to-slate-900/40 border-emerald-500/30 text-emerald-200',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        iconColor: 'text-emerald-500'
      },
      info: {
        bg: 'from-sky-950/40 to-slate-900/40 border-sky-500/30 text-sky-200',
        badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        iconColor: 'text-sky-400'
      }
    };

    const styles = typeStyles[activeItem.type] || typeStyles.info;

    return (
      <div className="w-full mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className={`relative flex flex-col md:flex-row items-center justify-between p-3.5 rounded-xl border bg-gradient-to-r ${styles.bg} backdrop-blur-md shadow-lg transition-all duration-300 overflow-hidden`}>
          <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${styles.iconColor}`} />
          
          <div className="flex flex-1 items-center gap-3 w-full min-w-0">
            <div className="relative flex-shrink-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-slate-950/60 border border-white/5`}>
                <Megaphone className={`w-4 h-4 ${styles.iconColor} ${!newsPaused ? 'animate-pulse' : ''}`} />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.iconColor} bg-current`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-current ${styles.iconColor}`}></span>
              </span>
            </div>

            <div className="flex-1 min-w-0 space-y-1 md:space-y-0 md:flex md:items-center md:gap-3">
              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest border ${styles.badge} flex-shrink-0 align-middle`}>
                {activeItem.category}
              </span>
              <p className="text-xs font-medium text-slate-100 truncate pr-4 md:align-middle leading-relaxed">
                {activeItem.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 md:mt-0 w-full md:w-auto justify-between md:justify-end flex-shrink-0 border-t border-white/5 md:border-none pt-3 md:pt-0">
            {activeItem.action && activeItem.actionText && (
              <button
                onClick={activeItem.action}
                className="text-xs bg-white/10 hover:bg-white/15 text-white hover:text-white font-bold py-1 px-3 rounded-lg border border-white/10 transition-all cursor-pointer flex items-center gap-1 uppercase tracking-wider"
              >
                <span>{activeItem.actionText}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-white/5 select-none font-mono">
              <button 
                onClick={prevNews}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors cursor-pointer"
                title="Previous Bulletin"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={togglePause}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors cursor-pointer"
                title={newsPaused ? "Play Autoplay" : "Pause Autoplay"}
              >
                {newsPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
              </button>

              <button 
                onClick={nextNews}
                className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors cursor-pointer"
                title="Next Bulletin"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-[9px] text-slate-500 px-1.5 font-bold border-l border-white/5">
                {safeIndex + 1}/{items.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

  const handleToggleDate = (key: string, defaultExpanded: boolean = false) => {
    setExpandedDates(prev => ({
      ...prev,
      [key]: prev[key] !== undefined ? !prev[key] : !defaultExpanded
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
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'trips', false));

    // Listen to Users (for roles)
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const allUsers = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setDrivers(allUsers.filter(u => u.role === 'driver'));
      // Adding all users to state if we want to list them
      setAllUsers(allUsers);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users', false));

    // Listen to Vehicles
    const qVehicles = query(collection(db, 'vehicles'));
    const unsubVehicles = onSnapshot(qVehicles, (snap) => {
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'vehicles', false));

    // Listen to Fuel Records
    const qFuel = query(collection(db, 'fuel_records'));
    const unsubFuel = onSnapshot(qFuel, (snap) => {
      const fuelData = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      fuelData.sort((a, b) => b.timestamp - a.timestamp); // Sort descending (newest fueling time first)
      setFuelRecords(fuelData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'fuel_records', false));

    // Listen to Compliance Records
    const qCompliance = query(collection(db, 'compliance_records'));
    const unsubCompliance = onSnapshot(qCompliance, (snap) => {
      setComplianceRecords(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'compliance_records', false));

    // Listen to Accident Records
    const qAccidents = query(collection(db, 'accident_records'));
    const unsubAccidents = onSnapshot(qAccidents, (snap) => {
      setAccidentRecords(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'accident_records', false));

    return () => {
      unsubTrips();
      unsubUsers();
      unsubVehicles();
      unsubFuel();
      unsubCompliance();
      unsubAccidents();
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

  const handleAddFuelRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelVehicleId || !fuelLiters || !fuelOdometer || !fuelDate || !fuelTime) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const litersNum = Number(fuelLiters);
    const odoNum = Number(fuelOdometer);
    const costNum = fuelCost !== '' ? Number(fuelCost) : undefined;

    if (isNaN(litersNum) || litersNum <= 0) {
      toast.error("Please enter a valid amount of liters (> 0).");
      return;
    }
    if (isNaN(odoNum) || odoNum < 0) {
      toast.error("Please enter a valid odometer reading.");
      return;
    }
    if (costNum !== undefined && (isNaN(costNum) || costNum < 0)) {
      toast.error("Please enter a valid numeric cost.");
      return;
    }

    // Determine fueling timestamp
    const [hours, minutes] = fuelTime.split(':');
    const combinedDate = new Date(fuelDate);
    combinedDate.setHours(parseInt(hours || '0', 10), parseInt(minutes || '0', 10), 0, 0);
    const timestamp = combinedDate.getTime();

    // Get vehicle registration
    const targetVeh = vehicles.find(v => v.id === fuelVehicleId);
    if (!targetVeh) {
      toast.error("Selected vehicle not found.");
      return;
    }

    // Odometer Validation: Warn or prevent if odometer is lower than the last recorded odometer for this vehicle
    const vehicleRecords = fuelRecords.filter(r => r.vehicleId === fuelVehicleId);
    if (vehicleRecords.length > 0) {
      const maxOdo = Math.max(...vehicleRecords.map(r => r.odometer));
      if (odoNum < maxOdo) {
        if (!window.confirm(`Warning: The entered odometer (${odoNum} KM) is lower than the previously recorded odometer (${maxOdo} KM) for this vehicle. Do you want to proceed anyway?`)) {
          return;
        }
      }
    }

    setIsSavingFuel(true);
    const recordId = 'fuel_' + Math.random().toString(36).substr(2, 9);

    try {
      await setDoc(doc(db, 'fuel_records', recordId), {
        vehicleId: fuelVehicleId,
        vehicleRegistration: targetVeh.registrationNumber,
        liters: litersNum,
        odometer: odoNum,
        timestamp,
        recordedBy: profile?.userId || 'unknown',
        recordedByName: profile?.name || profile?.email || 'Admin',
        cost: costNum || 0,
        createdAt: serverTimestamp()
      });

      toast.success("Fuel log recorded successfully!");
      // Reset form (except vehicle selection to make bulk entry easier, if needed, but we can clear it)
      setFuelLiters('');
      setFuelOdometer('');
      setFuelCost('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'fuel_records');
    } finally {
      setIsSavingFuel(false);
    }
  };

  const handleDeleteFuelRecord = async (recordId: string) => {
    if (!window.confirm("Are you sure you want to delete this fuel record? This will recalculate average fuel consumption.")) return;
    try {
      await deleteDoc(doc(db, 'fuel_records', recordId));
      toast.success("Fuel record deleted.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `fuel_records/${recordId}`);
    }
  };

  const handleExportFuelCSV = () => {
    if (fuelRecords.length === 0) {
      toast.error("No fuel records to export.");
      return;
    }

    const headers = [
      'Record ID', 'Vehicle Registration', 'Vehicle ID', 'Refueling Date & Time', 'Liters (L)', 'Odometer Reading (KM)', 'Cost (LKR)', 'Recorded By', 'Recorded By User ID'
    ];

    let csvContent = headers.join(',') + '\n';

    fuelRecords.forEach(r => {
      const refTime = new Date(r.timestamp).toLocaleString().replace(/,/g, '');
      const row = [
        r.id || '',
        `"${(r.vehicleRegistration || '').replace(/"/g, '""')}"`,
        `"${(r.vehicleId || '').replace(/"/g, '""')}"`,
        `"${refTime}"`,
        r.liters || 0,
        r.odometer || 0,
        r.cost || 0,
        `"${(r.recordedByName || 'Admin').replace(/"/g, '""')}"`,
        `"${(r.recordedBy || 'unknown').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fuel_Logs_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fuel records exported as CSV!");
  };

  const handleExportComplianceCSV = () => {
    if (complianceRecords.length === 0) {
      toast.error("No compliance records to export.");
      return;
    }

    const headers = [
      'Vehicle ID', 'Vehicle Registration', 'Revenue License No', 'Revenue License Expiry', 'Revenue License Fee (LKR)', 'Insurance Provider', 'Insurance Policy No', 'Insurance Expiry', 'Insurance Premium (LKR)', 'Valuation Amount (LKR)', 'Valuation Date', 'Valuation Company'
    ];

    let csvContent = headers.join(',') + '\n';

    complianceRecords.forEach(r => {
      const revExpStr = r.revenueLicenseExpiry ? new Date(r.revenueLicenseExpiry).toLocaleDateString() : 'N/A';
      const insExpStr = r.insuranceExpiry ? new Date(r.insuranceExpiry).toLocaleDateString() : 'N/A';
      const valDateStr = r.valuationDate ? new Date(r.valuationDate).toLocaleDateString() : 'N/A';
      const row = [
        `"${(r.vehicleId || '').replace(/"/g, '""')}"`,
        `"${(r.vehicleRegistration || '').replace(/"/g, '""')}"`,
        `"${(r.revenueLicenseNo || '').replace(/"/g, '""')}"`,
        `"${revExpStr}"`,
        r.revenueLicenseFee || 0,
        `"${(r.insuranceProvider || '').replace(/"/g, '""')}"`,
        `"${(r.insurancePolicyNo || '').replace(/"/g, '""')}"`,
        `"${insExpStr}"`,
        r.insurancePremium || 0,
        r.valuationAmount || 0,
        `"${valDateStr}"`,
        `"${(r.valuationCompany || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Fleet_Compliance_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fleet compliance records exported as CSV!");
  };

  const handleExportAccidentCSV = () => {
    if (accidentRecords.length === 0) {
      toast.error("No accident records to export.");
      return;
    }

    const headers = [
      'Accident ID', 'Vehicle Registration', 'Vehicle ID', 'Driver Name', 'Driver ID', 'Date', 'Location', 'Severity', 'Description', 'Has Claim', 'Claim Status', 'Claim Amount Requested (LKR)', 'Claim Amount Approved (LKR)', 'Insurance Reference No'
    ];

    let csvContent = headers.join(',') + '\n';

    accidentRecords.forEach(r => {
      const accDateStr = r.accidentDate ? new Date(r.accidentDate).toLocaleDateString() : 'N/A';
      const row = [
        `"${(r.id || '').replace(/"/g, '""')}"`,
        `"${(r.vehicleRegistration || '').replace(/"/g, '""')}"`,
        `"${(r.vehicleId || '').replace(/"/g, '""')}"`,
        `"${(r.driverName || 'N/A').replace(/"/g, '""')}"`,
        `"${(r.driverId || '').replace(/"/g, '""')}"`,
        `"${accDateStr}"`,
        `"${(r.location || '').replace(/"/g, '""')}"`,
        `"${(r.severity || '').replace(/"/g, '""')}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        r.hasClaim ? 'Yes' : 'No',
        `"${(r.claimStatus || 'none').replace(/"/g, '""')}"`,
        r.claimAmountRequested || 0,
        r.claimAmountApproved || 0,
        `"${(r.insuranceRefNo || 'N/A').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Accidents_Claims_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Accident & claims records exported as CSV!");
  };

  const handleSaveCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compVehicleId) {
      toast.error("Please select a vehicle.");
      return;
    }
    if (!compRevExpiry) {
      toast.error("Please select Revenue License Expiry date.");
      return;
    }
    if (!compInsExpiry) {
      toast.error("Please select Insurance Policy Expiry date.");
      return;
    }
    if (!compValAmount) {
      toast.error("Please enter the latest Valuation Amount.");
      return;
    }

    const targetVeh = vehicles.find(v => v.id === compVehicleId);
    if (!targetVeh) {
      toast.error("Selected vehicle not found.");
      return;
    }

    setIsSavingComp(true);
    try {
      await setDoc(doc(db, 'compliance_records', compVehicleId), {
        vehicleId: compVehicleId,
        vehicleRegistration: targetVeh.registrationNumber,
        revenueLicenseNo: compRevNo || 'N/A',
        revenueLicenseExpiry: new Date(compRevExpiry).getTime(),
        revenueLicenseFee: parseFloat(compRevFee) || 0,
        insuranceProvider: compInsProvider || 'N/A',
        insurancePolicyNo: compInsPolicy || 'N/A',
        insuranceExpiry: new Date(compInsExpiry).getTime(),
        insurancePremium: parseFloat(compInsPremium) || 0,
        valuationAmount: parseFloat(compValAmount) || 0,
        valuationDate: compValDate ? new Date(compValDate).getTime() : Date.now(),
        valuationCompany: compValCompany || 'N/A',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success("Compliance details saved successfully!");
      // Reset form
      setCompVehicleId('');
      setCompRevNo('');
      setCompRevExpiry('');
      setCompRevFee('');
      setCompInsProvider('');
      setCompInsPolicy('');
      setCompInsExpiry('');
      setCompInsPremium('');
      setCompValAmount('');
      setCompValCompany('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `compliance_records/${compVehicleId}`);
    } finally {
      setIsSavingComp(false);
    }
  };

  const handleDeleteCompliance = async (vehicleId: string) => {
    if (!window.confirm("Are you sure you want to delete compliance records for this vehicle?")) return;
    try {
      await deleteDoc(doc(db, 'compliance_records', vehicleId));
      toast.success("Compliance record deleted.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `compliance_records/${vehicleId}`);
    }
  };

  const handleSaveAccident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accVehicleId) {
      toast.error("Please select a vehicle.");
      return;
    }
    if (!accDate) {
      toast.error("Please select the accident date.");
      return;
    }
    
    const targetVeh = vehicles.find(v => v.id === accVehicleId);
    if (!targetVeh) {
      toast.error("Selected vehicle not found.");
      return;
    }

    const targetDriver = drivers.find(d => d.id === accDriverId);

    setIsSavingAcc(true);
    const accidentId = 'accident_' + Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, 'accident_records', accidentId), {
        vehicleId: accVehicleId,
        vehicleRegistration: targetVeh.registrationNumber,
        driverId: accDriverId || 'none',
        driverName: targetDriver?.name || 'Unknown/N/A',
        accidentDate: new Date(accDate).getTime(),
        location: accLocation || 'Unknown',
        description: accDescription || 'No description provided.',
        severity: accSeverity,
        hasClaim: accHasClaim,
        claimStatus: accHasClaim ? accClaimStatus : 'none',
        claimAmountRequested: accHasClaim ? (parseFloat(accClaimRequested) || 0) : 0,
        claimAmountApproved: accHasClaim ? (parseFloat(accClaimApproved) || 0) : 0,
        insuranceRefNo: accInsRef || 'N/A',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success("Accident record logged successfully!");
      // Reset form
      setAccVehicleId('');
      setAccDriverId('');
      setAccLocation('');
      setAccDescription('');
      setAccSeverity('minor');
      setAccHasClaim(false);
      setAccClaimStatus('none');
      setAccClaimRequested('');
      setAccClaimApproved('');
      setAccInsRef('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `accident_records/${accidentId}`);
    } finally {
      setIsSavingAcc(false);
    }
  };

  const handleDeleteAccident = async (accidentId: string) => {
    if (!window.confirm("Are you sure you want to delete this accident record?")) return;
    try {
      await deleteDoc(doc(db, 'accident_records', accidentId));
      toast.success("Accident record deleted.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accident_records/${accidentId}`);
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

  const renderFuelDashboard = () => {
    // 1. Calculate general stats
    const totalFuelLiters = fuelRecords.reduce((acc, r) => acc + Number(r.liters || 0), 0);
    const totalFuelCost = fuelRecords.reduce((acc, r) => acc + Number(r.cost || 0), 0);
    const totalFuelEntries = fuelRecords.length;

    // 2. Compute per-vehicle stats
    const vehicleStats = vehicles.map(v => {
      const records = fuelRecords
        .filter(r => r.vehicleId === v.id)
        .sort((a, b) => a.timestamp - b.timestamp);

      const totalLiters = records.reduce((acc, r) => acc + Number(r.liters || 0), 0);
      const totalCost = records.reduce((acc, r) => acc + Number(r.cost || 0), 0);
      const count = records.length;

      let avgConsumption = 0;
      let distance = 0;

      if (count >= 2) {
        const minOdo = records[0].odometer;
        const maxOdo = records[count - 1].odometer;
        distance = maxOdo - minOdo;

        // The fuel consumed to cover this distance is the sum of liters from the second record onwards
        const fuelConsumed = records.slice(1).reduce((acc, r) => acc + Number(r.liters || 0), 0);
        if (fuelConsumed > 0 && distance > 0) {
          avgConsumption = distance / fuelConsumed;
        }
      }

      const lastRecord = records.length > 0 ? records[records.length - 1] : null;

      return {
        ...v,
        totalLiters,
        totalCost,
        count,
        distance,
        avgConsumption,
        lastOdometer: lastRecord ? lastRecord.odometer : null,
        lastTimestamp: lastRecord ? lastRecord.timestamp : null
      };
    });

    // Find the latest recorded odometer for the selected vehicle in the form
    const selectedVehRecord = fuelVehicleId 
      ? vehicleStats.find(v => v.id === fuelVehicleId)
      : null;
    const lastOdoValue = selectedVehRecord ? selectedVehRecord.lastOdometer : null;

    // Sort vehicle stats to find high efficiency leader
    const activeStats = vehicleStats.filter(s => s.count >= 2);
    const bestVehicle = activeStats.length > 0 
      ? [...activeStats].sort((a, b) => b.avgConsumption - a.avgConsumption)[0] 
      : null;

    return (
      <div className="space-y-6">
        {/* KPI Top Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-orange-500/10 bg-[#0d1425]/40 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Fuel Logged</p>
                <p className="text-xl font-mono font-bold text-slate-100">{totalFuelLiters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</p>
              </div>
            </div>
          </Card>
          
          <Card className="border-emerald-500/10 bg-[#0d1425]/40 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fuel Cost Investment</p>
                <p className="text-xl font-mono font-bold text-slate-100">LKR {totalFuelCost.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="border-sky-500/10 bg-[#0d1425]/40 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fuel Transactions</p>
                <p className="text-xl font-mono font-bold text-slate-100">{totalFuelEntries} Logs</p>
              </div>
            </div>
          </Card>

          <Card className="border-purple-500/10 bg-[#0d1425]/40 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Most Fuel Efficient</p>
                <p className="text-sm font-bold text-slate-100 truncate max-w-[150px]">
                  {bestVehicle 
                    ? `${bestVehicle.registrationNumber} (${bestVehicle.avgConsumption.toFixed(1)} km/L)` 
                    : 'Awaiting logs...'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Dashboard split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recording form and efficiency bar comparison */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-orange-500/20 bg-[#0d1425]/30">
              <CardHeader className="bg-orange-500/5 border-b border-orange-500/10">
                <CardTitle className="text-orange-400 flex items-center gap-2 text-sm sm:text-base font-bold uppercase tracking-wider">
                  <PlusCircle className="w-4 h-4" />
                  Log Refueling Event
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={handleAddFuelRecord} className="space-y-4">
                  {/* Select Vehicle */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehicle</label>
                    <select 
                      required
                      value={fuelVehicleId}
                      onChange={e => setFuelVehicleId(e.target.value)}
                      className="w-full mt-1.5 p-2.5 text-sm border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-100 focus:outline-none focus:border-orange-500 transition-colors"
                    >
                      <option value="">-- Select Vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.registrationNumber} ({v.type})</option>
                      ))}
                    </select>
                  </div>

                  {/* Date & Time Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" /> Date
                      </label>
                      <input 
                        type="date"
                        required
                        value={fuelDate}
                        onChange={e => setFuelDate(e.target.value)}
                        className="w-full mt-1.5 p-2.5 text-xs sm:text-sm border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-100 font-sans focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> Time
                      </label>
                      <input 
                        type="time"
                        required
                        value={fuelTime}
                        onChange={e => setFuelTime(e.target.value)}
                        className="w-full mt-1.5 p-2.5 text-xs sm:text-sm border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-100 font-mono focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Quantity and Meter Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fuel added (L)</label>
                      <input 
                        type="number"
                        step="0.01"
                        min="0.1"
                        required
                        placeholder="e.g. 45.5"
                        value={fuelLiters}
                        onChange={e => setFuelLiters(e.target.value)}
                        className="w-full mt-1.5 p-2.5 text-sm border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-100 font-mono focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Meter (KM)</label>
                        {lastOdoValue !== null && (
                          <span className="text-[9px] font-mono text-orange-400">Last: {lastOdoValue} KM</span>
                        )}
                      </div>
                      <input 
                        type="number"
                        required
                        placeholder="Odometer reading"
                        value={fuelOdometer}
                        onChange={e => setFuelOdometer(e.target.value)}
                        className="w-full mt-1.5 p-2.5 text-sm border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-100 font-mono focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Cost Field */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total cost (LKR - optional)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 16500"
                      value={fuelCost}
                      onChange={e => setFuelCost(e.target.value)}
                      className="w-full mt-1.5 p-2.5 text-sm border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-100 font-mono focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  {/* Button */}
                  <Button 
                    type="submit" 
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                    disabled={isSavingFuel}
                  >
                    {isSavingFuel ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Logging...
                      </>
                    ) : (
                      <>
                        <Fuel className="w-4 h-4" />
                        Record Fueling
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Horizontal Bar Chart Compare Card */}
            <Card className="border-orange-500/15 bg-[#0d1425]/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-orange-400 flex items-center gap-2 text-sm sm:text-base font-bold uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4" />
                  Fuel Efficiency comparison (km/L)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeStats.length === 0 ? (
                  <div className="text-slate-500 text-center py-6 text-xs leading-relaxed">
                    Not enough fuel records to compare efficiency.<br />
                    At least <span className="text-orange-400 font-bold">2 entries per vehicle</span> are required to analyze distance and calculate average consumption.
                  </div>
                ) : (
                  [...activeStats]
                    .sort((a, b) => b.avgConsumption - a.avgConsumption)
                    .map(v => {
                      const pct = Math.min((v.avgConsumption / 20) * 100, 100);
                      return (
                        <div key={v.id} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-200">
                              {v.registrationNumber} <span className="text-slate-500 font-normal capitalize">({v.type})</span>
                            </span>
                            <span className="font-mono text-orange-400 font-bold">{v.avgConsumption.toFixed(2)} km/L</span>
                          </div>
                          <div className="w-full bg-[#070b14] rounded-full h-3 border border-[#1f2937] overflow-hidden flex items-center">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full bg-gradient-to-r ${
                                v.avgConsumption >= 12 
                                  ? 'from-emerald-600 to-emerald-400' 
                                  : v.avgConsumption >= 8 
                                    ? 'from-amber-600 to-amber-400' 
                                    : 'from-rose-600 to-rose-400'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Fleet Report and Recent log history */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fleet consumption details report card */}
            <Card className="border-sky-500/20 bg-[#0d1425]/40">
              <CardHeader className="bg-sky-500/5 border-b border-sky-500/15">
                <CardTitle className="text-sky-300 flex justify-between items-center text-sm sm:text-base font-bold uppercase tracking-wider">
                  <span>Fleet Consumption Summary</span>
                  <span className="text-xs bg-sky-950 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono">{vehicles.length} Vehicles</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-0 sm:px-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1f2937] text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Vehicle</th>
                        <th className="py-3 px-2 text-center">Entries</th>
                        <th className="py-3 px-2 text-right">Fuel added</th>
                        <th className="py-3 px-2 text-right">Distance</th>
                        <th className="py-3 px-3 text-right text-orange-400">Consumption</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2937]/50">
                      {vehicleStats.map(v => (
                        <tr key={v.id} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-100">{v.registrationNumber}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{v.type}</p>
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300">{v.count}</td>
                          <td className="py-3 px-2 text-right font-mono text-slate-300">{v.totalLiters.toFixed(1)} L</td>
                          <td className="py-3 px-2 text-right font-mono text-slate-300">
                            {v.count >= 2 ? `${v.distance.toLocaleString()} km` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-orange-400">
                            {v.count >= 2 ? (
                              <span className="bg-orange-500/10 border border-orange-500/15 px-2 py-0.5 rounded text-[11px]">
                                {v.avgConsumption.toFixed(2)} km/L
                              </span>
                            ) : (
                              <span className="text-slate-500 font-normal italic">Needs {2 - v.count} more log{v.count === 1 ? '' : 's'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Fuel Log History Card */}
            <Card className="border-white/5 bg-[#0d1425]/40">
              <CardHeader className="border-b border-white/5 bg-slate-900/15">
                <CardTitle className="text-slate-200 flex items-center justify-between text-sm sm:text-base font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-400" />
                    Refueling Log History
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleExportFuelCSV}
                      className="text-[10px] sm:text-[11px] flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded transition-colors cursor-pointer uppercase tracking-wider normal-case"
                      title="Download fuel logs as CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-normal normal-case">Recent Logs</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-0 sm:px-4">
                {fuelRecords.length === 0 ? (
                  <div className="text-slate-500 text-center py-8 text-xs italic">
                    No fuel transactions recorded in the system yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[450px] overflow-y-auto pr-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1f2937] text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="py-3 px-3">Vehicle</th>
                          <th className="py-3 px-2">Fueling Time</th>
                          <th className="py-3 px-2 text-right">Liters</th>
                          <th className="py-3 px-2 text-right">Meter Reading</th>
                          <th className="py-3 px-2 text-right">Cost</th>
                          <th className="py-3 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2937]/50">
                        {fuelRecords.map(r => (
                          <tr key={r.id} className="hover:bg-slate-800/15 transition-colors">
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-200">{r.vehicleRegistration}</p>
                              <p className="text-[9px] text-slate-500 font-medium">Recorded by: {r.recordedByName}</p>
                            </td>
                            <td className="py-3 px-2 text-slate-400">
                              <p>{new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                              <p className="text-[10px] font-mono">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-slate-100 font-semibold">{r.liters.toFixed(2)} L</td>
                            <td className="py-3 px-2 text-right font-mono text-slate-300">{r.odometer.toLocaleString()} km</td>
                            <td className="py-3 px-2 text-right font-mono text-emerald-400 font-medium">
                              {r.cost ? `LKR ${r.cost.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button 
                                onClick={() => handleDeleteFuelRecord(r.id)}
                                className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Delete Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderComplianceDashboard = () => {
    const currentTime = Date.now();
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;

    // 1. Calculate active notifications for expirations (<= 10 days, or already expired)
    const activeAlerts: { 
      vehicleId: string;
      vehicleReg: string; 
      type: 'revenue' | 'insurance' | 'both'; 
      daysLeftRev?: number; 
      daysLeftIns?: number; 
      isExpiredRev?: boolean; 
      isExpiredIns?: boolean;
    }[] = [];

    complianceRecords.forEach(record => {
      const revDiff = record.revenueLicenseExpiry - currentTime;
      const insDiff = record.insuranceExpiry - currentTime;
      
      const revAlert = revDiff <= tenDaysMs;
      const insAlert = insDiff <= tenDaysMs;
      
      if (revAlert || insAlert) {
        activeAlerts.push({
          vehicleId: record.vehicleId,
          vehicleReg: record.vehicleRegistration,
          type: (revAlert && insAlert) ? 'both' : revAlert ? 'revenue' : 'insurance',
          daysLeftRev: revDiff > 0 ? Math.ceil(revDiff / (24 * 60 * 60 * 1000)) : undefined,
          daysLeftIns: insDiff > 0 ? Math.ceil(insDiff / (24 * 60 * 60 * 1000)) : undefined,
          isExpiredRev: revDiff < 0,
          isExpiredIns: insDiff < 0
        });
      }
    });

    // 2. Compliance Metrics & Analytics
    const totalValuation = complianceRecords.reduce((sum, r) => sum + (Number(r.valuationAmount) || 0), 0);
    const totalAccidents = accidentRecords.length;
    const pendingClaims = accidentRecords.filter(r => r.hasClaim && r.claimStatus === 'pending').length;
    const totalClaimsApprovedAmount = accidentRecords.reduce((sum, r) => sum + (Number(r.claimAmountApproved) || 0), 0);

    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
        
        {/* LEFT COLUMN: Controls & Form Entries */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Notifications & Expiry Alerts Section */}
          <Card className={`border-rose-500/20 bg-gradient-to-b from-[#1c0f16]/40 to-[#0d1425]/40 overflow-hidden relative ${activeAlerts.length > 0 ? 'ring-1 ring-rose-500/30' : ''}`}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 animate-pulse" />
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-rose-400 flex items-center gap-2 text-sm sm:text-base font-bold uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 animate-bounce" />
                Active Expiry Alerts ({activeAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="text-slate-400 text-center py-6 text-xs flex flex-col items-center gap-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 opacity-80" />
                  <span>All vehicles are 100% compliant. No expirations due within 10 days.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {activeAlerts.map((alert, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#070b14]/80 border border-rose-500/10 hover:border-rose-500/30 transition-all text-xs flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-200 uppercase">{alert.vehicleReg}</div>
                        <div className="text-[10px] text-slate-400">
                          {alert.type === 'both' ? (
                            <span className="text-rose-400 font-medium">License & Insurance Expiring</span>
                          ) : alert.type === 'revenue' ? (
                            <span>Revenue License Expiry</span>
                          ) : (
                            <span>Insurance Policy Expiry</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        {alert.isExpiredRev || alert.isExpiredIns ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/30">
                            Renew in {alert.daysLeftRev ?? alert.daysLeftIns} Days
                          </span>
                        )}
                        <button 
                          onClick={() => {
                            setCompVehicleId(alert.vehicleId);
                            const rec = complianceRecords.find(r => r.vehicleId === alert.vehicleId);
                            if (rec) {
                              setCompRevNo(rec.revenueLicenseNo || '');
                              setCompRevExpiry(new Date(rec.revenueLicenseExpiry).toISOString().split('T')[0]);
                              setCompRevFee(rec.revenueLicenseFee?.toString() || '');
                              setCompInsProvider(rec.insuranceProvider || '');
                              setCompInsPolicy(rec.insurancePolicyNo || '');
                              setCompInsExpiry(new Date(rec.insuranceExpiry).toISOString().split('T')[0]);
                              setCompInsPremium(rec.insurancePremium?.toString() || '');
                              setCompValAmount(rec.valuationAmount?.toString() || '');
                              setCompValCompany(rec.valuationCompany || '');
                              if (rec.valuationDate) {
                                setCompValDate(new Date(rec.valuationDate).toISOString().split('T')[0]);
                              }
                            }
                            toast.info(`Loaded registration details for ${alert.vehicleReg}`);
                          }}
                          className="text-[10px] text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
                        >
                          Quick Renew
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Card: Record Vehicle Compliance */}
          <Card className="border-emerald-500/10 bg-[#0d1425]/40">
            <CardHeader className="pb-3 border-b border-white/5 bg-emerald-500/[0.02]">
              <CardTitle className="text-emerald-400 flex items-center gap-2 text-sm sm:text-base font-bold uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                Setup / Renew Vehicle Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveCompliance} className="space-y-4 text-xs">
                
                {/* Vehicle Selector */}
                <div>
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Target Vehicle</label>
                  <select
                    required
                    value={compVehicleId}
                    onChange={e => {
                      setCompVehicleId(e.target.value);
                      // Auto-populate form if compliance record exists for this vehicle
                      const existingRecord = complianceRecords.find(r => r.vehicleId === e.target.value);
                      if (existingRecord) {
                        setCompRevNo(existingRecord.revenueLicenseNo || '');
                        setCompRevExpiry(new Date(existingRecord.revenueLicenseExpiry).toISOString().split('T')[0]);
                        setCompRevFee(existingRecord.revenueLicenseFee?.toString() || '');
                        setCompInsProvider(existingRecord.insuranceProvider || '');
                        setCompInsPolicy(existingRecord.insurancePolicyNo || '');
                        setCompInsExpiry(new Date(existingRecord.insuranceExpiry).toISOString().split('T')[0]);
                        setCompInsPremium(existingRecord.insurancePremium?.toString() || '');
                        setCompValAmount(existingRecord.valuationAmount?.toString() || '');
                        setCompValCompany(existingRecord.valuationCompany || '');
                        if (existingRecord.valuationDate) {
                          setCompValDate(new Date(existingRecord.valuationDate).toISOString().split('T')[0]);
                        }
                        toast.info("Auto-loaded existing compliance profile!");
                      } else {
                        // Clear fields
                        setCompRevNo('');
                        setCompRevExpiry('');
                        setCompRevFee('');
                        setCompInsProvider('');
                        setCompInsPolicy('');
                        setCompInsExpiry('');
                        setCompInsPremium('');
                        setCompValAmount('');
                        setCompValCompany('');
                      }
                    }}
                    className="w-full p-2.5 border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors uppercase font-bold"
                  >
                    <option value="">-- Select Fleet Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registrationNumber} ({v.type})</option>
                    ))}
                  </select>
                </div>

                {/* Section A: Revenue License Details */}
                <div className="p-3 rounded-lg border border-[#1f2937] bg-[#070b14]/40 space-y-3">
                  <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px] border-b border-white/5 pb-1">
                    Revenue License Details
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 uppercase tracking-wider block mb-1">License No</label>
                      <input 
                        type="text"
                        placeholder="RL-998811"
                        value={compRevNo}
                        onChange={e => setCompRevNo(e.target.value)}
                        className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 uppercase tracking-wider block mb-1">Expiry Date</label>
                      <input 
                        type="date"
                        required
                        value={compRevExpiry}
                        onChange={e => setCompRevExpiry(e.target.value)}
                        className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 uppercase tracking-wider block mb-1">Annual Fee (LKR)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 8500"
                      value={compRevFee}
                      onChange={e => setCompRevFee(e.target.value)}
                      className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Section B: Insurance Details */}
                <div className="p-3 rounded-lg border border-[#1f2937] bg-[#070b14]/40 space-y-3">
                  <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px] border-b border-white/5 pb-1">
                    Insurance Details
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 uppercase tracking-wider block mb-1">Provider</label>
                      <input 
                        type="text"
                        placeholder="Allianz / NITF"
                        value={compInsProvider}
                        onChange={e => setCompInsProvider(e.target.value)}
                        className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 uppercase tracking-wider block mb-1">Policy No</label>
                      <input 
                        type="text"
                        placeholder="POL-55442"
                        value={compInsPolicy}
                        onChange={e => setCompInsPolicy(e.target.value)}
                        className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 uppercase tracking-wider block mb-1">Premium Cost (LKR)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 145000"
                        value={compInsPremium}
                        onChange={e => setCompInsPremium(e.target.value)}
                        className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 uppercase tracking-wider block mb-1">Expiry Date</label>
                      <input 
                        type="date"
                        required
                        value={compInsExpiry}
                        onChange={e => setCompInsExpiry(e.target.value)}
                        className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Annual Valuation Details */}
                <div className="p-3 rounded-lg border border-[#1f2937] bg-[#070b14]/40 space-y-3">
                  <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px] border-b border-white/5 pb-1">
                    Annual Valuation Details
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 uppercase tracking-wider block mb-1">Value Amount (LKR)</label>
                      <input 
                        type="number"
                        required
                        placeholder="e.g. 5200000"
                        value={compValAmount}
                        onChange={e => setCompValAmount(e.target.value)}
                        className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 uppercase tracking-wider block mb-1">Valuation Date</label>
                      <input 
                        type="date"
                        value={compValDate}
                        onChange={e => setCompValDate(e.target.value)}
                        className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 uppercase tracking-wider block mb-1">Valuation Company</label>
                    <input 
                      type="text"
                      placeholder="e.g. Sanken Valuers Ltd"
                      value={compValCompany}
                      onChange={e => setCompValCompany(e.target.value)}
                      className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                  disabled={isSavingComp}
                >
                  {isSavingComp ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving profile...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Save Compliance Details
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Form Card: Record Accident / Insurance Claim */}
          <Card className="border-rose-500/10 bg-[#0d1425]/40">
            <CardHeader className="pb-3 border-b border-white/5 bg-rose-500/[0.02]">
              <CardTitle className="text-rose-400 flex items-center gap-2 text-sm sm:text-base font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                Log Accident & Claim Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveAccident} className="space-y-4 text-xs">
                
                {/* Vehicle & Driver Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Vehicle</label>
                    <select
                      required
                      value={accVehicleId}
                      onChange={e => setAccVehicleId(e.target.value)}
                      className="w-full p-2.5 border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-200 focus:outline-none focus:border-rose-500 transition-colors uppercase font-bold text-xs"
                    >
                      <option value="">-- select --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.registrationNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Driver In Charge</label>
                    <select
                      value={accDriverId}
                      onChange={e => setAccDriverId(e.target.value)}
                      className="w-full p-2.5 border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-200 focus:outline-none focus:border-rose-500 transition-colors text-xs"
                    >
                      <option value="">-- select driver --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Accident Date</label>
                    <input 
                      type="date"
                      required
                      value={accDate}
                      onChange={e => setAccDate(e.target.value)}
                      className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 focus:outline-none focus:border-rose-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Accident Severity</label>
                    <select
                      value={accSeverity}
                      onChange={e => setAccSeverity(e.target.value as any)}
                      className="w-full p-2.5 border border-[#1f2937] rounded-lg bg-[#070b14] text-slate-200 focus:outline-none focus:border-rose-500 transition-colors capitalize text-xs"
                    >
                      <option value="minor">Minor Damage</option>
                      <option value="moderate">Moderate Damage</option>
                      <option value="major">Major / Critical Damage</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Location of Incident</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Katunayake Expressway, Colombo"
                    value={accLocation}
                    onChange={e => setAccLocation(e.target.value)}
                    className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Incident Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Provide details of accident cause and visual damages..."
                    value={accDescription}
                    onChange={e => setAccDescription(e.target.value)}
                    className="w-full p-2 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Toggle Insurance Claim */}
                <div className="p-3 rounded-lg border border-[#1f2937] bg-[#070b14]/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="accHasClaim"
                      checked={accHasClaim}
                      onChange={e => setAccHasClaim(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-500 border-slate-700 bg-[#070b14] focus:ring-rose-500 focus:ring-opacity-25"
                    />
                    <label htmlFor="accHasClaim" className="text-slate-200 font-bold uppercase tracking-wider text-[10px] select-none cursor-pointer">
                      File Insurance Claim?
                    </label>
                  </div>

                  {accHasClaim && (
                    <div className="space-y-3 pt-1 border-t border-white/5 animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-400 uppercase tracking-wider block mb-1">Claim Status</label>
                          <select
                            value={accClaimStatus}
                            onChange={e => setAccClaimStatus(e.target.value as any)}
                            className="w-full p-1.5 border border-[#1f2937] rounded bg-[#070b14] text-slate-200 focus:outline-none focus:border-rose-500 text-xs"
                          >
                            <option value="none">None</option>
                            <option value="pending">Pending Review</option>
                            <option value="approved">Approved & Paid</option>
                            <option value="rejected">Rejected / Closed</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-400 uppercase tracking-wider block mb-1">Insurance Ref No</label>
                          <input 
                            type="text"
                            placeholder="REF-INS-981"
                            value={accInsRef}
                            onChange={e => setAccInsRef(e.target.value)}
                            className="w-full p-1.5 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 placeholder-slate-600 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-400 uppercase tracking-wider block mb-1">Amt Claimed (LKR)</label>
                          <input 
                            type="number"
                            placeholder="e.g. 450000"
                            value={accClaimRequested}
                            onChange={e => setAccClaimRequested(e.target.value)}
                            className="w-full p-1.5 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 uppercase tracking-wider block mb-1">Amt Paid (LKR)</label>
                          <input 
                            type="number"
                            placeholder="e.g. 380000"
                            value={accClaimApproved}
                            onChange={e => setAccClaimApproved(e.target.value)}
                            className="w-full p-1.5 border border-[#1f2937] rounded bg-[#070b14] text-slate-100 focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                  disabled={isSavingAcc}
                >
                  {isSavingAcc ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Logging accident...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Log Accident Record
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN: Executive Ledger Logs & Reports */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Executive Summary Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <Card className="border-[#1f2937] bg-slate-900/40 p-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Fleet Valuation</span>
                <p className="text-base sm:text-lg font-bold text-emerald-400 font-mono">LKR {totalValuation.toLocaleString()}</p>
                <span className="text-[9px] text-slate-500 block">Total active capital assets</span>
              </div>
            </Card>

            <Card className="border-[#1f2937] bg-slate-900/40 p-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Total Incidents</span>
                <p className="text-base sm:text-lg font-bold text-rose-400 font-mono">{totalAccidents} Records</p>
                <span className="text-[9px] text-slate-500 block">Accidents logged in database</span>
              </div>
            </Card>

            <Card className="border-[#1f2937] bg-slate-900/40 p-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Pending Claims</span>
                <p className="text-base sm:text-lg font-bold text-amber-400 font-mono">{pendingClaims} Claims</p>
                <span className="text-[9px] text-slate-500 block">Awaiting provider processing</span>
              </div>
            </Card>

            <Card className="border-[#1f2937] bg-slate-900/40 p-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Claims Recovered</span>
                <p className="text-base sm:text-lg font-bold text-sky-400 font-mono">LKR {totalClaimsApprovedAmount.toLocaleString()}</p>
                <span className="text-[9px] text-slate-500 block">Total payouts received</span>
              </div>
            </Card>

          </div>

          {/* Compliance & Registration Profile Table */}
          <Card className="border-[#1e293b] bg-[#0d1425]/40">
            <CardHeader className="bg-slate-900/30 border-b border-white/5 pb-3">
              <CardTitle className="text-slate-300 text-sm sm:text-base font-bold uppercase tracking-wider flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>Fleet Compliance Registry</span>
                  <span className="text-xs font-mono font-normal bg-slate-800 text-slate-400 border border-white/5 px-2.5 py-0.5 rounded-full">
                    {complianceRecords.length} Profiles
                  </span>
                </div>
                {complianceRecords.length > 0 && (
                  <button 
                    onClick={handleExportComplianceCSV}
                    className="text-[10px] sm:text-[11px] flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded transition-colors cursor-pointer uppercase tracking-wider normal-case animate-fade-in"
                    title="Download fleet compliance registry as CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-0 sm:px-4">
              {complianceRecords.length === 0 ? (
                <div className="text-slate-500 text-center py-12 text-xs">
                  No vehicle compliance profiles setup yet.<br />
                  Use the left form to save the active Revenue License & Insurance Details for vehicles.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1f2937] text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Vehicle</th>
                        <th className="py-3 px-2">Revenue License Status</th>
                        <th className="py-3 px-2">Insurance Status</th>
                        <th className="py-3 px-2 text-right">Premium / Cost</th>
                        <th className="py-3 px-2 text-right">Latest Valuation</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2937]/50">
                      {complianceRecords.map(r => {
                        const revTimeLeft = r.revenueLicenseExpiry - currentTime;
                        const insTimeLeft = r.insuranceExpiry - currentTime;

                        const isRevExp = revTimeLeft < 0;
                        const isRevAlert = revTimeLeft > 0 && revTimeLeft <= tenDaysMs;
                        const isInsExp = insTimeLeft < 0;
                        const isInsAlert = insTimeLeft > 0 && insTimeLeft <= tenDaysMs;

                        return (
                          <tr key={r.id} className="hover:bg-slate-800/10 transition-colors">
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-slate-200 uppercase tracking-wider font-mono block">{r.vehicleRegistration}</span>
                              <span className="text-[10px] text-slate-500">Valued: {r.valuationCompany || 'N/A'}</span>
                            </td>
                            <td className="py-3.5 px-2">
                              <div className="space-y-1">
                                <div className="font-mono text-[10px] text-slate-300">No: {r.revenueLicenseNo}</div>
                                {isRevExp ? (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                                    EXPIRED
                                  </span>
                                ) : isRevAlert ? (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                                    EXPIRES IN {Math.ceil(revTimeLeft / (24 * 60 * 60 * 1000))}D
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                    OK - {new Date(r.revenueLicenseExpiry).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-2">
                              <div className="space-y-1">
                                <div className="font-mono text-[10px] text-slate-300">{r.insuranceProvider} ({r.insurancePolicyNo})</div>
                                {isInsExp ? (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                                    EXPIRED
                                  </span>
                                ) : isInsAlert ? (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                                    EXPIRES IN {Math.ceil(insTimeLeft / (24 * 60 * 60 * 1000))}D
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                    OK - {new Date(r.insuranceExpiry).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-2 text-right font-mono text-slate-300">
                              LKR {r.insurancePremium ? r.insurancePremium.toLocaleString() : '0'}
                            </td>
                            <td className="py-3.5 px-2 text-right font-mono text-slate-200 font-bold">
                              LKR {r.valuationAmount ? r.valuationAmount.toLocaleString() : '0'}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <div className="flex justify-center gap-1.5">
                                <button 
                                  onClick={() => {
                                    setCompVehicleId(r.vehicleId);
                                    setCompRevNo(r.revenueLicenseNo || '');
                                    setCompRevExpiry(new Date(r.revenueLicenseExpiry).toISOString().split('T')[0]);
                                    setCompRevFee(r.revenueLicenseFee?.toString() || '');
                                    setCompInsProvider(r.insuranceProvider || '');
                                    setCompInsPolicy(r.insurancePolicyNo || '');
                                    setCompInsExpiry(new Date(r.insuranceExpiry).toISOString().split('T')[0]);
                                    setCompInsPremium(r.insurancePremium?.toString() || '');
                                    setCompValAmount(r.valuationAmount?.toString() || '');
                                    setCompValCompany(r.valuationCompany || '');
                                    if (r.valuationDate) {
                                      setCompValDate(new Date(r.valuationDate).toISOString().split('T')[0]);
                                    }
                                    toast.success(`Loaded details for ${r.vehicleRegistration}`);
                                  }}
                                  className="text-sky-400 hover:text-sky-300 p-1 rounded hover:bg-sky-500/10 transition-colors cursor-pointer"
                                  title="Edit / Renew"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCompliance(r.vehicleId)}
                                  className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accident & Insurance Claim History Ledger */}
          <Card className="border-[#1e293b] bg-[#0d1425]/40">
            <CardHeader className="bg-slate-900/30 border-b border-white/5 pb-3">
              <CardTitle className="text-slate-300 text-sm sm:text-base font-bold uppercase tracking-wider flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>Accident & Insurance Claims History</span>
                  <span className="text-xs font-mono font-normal bg-slate-800 text-slate-400 border border-white/5 px-2.5 py-0.5 rounded-full">
                    {accidentRecords.length} Events
                  </span>
                </div>
                {accidentRecords.length > 0 && (
                  <button 
                    onClick={handleExportAccidentCSV}
                    className="text-[10px] sm:text-[11px] flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded transition-colors cursor-pointer uppercase tracking-wider normal-case animate-fade-in"
                    title="Download accident & claims registry as CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-0 sm:px-4">
              {accidentRecords.length === 0 ? (
                <div className="text-slate-500 text-center py-12 text-xs">
                  No accident or insurance claim logs in the system yet.<br />
                  Use the left form to document fleet accidents and link insurance recoveries.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1f2937] text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Date & Vehicle</th>
                        <th className="py-3 px-2">Driver</th>
                        <th className="py-3 px-2">Severity & Damage</th>
                        <th className="py-3 px-2">Insurance Claim</th>
                        <th className="py-3 px-2 text-right">Requested / Approved</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2937]/50">
                      {[...accidentRecords]
                        .sort((a, b) => b.accidentDate - a.accidentDate)
                        .map(r => (
                          <tr key={r.id} className="hover:bg-slate-800/10 transition-colors">
                            <td className="py-3.5 px-3">
                              <span className="font-mono text-slate-400 block">{new Date(r.accidentDate).toLocaleDateString()}</span>
                              <span className="font-bold text-slate-200 uppercase tracking-wider font-mono">{r.vehicleRegistration}</span>
                              <span className="text-[10px] text-slate-500 block mt-0.5 font-sans italic">{r.location}</span>
                            </td>
                            <td className="py-3.5 px-2 text-slate-300 font-medium">
                              {r.driverName}
                            </td>
                            <td className="py-3.5 px-2">
                              <div className="space-y-1">
                                {r.severity === 'major' ? (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    MAJOR
                                  </span>
                                ) : r.severity === 'moderate' ? (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    MODERATE
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-700 text-slate-300">
                                    MINOR
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 block max-w-[200px] truncate" title={r.description}>
                                  {r.description}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-2">
                              {r.hasClaim ? (
                                <div className="space-y-1">
                                  <div className="text-[10px] text-slate-400 font-mono">Ref: {r.insuranceRefNo || 'N/A'}</div>
                                  {r.claimStatus === 'approved' ? (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      APPROVED
                                    </span>
                                  ) : r.claimStatus === 'pending' ? (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                      PENDING
                                    </span>
                                  ) : r.claimStatus === 'rejected' ? (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-500/20 text-red-300 border border-red-500/30">
                                      REJECTED
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-700 text-slate-400">
                                      NONE
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">No claim filed</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-right">
                              {r.hasClaim ? (
                                <div className="font-mono">
                                  <div className="text-slate-400">Req: LKR {r.claimAmountRequested ? r.claimAmountRequested.toLocaleString() : '0'}</div>
                                  <div className="text-emerald-400 font-bold">Paid: LKR {r.claimAmountApproved ? r.claimAmountApproved.toLocaleString() : '0'}</div>
                                </div>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <button 
                                onClick={() => handleDeleteAccident(r.id)}
                                className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Delete Accident Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    );
  };

  return (
    <Layout title="Admin Control Center">
      {/* Real-time Dynamic Operations News Ticker Bar */}
      {renderNewsBar()}

      {/* Dynamic Segmented Navigation Tabs */}
      <div className="flex border-b border-white/5 mb-6 gap-6 relative z-10">
        <button 
          onClick={() => setActiveTab('dispatch')}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'dispatch' 
              ? 'border-sky-500 text-sky-400 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          Dispatch Board
        </button>
        <button 
          onClick={() => setActiveTab('fuel')}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'fuel' 
              ? 'border-orange-500 text-orange-400 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
          }`}
        >
          <Fuel className="w-4 h-4" />
          Fuel & Consumption
        </button>
        <button 
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'compliance' 
              ? 'border-rose-500 text-rose-450 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Compliance & Claims
        </button>
      </div>

      {activeTab === 'dispatch' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
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
                      const todayStr = new Date().toISOString().split('T')[0];
                      if (a === todayStr) return -1;
                      if (b === todayStr) return 1;
                      return b.localeCompare(a);
                    });
                    
                    return sortedDates.map(date => {
                      const isToday = date === new Date().toISOString().split('T')[0];
                      const isTomorrow = date === new Date(Date.now() + 86400000).toISOString().split('T')[0];
                      const dateLabel = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : date;
                      const groupKey = `pending-${date}`;
                      const defaultExpanded = isToday || isTomorrow;
                      const isExpanded = expandedDates[groupKey] !== undefined ? expandedDates[groupKey] : defaultExpanded;
                      const isCollapsed = !isExpanded;
                      
                      return (
                        <div key={date} className="mb-6 last:mb-0 animate-in fade-in duration-500">
                          <div 
                            className="flex items-center gap-3 mb-4 select-none cursor-pointer group/date"
                            onClick={() => handleToggleDate(groupKey, defaultExpanded)}
                          >
                            <div className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded flex items-center gap-2 transition-colors
                              ${isToday ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse' : 
                                isTomorrow ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50' : 
                                'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'}`}>
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
                              {dateLabel}
                              <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="h-px bg-slate-800 flex-1"></div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider group-hover/date:text-slate-400 transition-colors">
                              {groups[date].length} Bookings {isCollapsed ? '(Click to expand)' : '(Click to collapse)'}
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
                      const todayStr = new Date().toISOString().split('T')[0];
                      if (a === todayStr) return -1;
                      if (b === todayStr) return 1;
                      return b.localeCompare(a);
                    });
                    
                    return sortedDates.map(date => {
                      const isToday = date === new Date().toISOString().split('T')[0];
                      const isTomorrow = date === new Date(Date.now() + 86400000).toISOString().split('T')[0];
                      const dateLabel = isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : date;
                      const groupKey = `active-${date}`;
                      const defaultExpanded = isToday || isTomorrow;
                      const isExpanded = expandedDates[groupKey] !== undefined ? expandedDates[groupKey] : defaultExpanded;
                      const isCollapsed = !isExpanded;
                      
                      return (
                        <div key={date} className="mb-6 last:mb-0 animate-in fade-in duration-500">
                          <div 
                            className="flex items-center gap-3 mb-4 select-none cursor-pointer group/date"
                            onClick={() => handleToggleDate(groupKey, defaultExpanded)}
                          >
                            <div className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded flex items-center gap-2 transition-colors
                              ${isToday ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse' : 
                                isTomorrow ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50' : 
                                'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'}`}>
                              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
                              {dateLabel}
                              <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="h-px bg-slate-800 flex-1"></div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider group-hover/date:text-slate-400 transition-colors">
                              {groups[date].length} Active Bookings {isCollapsed ? '(Click to expand)' : '(Click to collapse)'}
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
                          const groupKey = `completed-${date}`;
                          const defaultExpanded = isToday || isTomorrow;
                          const isExpanded = expandedDates[groupKey] !== undefined ? expandedDates[groupKey] : defaultExpanded;
                          const isCollapsed = !isExpanded;
                          
                          return (
                            <div key={date} className="mb-6 last:mb-0 animate-in fade-in duration-500">
                              <div 
                                className="flex items-center gap-3 mb-4 select-none cursor-pointer group/date"
                                onClick={() => handleToggleDate(groupKey, defaultExpanded)}
                              >
                                <div className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded flex items-center gap-2 transition-colors
                                  ${isToday ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse' : 
                                    isTomorrow ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50' : 
                                    'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'}`}>
                                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
                                  {dateLabel}
                                  <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`} />
                                </div>
                                <div className="h-px bg-slate-800/50 flex-1"></div>
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider group-hover/date:text-slate-400 transition-colors">
                                  {groups[date].length} Bookings {isCollapsed ? '(Click to expand)' : '(Click to collapse)'}
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
      ) : activeTab === 'fuel' ? (
        <div className="animate-in fade-in duration-300">
          {renderFuelDashboard()}
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {renderComplianceDashboard()}
        </div>
      )}

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
