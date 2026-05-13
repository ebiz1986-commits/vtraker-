import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { sendPushNotification } from '../lib/utils';
import { ChevronDown, ArrowRight, MapPin, Clock } from 'lucide-react';

const TripItem = ({ trip, index, handleUpdateStatus }: { trip: any, index: number, handleUpdateStatus: (id: string, status: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
  
  return (
    <div style={{ animationDelay: `${index * 100}ms` }} className="border border-[#1f2937] bg-[#0a0f1c]/50 rounded-lg transition-all duration-300 hover:shadow-2xl hover:border-slate-600 hover:bg-[#0f172a] animate-in slide-in-from-bottom-6 fade-in fill-mode-both duration-500 overflow-hidden">
      {/* Clickable Header */}
      <div 
        className="p-4 sm:p-5 cursor-pointer flex justify-between items-center gap-4 transition-colors hover:bg-slate-800/30 group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium uppercase tracking-wider border flex items-center gap-2 max-w-fit
              ${trip.status === 'allocated' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' : 'bg-purple-900/30 text-purple-400 border-purple-900/50'}`}>
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
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
            <div className="flex-1 min-w-0 text-slate-100 font-medium text-sm sm:text-base leading-snug">
              <span className="break-words">{trip.pickupAddress}</span>
            </div>
            
            <div className="hidden sm:block mt-1">
              <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
            </div>
            
            <div className="flex-1 min-w-0 text-slate-100 font-medium text-sm sm:text-base leading-snug flex items-start">
              <span className="sm:hidden text-slate-500 text-xs font-medium mr-1.5 mt-px uppercase tracking-wider">To</span>
              <span className="break-words">{destination}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right flex-shrink-0">
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-slate-400 mb-0.5 flex items-center justify-end gap-1 uppercase tracking-wider">
              <Clock className="w-3 h-3" /> Time
            </p>
            <p className="font-semibold text-slate-200">{trip.pickupTime ? format(new Date(trip.pickupTime), 'h:mm a') : (trip.requestedStartTime || 'N/A')}</p>
          </div>
          <div className="sm:hidden">
            <p className="font-semibold text-slate-200 text-sm">{trip.pickupTime ? format(new Date(trip.pickupTime), 'h:mm a') : (trip.requestedStartTime || 'N/A')}</p>
          </div>
          <div className={`p-1.5 rounded-full bg-slate-800 text-slate-400 transition-colors group-hover:text-slate-200 group-hover:bg-slate-700`}>
            <ChevronDown className={`w-5 h-5 transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
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
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Requester</p>
                <div className="flex justify-between bg-slate-800/80 px-3 py-2 rounded items-center border border-slate-700">
                  <span className="text-sm font-medium text-slate-200">{trip.passengerName || 'Unknown User'}</span>
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
                <p className="italic text-slate-300 mt-1 bg-slate-800/50 p-2 rounded border border-slate-700">"{trip.remarks}"</p>
              </div>
            )}
          </div>
          
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
        </div>
      </div>
    </div>
  );
};

export default function DriverDashboard() {
  const { profile } = useAuth();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [completedTripsCount, setCompletedTripsCount] = useState(0);
  const [completedHours, setCompletedHours] = useState('0.0');
  const [totalKmLogged, setTotalKmLogged] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const initialLoadRef = useRef(true);

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
      // Handle notifications
      if (!initialLoadRef.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' || change.type === 'modified') {
            const trip = change.doc.data();
            const destination = trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress;
            const jointText = trip.isJointTrip ? ' (JOINT TRIP)' : '';
            if (trip.status === 'allocated' && change.type === 'added') {
              // Usually added when assigned for the first time
              toast.success(`New Trip Assigned!${jointText}`, {
                description: `${trip.pickupAddress} to ${destination}`,
                duration: 5000,
              });
              sendPushNotification(`New Trip Assigned!${jointText}`, {
                body: `${trip.pickupAddress} to ${destination}`
              });
            } else if (trip.status === 'cancelled') {
              toast.error('A trip was cancelled by the user.', {
                 description: `${trip.pickupAddress} to ${destination}`
              });
              sendPushNotification('Trip Cancelled', {
                body: `A trip from ${trip.pickupAddress} to ${destination} was cancelled.`
              });
            }
          }
        });
      }

      const tripsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
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
                  <p className="text-4xl font-bold">{completedTripsCount}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">KM Traveled</p>
                  <p className="text-3xl font-semibold">{totalKmLogged} km</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Hours Logged</p>
                  <p className="text-3xl font-semibold">{completedHours}h</p>
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
                <div className="text-slate-400">Loading trips...</div>
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
