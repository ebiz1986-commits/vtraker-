import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ChevronDown, ArrowRight, MapPin, Clock, Info, Edit, Check, X, ShieldAlert, Zap, Car, Navigation } from 'lucide-react';
import { TripItemSkeleton, Skeleton } from '../components/ui/Skeleton';

const TripItem = ({ 
  trip, 
  index, 
  handleUpdateStatus, 
  isNormalFlow, 
  driverOdoValues, 
  setDriverOdoValues, 
  handleStartTripWithOdo, 
  handleEndTripWithOdo,
  lastOdo,
  loadingStart,
  handleStartTripAuto
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;

  const startOdometerVal = Number(trip.startOdometer) || 0;

  // Real-time local validations
  // 1. Start Odometer Validation (For Allocated status)
  const startOdoStr = driverOdoValues[trip.id] || '';
  const startOdoNum = Number(startOdoStr);
  const startOdoError = startOdoStr && (isNaN(startOdoNum) || startOdoNum <= 0)
    ? "Odometer must be greater than 0 KM."
    : startOdoStr && startOdoNum > 999999
    ? "Plausible odometer limit is 999,999 KM."
    : null;

  // 2. End Odometer Validation (For In Progress status)
  const endOdoStr = driverOdoValues[trip.id] !== undefined ? driverOdoValues[trip.id] : String(trip.startOdometer || '');
  const endOdoNum = Number(endOdoStr);
  const endOdoError = endOdoStr && (isNaN(endOdoNum) || endOdoNum < startOdometerVal)
    ? `End odometer cannot be less than start odometer (${startOdometerVal} KM).`
    : endOdoStr && endOdoNum > 999999
    ? "Odometer reading is unrealistically large (> 999,999 KM)."
    : null;

  const distanceTraveled = endOdoNum - startOdometerVal;
  const endOdoWarning = endOdoStr && !endOdoError && distanceTraveled > 350
    ? `High distance alert: Trip is ${distanceTraveled} KM. Please verify.`
    : endOdoStr && !endOdoError && distanceTraveled === 0
    ? "Warning: Distance traveled is 0 KM."
    : null;
  
  return (
    <>
      <motion.div 
        id={`trip-card-${trip.id}`}
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
          
          <div className="flex flex-col gap-3">
            {isNormalFlow ? (
              <div className="w-full space-y-3">
                {trip.status === 'allocated' && (
                  <div className="flex flex-col gap-3 p-4 bg-orange-600/5 border border-orange-500/20 rounded-xl w-full">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider">Start Odometer (Auto-filled)</span>
                      <span className="font-mono text-amber-500 font-bold text-sm bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20">
                        {lastOdo !== undefined ? `${lastOdo} KM` : 'Detecting...'}
                      </span>
                    </div>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35 }}
                      className="p-3 bg-red-950/45 border border-red-500/30 rounded-lg text-red-200 text-left space-y-1.5 shadow-md shadow-black/30"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-red-400">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                        අවධානය යොමු කරන්න / Important Notice
                      </div>
                      <p className="text-[12.5px] font-bold leading-relaxed text-red-350">
                        කරුණාකර ස්ටාර්ට් බටන් (Start Trip) එක එබීමට පෙර, වාහනයේ මීටරය ඇප් එකේ මීටරය සමඟ පරීක්ෂා කරන්න. එය නොගැලපේ නම්, කරුණාකර ඇඩ්මින් (Admin) සම්බන්ධ කර එය නිවැරදි කරවා ගන්න.
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        (Before pushing the start button, please check the vehicle meter with app odometer. If not matching, contact Admin and get it corrected.)
                      </p>
                    </motion.div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 leading-normal">
                      <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span>The journey will automatically log at the last recorded vehicle ending odometer.</span>
                    </div>
                    
                    <Button 
                      disabled={loadingStart || lastOdo === undefined}
                      className={`w-full mt-1 font-semibold py-3 text-base shadow-lg rounded-lg transition-all active:scale-[0.98] cursor-pointer bg-blue-600 hover:bg-blue-700 text-white`}
                      onClick={async () => {
                        await handleStartTripAuto(trip.id, trip.vehicleId);
                        setExpanded(false);
                      }}
                    >
                      {loadingStart ? 'Retrieving odometer & starting...' : 'Start Trip'}
                    </Button>
                  </div>
                )}
                {trip.status === 'driver_started' && (
                  <div className="p-4 w-full bg-amber-900/20 text-amber-500 border border-amber-900/50 rounded flex flex-col gap-2.5 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>Transitioning to in-progress... (Normal Flow active)</span>
                    </div>
                    <Button 
                      disabled={loadingStart || lastOdo === undefined}
                      size="lg" 
                      className="bg-blue-600 hover:bg-blue-700 h-auto py-3 text-base text-white font-semibold rounded-lg"
                      onClick={async () => {
                        await handleStartTripAuto(trip.id, trip.vehicleId);
                        setExpanded(false);
                      }}
                    >
                      {loadingStart ? 'Transitioning...' : 'Force Start Trip'}
                    </Button>
                  </div>
                )}
                {trip.status === 'in_progress' && (
                  <div className="w-full text-center">
                    <Button 
                      className="w-full font-bold py-4 text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-950/50 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                      onClick={() => setShowEndModal(true)}
                    >
                      <Check className="w-5 h-5 animate-pulse" /> End Trip (Complete Booking)
                    </Button>
                  </div>
                )}
                {trip.status === 'driver_ended' && (
                  <div className="p-4 w-full bg-amber-900/20 text-amber-500 border border-amber-900/50 rounded flex flex-col gap-2.5 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>Finishing trip... (Normal Flow active)</span>
                    </div>
                    <Button 
                      size="lg" 
                      className="bg-emerald-600 hover:bg-emerald-700 h-auto py-3 text-base text-white font-semibold rounded-lg"
                      onClick={() => handleEndTripWithOdo(trip.id, Number(trip.startOdometer) || 0, trip.endOdometer || "0")}
                    >
                      Force Complete Trip
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-3 w-full flex-col">
                {trip.status === 'allocated' && (
                  <div className="flex flex-col gap-3 p-4 bg-orange-600/5 border border-orange-500/20 rounded-xl w-full">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider">Start Odometer (Auto-filled)</span>
                      <span className="font-mono text-amber-500 font-bold text-sm bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20">
                        {lastOdo !== undefined ? `${lastOdo} KM` : 'Detecting...'}
                      </span>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35 }}
                      className="p-3 bg-red-950/45 border border-red-500/30 rounded-lg text-red-200 text-left space-y-1.5 shadow-md shadow-black/30"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-red-400">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                        අවධානය යොමු කරන්න / Important Notice
                      </div>
                      <p className="text-[12.5px] font-bold leading-relaxed text-red-350">
                        කරුණාකර ස්ටාර්ට් බටන් (Start Trip) එක එබීමට පෙර, වාහනයේ මීටරය ඇප් එකේ මීටරය සමඟ පරීක්ෂා කරන්න. එය නොගැලපේ නම්, කරුණාකර ඇඩ්මින් (Admin) සම්බන්ධ කර එය නිවැරදි කරවා ගන්න.
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        (Before pushing the start button, please check the vehicle meter with app odometer. If not matching, contact Admin and get it corrected.)
                      </p>
                    </motion.div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 leading-normal">
                      <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span>Starts automatically with the last recorded vehicle ending odometer.</span>
                    </div>
                    
                    <Button 
                      disabled={loadingStart || lastOdo === undefined}
                      className="w-full mt-1 font-semibold py-3 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg transition-all active:scale-[0.98] cursor-pointer" 
                      onClick={async () => {
                        await handleStartTripAuto(trip.id, trip.vehicleId);
                        setExpanded(false);
                      }}
                    >
                      {loadingStart ? 'Starting Trip...' : 'Start Trip'}
                    </Button>
                  </div>
                )}
                {trip.status === 'driver_started' && (
                  <div className="p-4 w-full bg-amber-900/20 text-amber-500 border border-amber-900/50 rounded flex items-center justify-center gap-2 text-sm font-medium w-full">
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
                  <div className="p-4 w-full bg-amber-900/20 text-amber-500 border border-amber-900/50 rounded flex items-center justify-center gap-2 text-sm font-medium w-full">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Waiting for passenger to enter End Odometer...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>

    {showEndModal && (
      <div id={`end-trip-modal-${trip.id}`} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-4"
        >
          {/* Modal Header */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Complete Active Trip
              </h3>
              <p className="text-xs text-slate-400 mt-1">Please log the final ending odometer value to close the booking.</p>
            </div>
            <button 
              type="button"
              onClick={() => setShowEndModal(false)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Trip Summary Details */}
          <div className="text-xs bg-slate-950/60 p-3.5 border border-slate-850 rounded-xl space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold uppercase">Passenger:</span>
              <span className="text-blue-300 font-bold">
                {(!trip.passengerName || trip.passengerName === 'Unknown' || trip.passengerName === 'Unknown User') ? 'Sanken User' : trip.passengerName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold uppercase">Destination:</span>
              <span className="text-slate-200 font-medium truncate max-w-[200px]">{destination}</span>
            </div>
            <div className="h-px bg-slate-800 my-1"></div>
            <div className="flex justify-between items-center">
              <span className="text-[#ff9900] font-bold uppercase tracking-wider text-[10px]">Start Odometer Saved:</span>
              <span className="font-mono text-[#ff9900] font-bold text-sm bg-[#ff9900]/10 px-2.5 py-1 rounded border border-[#ff9900]/25">{startOdometerVal} KM</span>
            </div>
          </div>

          {/* Input & Validations */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Ending Odometer (KM)</label>
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="e.g. 15120"
              className={`input-field font-mono text-base py-3 px-4 bg-slate-950/80 w-full text-slate-100 rounded-xl border ${
                endOdoError 
                  ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-red-300' 
                  : endOdoWarning 
                  ? 'border-amber-500/85 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-amber-300' 
                  : 'border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
              }`}
              value={driverOdoValues[trip.id] !== undefined ? driverOdoValues[trip.id] : String(trip.startOdometer || '')}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '');
                setDriverOdoValues({...driverOdoValues, [trip.id]: clean});
              }}
              autoFocus
            />
            
            {endOdoError && (
              <span className="text-[11px] text-red-400 font-semibold text-left flex items-center gap-1 leading-tight mt-1 animate-in fade-in">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {endOdoError}
              </span>
            )}
            {endOdoWarning && (
              <span className="text-[11px] text-amber-400 font-semibold text-left flex items-center gap-1 leading-tight mt-1 animate-pulse">
                <Info className="w-3.5 h-3.5 shrink-0" />
                {endOdoWarning}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline"
              className="flex-1 py-3 border-white/10 hover:bg-white/5 text-slate-300 rounded-xl font-bold cursor-pointer"
              onClick={() => setShowEndModal(false)}
            >
              Cancel
            </Button>
            <Button 
              disabled={!!endOdoError}
              className={`flex-1 font-bold py-3 text-base shadow-lg rounded-xl transition-all ${
                !!endOdoError
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20 active:scale-[0.98] cursor-pointer'
              }`}
              onClick={async () => {
                const finalOdoVal = driverOdoValues[trip.id] !== undefined ? driverOdoValues[trip.id] : String(trip.startOdometer || '');
                await handleEndTripWithOdo(trip.id, Number(trip.startOdometer) || 0, finalOdoVal);
                setShowEndModal(false);
              }}
            >
              Complete Trip
            </Button>
          </div>
        </motion.div>
      </div>
    )}
    </>
  );
};

const isPinLikeName = (name: string) => {
  if (!name) return false;
  const cleaned = name.trim();
  return /^[a-zA-Z]{1,3}\d+$/.test(cleaned) || /^\d+$/.test(cleaned);
};

export default function DriverDashboard() {
  const { profile } = useAuth();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [lastOdoValues, setLastOdoValues] = useState<Record<string, number>>({});
  const [loadingStartTrip, setLoadingStartTrip] = useState<Record<string, boolean>>({});
  const [completedTripsCount, setCompletedTripsCount] = useState(0);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [completedHours, setCompletedHours] = useState('0.0');
  const [totalKmLogged, setTotalKmLogged] = useState(0);
  const [loading, setLoading] = useState(true);

  // Profile editing/renaming states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfileName, setTempProfileName] = useState('');

  useEffect(() => {
    if (profile) {
      setTempProfileName(profile.name || '');
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
        name: tempProfileName.trim()
      });
      setIsEditingProfile(false);
      toast.success("Driver display name updated successfully!");
    } catch (error) {
      console.error("Failed to update profile name:", error);
      toast.error("Failed to update profile.");
    }
  };

  // System settings dynamic toggle
  const [isNormalFlow, setIsNormalFlow] = useState<boolean>(true);
  const [driverOdoValues, setDriverOdoValues] = useState<Record<string, string>>({});

  const getLastOdometerForVehicle = async (vehicleId: string): Promise<number> => {
    if (!vehicleId) return 0;
    try {
      const q = query(
        collection(db, 'trips'),
        where('vehicleId', '==', vehicleId)
      );
      const snap = await getDocs(q);
      const tripsList = snap.docs.map(doc => doc.data());
      const completedTrips = tripsList
        .filter(t => t.status === 'completed' && t.endOdometer != null && !isNaN(Number(t.endOdometer)))
        .sort((a, b) => (Number(b.dropoffTime) || 0) - (Number(a.dropoffTime) || 0));
      
      if (completedTrips.length > 0) {
        return Number(completedTrips[0].endOdometer) || 0;
      }
    } catch (e) {
      console.error("Error getting last vehicle odometer:", e);
    }
    return 0;
  };

  const handleStartTripAuto = async (tripId: string, vehicleId: string) => {
    try {
      setLoadingStartTrip(prev => ({ ...prev, [tripId]: true }));
      const lastOdo = await getLastOdometerForVehicle(vehicleId);
      
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'in_progress',
        startOdometer: lastOdo,
        currentOdometer: lastOdo,
        expectedEndOdometer: lastOdo + 15,
        pickupTime: Date.now(),
        updatedAt: serverTimestamp()
      });
      toast.success(`ගමන සාර්ථකව ආරම්භ කරන ලදී! ඕඩොමීටරය ස්වයංක්‍රීයව ${lastOdo} KM ලෙස සටහන් විය. කරුණාකර වාහනයේ මීටරය සමඟ සසඳා නොගැලපේ නම් ඇඩ්මින් (Admin) සම්බන්ධ කර නිවැරදි කරගන්න.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    } finally {
      setLoadingStartTrip(prev => ({ ...prev, [tripId]: false }));
    }
  };

  useEffect(() => {
    const fetchOdos = async () => {
      const newOdos: Record<string, number> = {};
      for (const trip of activeTrips) {
        if (trip.status === 'allocated' && trip.vehicleId && lastOdoValues[trip.id] === undefined) {
          const lastOdo = await getLastOdometerForVehicle(trip.vehicleId);
          newOdos[trip.id] = lastOdo;
        }
      }
      if (Object.keys(newOdos).length > 0) {
        setLastOdoValues(prev => ({ ...prev, ...newOdos }));
      }
    };
    fetchOdos();
  }, [activeTrips]);

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

  const handleStartTripWithOdo = async (tripId: string, odoVal: string) => {
    if (!odoVal || isNaN(Number(odoVal))) {
      toast.error("කරුණාකර වලංගු ආරම්භක ඕඩොමීටර කියවීමක් (KM) ඇතුළත් කරන්න.");
      return;
    }
    const odometer = Number(odoVal);
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'in_progress',
        startOdometer: odometer,
        currentOdometer: odometer,
        expectedEndOdometer: odometer + 15,
        pickupTime: Date.now(),
        updatedAt: serverTimestamp()
      });
      toast.success("ගමන සාර්ථකව ආරම්භ කරන ලදී! ඕඩොමීටරය " + odometer + " KM ලෙස සටහන් විය.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const handleEndTripWithOdo = async (tripId: string, startOdo: number, odoVal: string) => {
    if (!odoVal || isNaN(Number(odoVal))) {
      toast.error("කරුණාකර වලංගු අවසාන ඕඩොමීටර කියවීමක් (KM) ඇතුළත් කරන්න.");
      return;
    }
    const odometer = Number(odoVal);
    if (odometer < startOdo) {
      const confirmed = window.confirm(`Warning: End odometer (${odometer} KM) is less than start odometer (${startOdo} KM). Are you sure?`);
      if (!confirmed) return;
    }
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'completed',
        endOdometer: odometer,
        dropoffTime: Date.now(),
        updatedAt: serverTimestamp()
      });
      toast.success("ගමන සාර්ථකව අවසන් කර වාර්තා කරන ලදී! අවසාන ඕඩොමීටරය: " + odometer + " KM.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
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
  
  const initialLoadRef = useRef(true);
  const prevTripStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!profile?.userId) return;
    
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
      
      const completed = tripsData.filter(t => t.status === 'completed');
      completed.sort((a, b) => (b.dropoffTime || b.pickupTime || 0) - (a.dropoffTime || a.pickupTime || 0)); // most recent first
      setCompletedTrips(completed);
      
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Driver Profile Card with Inline Name Editor */}
          {profile && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-xl border ${
                isPinLikeName(profile.name || '')
                  ? 'border-orange-500/30 bg-orange-500/5'
                  : 'bg-[#111827] border-[#1e293b]'
              } shadow-xl backdrop-blur-md`}
            >
              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-sm font-bold text-slate-200">Edit Driver Display Name</h4>
                    <button 
                      onClick={() => setIsEditingProfile(false)}
                      className="text-slate-400 hover:text-slate-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Driver Full Name</label>
                    <input
                      type="text"
                      value={tempProfileName}
                      onChange={(e) => setTempProfileName(e.target.value)}
                      className="w-full mt-1.5 px-3.5 py-2.5 text-base bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-orange-500 font-medium"
                      placeholder="e.g. Priyantha Jayasundara"
                      autoFocus
                    />
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
                      <Check className="w-3.5 h-3.5" /> Save display name
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Driver Account</span>
                        {isPinLikeName(profile.name || '') && (
                          <span className="flex items-center gap-1 text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold border border-orange-500/20">
                            <ShieldAlert className="w-3 h-3 text-orange-400" /> RAW PIN
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-100 leading-snug">
                        {profile.name}
                      </h4>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTempProfileName(profile.name || '');
                        setIsEditingProfile(true);
                      }}
                      className={`text-xs gap-1 py-1 px-2.5 rounded-lg border-white/10 text-slate-300 hover:text-white hover:bg-white/5 border ${
                        isPinLikeName(profile.name || '') ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' : ''
                      }`}
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Name
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {isPinLikeName(profile.name || '') 
                      ? "Your name is currently set to your login PIN. Change it so passengers and admins can properly identify you!"
                      : `PIN Username: ${profile.email?.split('@')[0] || 'N/A'}`
                    }
                  </p>
                </div>
              )}
            </motion.div>
          )}

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
        
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#111827] border-[#1e293b] text-slate-100 shadow-xl">
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
                      const hasOlderState = isMoreThan1DayOld(date);
                      const groupKey = `driver-${date}`;
                      const isCollapsed = hasOlderState && !expandedDates[groupKey];
                      
                      return (
                        <div key={date} className="mb-6 last:mb-0 animate-in fade-in duration-500">
                          <div 
                            className={`flex items-center gap-3 mb-4 select-none ${hasOlderState ? 'cursor-pointer group/date' : ''}`}
                            onClick={() => hasOlderState && handleToggleDate(groupKey)}
                          >
                            <div className={`px-3 py-1.5 text-xs font-bold tracking-widest rounded flex items-center gap-2 transition-colors
                              ${isToday ? 'bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/50 animate-pulse' : 
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
                              {groups[date].map((trip, index) => (
                                <TripItem 
                                  key={trip.id} 
                                  trip={trip} 
                                  index={index} 
                                  handleUpdateStatus={handleUpdateStatus}
                                  isNormalFlow={trip.normal !== false}
                                  driverOdoValues={driverOdoValues}
                                  setDriverOdoValues={setDriverOdoValues}
                                  handleStartTripWithOdo={handleStartTripWithOdo}
                                  handleEndTripWithOdo={handleEndTripWithOdo}
                                  lastOdo={lastOdoValues[trip.id]}
                                  loadingStart={loadingStartTrip[trip.id]}
                                  handleStartTripAuto={handleStartTripAuto}
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

          {/* Trip History Section */}
          <Card className="bg-[#111827] border-[#1e293b] text-slate-100 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
              <div>
                <CardTitle className="text-slate-100">Trip History (Completed)</CardTitle>
                <p className="text-[11px] text-slate-400 mt-1">Full record of your completed transport logs</p>
              </div>
              <span className="bg-emerald-950 text-emerald-400 font-bold px-3 py-1 rounded-full text-xs border border-emerald-500/20">
                {completedTrips.length} Total
              </span>
            </CardHeader>
            <CardContent className="pt-5">
              {loading ? (
                <div className="space-y-4">
                  <TripItemSkeleton />
                  <TripItemSkeleton />
                </div>
              ) : completedTrips.length === 0 ? (
                <div className="text-slate-400 text-center py-8 text-sm">You haven't completed any trips yet. Completed travel records will remain saved here.</div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {completedTrips.map((trip) => {
                    const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
                    return (
                      <div key={trip.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:bg-slate-900/30 transition-colors flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-900/10 px-2 py-0.5 rounded border border-emerald-500/15 uppercase tracking-wider">
                              COMPLETED
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium ml-2">
                              ID: {trip.id.substring(0, 8)}...
                            </span>
                          </div>
                          {trip.dropoffTime && (
                            <span className="text-xs text-slate-400 font-mono">
                              {format(new Date(trip.dropoffTime), 'MMM dd, h:mm a')}
                            </span>
                          )}
                        </div>

                        <div className="text-slate-100 font-medium text-sm flex flex-col gap-1.5">
                          <div className="flex items-start gap-1.5">
                            <span className="text-[#ff9900] text-[10px] font-extrabold uppercase mt-0.5 min-w-[32px]">START</span>
                            <p className="text-slate-200">{trip.pickupAddress}</p>
                          </div>
                          <div className="w-px h-2.5 bg-slate-800 ml-4"></div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-emerald-400 text-[10px] font-extrabold uppercase mt-0.5 min-w-[32px]">ROUTE</span>
                            <p className="text-slate-200">{destination}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 border-t border-slate-800/60 pt-3 mt-1.5 font-mono text-center">
                          <div className="bg-[#0f172a] rounded-lg p-2 border border-slate-900">
                            <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Start Odo</span>
                            <span className="text-xs text-slate-200 font-semibold">{trip.startOdometer || 0} KM</span>
                          </div>
                          <div className="bg-[#0f172a] rounded-lg p-2 border border-slate-900">
                            <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">End Odo</span>
                            <span className="text-xs text-slate-200 font-semibold">{trip.endOdometer || 0} KM</span>
                          </div>
                          <div className="bg-[#0f172a] rounded-lg p-2 border border-slate-900">
                            <span className="text-[9px] text-[#ff9900] uppercase font-sans font-bold block">Distance</span>
                            <span className="text-xs text-[#ff9900] font-semibold">
                              {Math.max(0, (trip.endOdometer || 0) - (trip.startOdometer || 0))} KM
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400/80 flex justify-between items-center bg-slate-900/50 px-3 py-1.5 rounded-lg">
                          <span>Passenger: <strong className="text-slate-300">{(trip.passengerName === 'Unknown' || trip.passengerName === 'Unknown User' || !trip.passengerName) ? 'Sanken User' : trip.passengerName}</strong></span>
                          {trip.tripType && <span className="uppercase text-[9px] tracking-wider font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{trip.tripType}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Quick Action Center for Active Bookings */}
      {activeTrips.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
          {/* Quick Action Drawer/Card */}
          {isQuickMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 w-[310px] sm:w-[360px] backdrop-blur-xl max-h-[82vh] overflow-y-auto mb-2 text-slate-100 flex flex-col gap-3.5 ring-1 ring-white/10"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="bg-orange-500/10 text-orange-400 p-1.5 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-current animate-pulse text-orange-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-slate-100">Quick Travel Controls</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{activeTrips.length} Active Booking{activeTrips.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 divide-y divide-slate-850">
                {activeTrips.map((trip, idx) => {
                  const dest = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
                  
                  // Local validations specifically for the quick action inputs
                  const startOdoStr = driverOdoValues[trip.id] || '';
                  const startOdoNum = Number(startOdoStr);
                  const startOdoError = startOdoStr && (isNaN(startOdoNum) || startOdoNum <= 0)
                    ? "Odometer must be > 0"
                    : startOdoStr && startOdoNum > 999999
                    ? "Too large (>999,999)"
                    : null;

                  const startOdometerVal = Number(trip.startOdometer) || 0;
                  const endOdoStr = driverOdoValues[trip.id] !== undefined ? driverOdoValues[trip.id] : String(trip.startOdometer || '');
                  const endOdoNum = Number(endOdoStr);
                  const endOdoError = endOdoStr && (isNaN(endOdoNum) || endOdoNum < startOdometerVal)
                    ? `Must be >= start (${startOdometerVal} KM)`
                    : endOdoStr && endOdoNum > 999999
                    ? "Too large"
                    : null;

                  return (
                    <div key={trip.id} className="pt-3 first:pt-0 space-y-3 text-left">
                      {/* Destination and Status Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Car className="w-3" /> Passenger: {trip.passengerName || 'N/A'}
                          </p>
                          <h5 className="font-bold text-sm text-slate-200 truncate mt-0.5">
                            To: {dest || 'N/A'}
                          </h5>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold uppercase tracking-wider shrink-0 border
                          ${trip.status === 'allocated' ? 'bg-blue-900/30 text-blue-400 border-blue-900/40' : 
                            trip.status === 'in_progress' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/40' : 
                            'bg-purple-900/40 text-purple-400 border-purple-900/40'}`}>
                          {trip.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Rapid Interactive Odometer and Status Controls */}
                      <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-3">
                        {trip.status === 'allocated' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Start Odometer</span>
                              {startOdoError && <span className="text-[10px] text-red-400 font-semibold">{startOdoError}</span>}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                pattern="[0-9]*"
                                inputMode="numeric"
                                placeholder="Start KM (e.g. 15000)"
                                className={`font-mono text-sm py-2 px-3 bg-slate-950 text-slate-100 rounded-lg flex-1 border ${
                                  startOdoError ? 'border-red-500/80 focus:border-red-500' : 'border-slate-800 focus:border-blue-500'
                                }`}
                                value={driverOdoValues[trip.id] || ''}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/\D/g, '');
                                  setDriverOdoValues({ ...driverOdoValues, [trip.id]: clean });
                                }}
                              />
                              <Button
                                size="sm"
                                disabled={!driverOdoValues[trip.id] || !!startOdoError}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-auto px-4 rounded-lg shrink-0 text-xs"
                                onClick={async () => {
                                  await handleStartTripWithOdo(trip.id, driverOdoValues[trip.id]);
                                  setIsQuickMenuOpen(false);
                                }}
                              >
                                Start
                              </Button>
                            </div>
                          </div>
                        )}

                        {trip.status === 'driver_started' && (
                          <div className="space-y-2 text-center py-1">
                            <p className="text-[11.5px] text-amber-400 font-medium leading-relaxed">Waiting for passenger start odometer. Trigger manually if trip is underway:</p>
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs"
                              onClick={async () => {
                                await handleStartTripWithOdo(trip.id, trip.startOdometer || "0");
                                setIsQuickMenuOpen(false);
                              }}
                            >
                              Force Start (With {trip.startOdometer || 0} KM)
                            </Button>
                          </div>
                        )}

                        {trip.status === 'in_progress' && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800 pb-2">
                              <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Start Odo Saved</span>
                              <span className="font-mono text-amber-400 font-bold text-xs">{trip.startOdometer || 0} KM</span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">End Odometer</span>
                                {endOdoError && <span className="text-[10px] text-red-500/90 font-semibold">{endOdoError}</span>}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  pattern="[0-9]*"
                                  inputMode="numeric"
                                  placeholder="End KM (e.g. 15120)"
                                  className={`font-mono text-sm py-2 px-3 bg-slate-950 text-slate-100 rounded-lg flex-1 border ${
                                    endOdoError ? 'border-red-500/80 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
                                  }`}
                                  value={driverOdoValues[trip.id] !== undefined ? driverOdoValues[trip.id] : String(trip.startOdometer || '')}
                                  onChange={(e) => {
                                    const clean = e.target.value.replace(/\D/g, '');
                                    setDriverOdoValues({ ...driverOdoValues, [trip.id]: clean });
                                  }}
                                />
                                <Button
                                  size="sm"
                                  disabled={!!endOdoError}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-auto px-4 rounded-lg shrink-0 text-xs"
                                  onClick={() => {
                                    const finalOdoVal = driverOdoValues[trip.id] !== undefined ? driverOdoValues[trip.id] : String(trip.startOdometer || '');
                                    handleEndTripWithOdo(trip.id, Number(trip.startOdometer) || 0, finalOdoVal);
                                  }}
                                >
                                  End
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {trip.status === 'driver_ended' && (
                          <div className="space-y-2 text-center py-1">
                            <p className="text-[11.5px] text-amber-400 font-medium leading-relaxed">Waiting for passenger end odometer. Force complete trip if needed:</p>
                            <Button
                              size="sm"
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs"
                              onClick={() => handleEndTripWithOdo(trip.id, Number(trip.startOdometer) || 0, trip.endOdometer || "0")}
                            >
                              Force Complete Trip
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Navigation Shortcut Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const element = document.getElementById(`trip-card-${trip.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            element.classList.add('ring-2', 'ring-orange-500', 'ring-offset-2', 'ring-offset-slate-950');
                            setTimeout(() => {
                              element.classList.remove('ring-2', 'ring-orange-500', 'ring-offset-2', 'ring-offset-slate-950');
                            }, 3000);
                          } else {
                            toast.error("Could not locate trip card in view.");
                          }
                          setIsQuickMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800/40 hover:bg-slate-800/80 text-xs text-slate-300 font-semibold rounded-lg border border-slate-800 transition-all active:scale-95 cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 text-orange-400" />
                        <span>Locate & View Details In Feed</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Floating Action Circle Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
            className={`h-14 w-14 rounded-full flex items-center justify-center text-white shadow-2xl relative select-none cursor-pointer duration-300 ring-4 ring-slate-950 border border-white/5
              ${isQuickMenuOpen 
                ? 'bg-slate-850 text-slate-300 hover:bg-slate-800' 
                : 'bg-gradient-to-tr from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white ring-orange-500/10'
              }`}
          >
            {isQuickMenuOpen ? (
              <X className="w-5 h-5 animate-in spin-in duration-200" />
            ) : (
              <div className="relative">
                <Zap className="w-6 h-6 fill-current text-white animate-pulse" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-bold text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center animate-bounce border border-slate-950">
                  {activeTrips.length}
                </span>
              </div>
            )}
          </motion.button>
        </div>
      )}
    </Layout>
  );
}
