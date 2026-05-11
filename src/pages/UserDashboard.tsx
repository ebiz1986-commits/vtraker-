import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { sendPushNotification } from '../lib/utils';

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-[#111827] border-[#1e293b] text-slate-100 shadow-xl">
            <CardHeader>
              <CardTitle>Book a Vehicle</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTrip} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Trip Type</label>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value as 'dropoff' | 'return')}
                    className="w-full p-2 border border-[#1e293b] rounded-md focus:ring-2 focus:ring-[#ff9900] focus:outline-none bg-[#0a0f1c] text-slate-100"
                  >
                    <option value="dropoff">Drop-off Only</option>
                    <option value="return">Return Trip / Tour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Pickup Address</label>
                  <input 
                    type="text" 
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full p-2 border border-[#1e293b] rounded-md focus:ring-2 focus:ring-[#ff9900] focus:outline-none bg-[#0a0f1c] text-slate-100 placeholder-slate-600"
                    placeholder="Enter pickup location"
                  />
                </div>
                {tripType === 'dropoff' ? (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Dropoff Address</label>
                    <input 
                      type="text" 
                      required
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                      className="w-full p-2 border border-[#1e293b] rounded-md focus:ring-2 focus:ring-[#ff9900] focus:outline-none bg-[#0a0f1c] text-slate-100 placeholder-slate-600"
                      placeholder="Enter destination"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Locations Hoping to Go</label>
                    <textarea 
                      required
                      value={returnLocations}
                      onChange={(e) => setReturnLocations(e.target.value)}
                      className="w-full p-2 border border-[#1e293b] rounded-md focus:ring-2 focus:ring-[#ff9900] focus:outline-none bg-[#0a0f1c] text-slate-100 placeholder-slate-600"
                      placeholder="E.g., Kandy, Nuwara Eliya, return to Colombo"
                      rows={2}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Date</label>
                    <input 
                      type="date" 
                      required
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      value={requestedDate}
                      onChange={(e) => setRequestedDate(e.target.value)}
                      className="w-full p-2 border border-[#1e293b] rounded-md focus:ring-2 focus:ring-[#ff9900] focus:outline-none bg-[#0a0f1c] text-slate-100 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Start Time</label>
                    <input 
                      type="time" 
                      required
                      value={requestedStartTime}
                      onChange={(e) => setRequestedStartTime(e.target.value)}
                      className="w-full p-2 border border-[#1e293b] rounded-md focus:ring-2 focus:ring-[#ff9900] focus:outline-none bg-[#0a0f1c] text-slate-100 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Total Est. Time</label>
                    <input 
                      type="text" 
                      value={estimatedDestinationTime}
                      onChange={(e) => setEstimatedDestinationTime(e.target.value)}
                      className="w-full p-2 border border-[#1e293b] rounded-md focus:ring-2 focus:ring-[#ff9900] focus:outline-none bg-[#0a0f1c] text-slate-100 placeholder-slate-600"
                      placeholder="e.g. 2 hours"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Passengers</label>
                    <input 
                      type="number" 
                      min="1"
                      max="100"
                      required
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                      className="w-full p-2 border border-[#1e293b] rounded-md focus:ring-2 focus:ring-[#ff9900] focus:outline-none bg-[#0a0f1c] text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Remarks / Notes (Optional)</label>
                  <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full p-2 border border-[#1e293b] rounded-md focus:ring-2 focus:ring-[#ff9900] focus:outline-none bg-[#0a0f1c] text-slate-100 placeholder-slate-600"
                    placeholder="Any notes to admin"
                    rows={2}
                  />
                </div>
                <Button type="submit" className="w-full mt-2 bg-[#ff9900] hover:bg-[#e68a00] text-black font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">Request Booking</Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#111827] border-[#1e293b] shadow-xl text-slate-100">
            <CardHeader>
              <CardTitle>My Active Trips</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-slate-400">Loading trips...</div>
              ) : trips.length === 0 ? (
                <div className="text-slate-400 text-center py-8">No trips found. Book a vehicle to get started!</div>
              ) : (
                <div className="space-y-4">
                  {trips.filter(t => !['completed', 'cancelled'].includes(t.status)).length === 0 ? (
                    <div className="text-slate-400 text-center py-4">No active trips found.</div>
                  ) : (
                    trips.filter(t => !['completed', 'cancelled'].includes(t.status)).map((trip, index) => (
                      <div key={trip.id} style={{ animationDelay: `${index * 100}ms` }} className="border border-[#1f2937] bg-[#0a0f1c]/50 rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-4 transition-all duration-300 hover:shadow-2xl hover:border-slate-600 hover:bg-[#0f172a] animate-in slide-in-from-bottom-6 fade-in fill-mode-both duration-500">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">

                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize border flex items-center gap-2
                            ${trip.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50 animate-pulse' : 
                              trip.status === 'allocated' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50 animate-pulse' :
                              trip.status === 'driver_started' ? 'bg-blue-800/30 text-blue-300 border-blue-800/50 animate-pulse' :
                              trip.status === 'in_progress' ? 'bg-purple-900/30 text-purple-400 border-purple-900/50 animate-pulse' :
                              trip.status === 'driver_ended' ? 'bg-amber-900/30 text-amber-400 border-amber-900/50 animate-pulse' :
                              trip.status === 'completed' ? 'bg-green-900/30 text-green-400 border-green-900/50' :
                              'bg-slate-800 text-slate-300 border-slate-700'}`}>
                            {trip.status !== 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
                            {trip.forceCompleted ? 'Force Completed' : trip.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-500">
                            {trip.createdAt?.toDate ? new Date(trip.createdAt.toDate()).toLocaleString() : 'Just now'}
                          </span>
                          {trip.isJointTrip && (
                            <span className="text-xs font-medium text-[#ff9900] bg-[#ff9900]/10 px-2 py-0.5 rounded uppercase tracking-wider border border-[#ff9900]/20 animate-pulse">
                              JOINT
                            </span>
                          )}
                          {trip.tripType && (
                            <span className="text-xs font-medium text-slate-300 bg-[#1e293b] px-2 py-0.5 rounded uppercase tracking-wider">
                              {trip.tripType}
                            </span>
                          )}
                        </div>
                        <div className="text-sm flex flex-col space-y-1">
                          <div><span className="font-medium text-slate-300">From:</span> <span className="text-slate-400">{trip.pickupAddress}</span></div>
                          {trip.tripType === 'return' ? (
                            <div><span className="font-medium text-slate-300">Destinations:</span> <span className="text-slate-400">{trip.returnLocations}</span></div>
                          ) : (
                            <div><span className="font-medium text-slate-300">To:</span> <span className="text-slate-400">{trip.dropoffAddress}</span></div>
                          )}
                          {trip.requestedDate && (
                            <div><span className="font-medium text-slate-300">Date:</span> <span className="text-slate-400">{trip.requestedDate}</span></div>
                          )}
                          {trip.requestedStartTime && (
                            <div><span className="font-medium text-slate-300">Time:</span> <span className="text-slate-400">{trip.requestedStartTime}</span></div>
                          )}
                          {trip.estimatedDestinationTime && (
                            <div><span className="font-medium text-slate-300">Total Est. Time:</span> <span className="text-slate-400">{trip.estimatedDestinationTime}</span></div>
                          )}
                          {trip.passengerCount && (
                            <div><span className="font-medium text-slate-300">Passengers:</span> <span className="text-slate-400">{trip.passengerCount}</span></div>
                          )}
                          {trip.remarks && (
                            <div className="italic text-slate-500 mt-1">"{trip.remarks}"</div>
                          )}
                          
                          {trip.isJointTrip && trip.jointPassengers && trip.jointPassengers.length > 1 && (
                            <div className="mt-3 pt-2 border-t border-slate-700/50 max-w-sm">
                              <span className="text-xs text-[#ff9900] font-semibold mb-2 block tracking-wider uppercase">Traveling With</span>
                              <div className="grid gap-1.5">
                                {trip.jointPassengers.filter((p: any) => p.name !== profile?.name).map((p: any, i: number) => (
                                  <div key={i} className="text-xs text-slate-300 flex justify-between items-center bg-slate-800/80 px-2 py-1.5 rounded border border-slate-700">
                                    <span className="font-medium">{p.name || 'Unknown User'}</span>
                                    {p.department && <span className="text-[#ff9900] bg-[#ff9900]/10 px-1.5 py-0.5 rounded uppercase tracking-widest text-[9px] font-semibold">{p.department}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {trip.driverId && (
                          <div className="mt-4 p-3 bg-emerald-900/10 border border-emerald-900/30 rounded-lg text-sm text-emerald-400 mt-4">
                            <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-2">
                              <span>✓ Driver Assigned</span>
                            </div>
                            <div className="flex flex-col space-y-1 text-emerald-400/80">
                              {trip.driverName && <div><span className="font-medium text-emerald-300">Driver:</span> {trip.driverName}</div>}
                              {trip.vehicleName && <div><span className="font-medium text-emerald-300">Vehicle:</span> {trip.vehicleName}</div>}
                              {trip.driverPhone && <div><span className="font-medium text-emerald-300">Phone:</span> {trip.driverPhone}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 shrink-0">
                        {trip.status === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => handleCancelTrip(trip.id)} className="text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/50">
                            Cancel
                          </Button>
                        )}
                        {trip.status === 'driver_started' && (
                          <div className="flex flex-col gap-2 p-3 bg-blue-900/20 border border-blue-900/50 rounded text-sm min-w-[200px]">
                            <p className="font-semibold text-blue-300">Driver Arrived</p>
                            <label className="text-blue-400 text-xs uppercase font-semibold">Start Odometer (KM)</label>
                            <input 
                              type="number" 
                              className="w-full p-1.5 border border-[#1e293b] bg-[#0a0f1c] text-white rounded text-sm focus:outline-none focus:border-blue-500"
                              placeholder="e.g. 15020"
                              value={userOdometerValues[trip.id] || ''} 
                              onChange={(e) => setUserOdometerValues({...userOdometerValues, [trip.id]: e.target.value})} 
                            />
                            <Button size="sm" onClick={() => handleConfirmOdometer(trip, 'start')} className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">Confirm Start</Button>
                          </div>
                        )}
                        {trip.status === 'in_progress' && (
                          <div className="text-sm font-medium text-emerald-400 bg-emerald-900/20 px-3 py-2 rounded border border-emerald-900/50 text-center">
                            Trip in Progress
                          </div>
                        )}
                        {trip.status === 'driver_ended' && (
                          <div className="flex flex-col gap-2 p-3 bg-amber-900/20 border border-amber-900/50 rounded text-sm min-w-[200px]">
                            <p className="font-semibold text-amber-300">Driver Ended Trip</p>
                            <label className="text-amber-400 text-xs uppercase font-semibold">End Odometer (KM)</label>
                            <input 
                              type="number" 
                              className="w-full p-1.5 border border-[#1e293b] bg-[#0a0f1c] text-white rounded text-sm focus:outline-none focus:border-amber-500"
                              placeholder="e.g. 15050"
                              value={userOdometerValues[trip.id] || ''} 
                              onChange={(e) => setUserOdometerValues({...userOdometerValues, [trip.id]: e.target.value})} 
                            />
                            <Button size="sm" onClick={() => handleConfirmOdometer(trip, 'end')} className="w-full bg-amber-600 hover:bg-amber-700 text-white border-0">Confirm End</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111827] border-[#1e293b] shadow-xl text-slate-100">
            <CardHeader>
              <CardTitle>My Trip History</CardTitle>
            </CardHeader>
            <CardContent>
              {!loading && trips.filter(t => ['completed', 'cancelled'].includes(t.status)).length === 0 ? (
                <div className="text-slate-400 text-center py-4">No completed trips.</div>
              ) : (
                <div className="space-y-4">
                  {trips.filter(t => ['completed', 'cancelled'].includes(t.status)).map((trip, index) => (
                    <div key={trip.id} className="border border-[#1f2937] bg-black/40 rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-4 opacity-75">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize border
                            ${trip.status === 'cancelled' ? 'bg-red-900/30 text-red-500 border-red-900/50' : 
                              trip.status === 'completed' ? 'bg-green-900/30 text-green-500 border-green-900/50' : ''}`}>
                            {trip.forceCompleted ? 'Force Completed' : trip.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-500">
                            {trip.createdAt?.toDate ? new Date(trip.createdAt.toDate()).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="text-sm flex flex-col space-y-1 text-slate-400">
                          <div>From: {trip.pickupAddress}</div>
                          <div>To: {trip.tripType === 'return' ? trip.returnLocations : trip.dropoffAddress}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-sm text-slate-400">
                        {trip.startOdometer && <div>Start Odo: <span className="font-medium text-slate-300">{trip.startOdometer}</span> KM</div>}
                        {trip.endOdometer && <div>End Odo: <span className="font-medium text-slate-300">{trip.endOdometer}</span> KM</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
