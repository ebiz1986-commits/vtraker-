import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

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
  const [requestedStartTime, setRequestedStartTime] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [remarks, setRemarks] = useState('');
  // Simulating coordinates for now
  
  useEffect(() => {
    if (!profile?.userId) return;
    
    const q = query(
      collection(db, 'trips'),
      where('userId', '==', profile.userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialLoadRef.current) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'modified') {
            const trip = change.doc.data();
            if (trip.status === 'allocated') {
              toast.success('Driver Allocated!', {
                description: `Your trip to ${trip.tripType === 'dropoff' ? trip.dropoffAddress : 'multiple destinations'} has been assigned a driver.`,
                duration: 5000,
              });
            } else if (trip.status === 'in_progress') {
              toast.info('Trip Started', {
                description: 'Your driver has started the trip.',
              });
            } else if (trip.status === 'completed') {
              toast.success('Trip Completed', {
                description: 'You have reached your destination.',
              });
            }
          }
        });
      }

      const tripsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      // Sort in memory since we don't have an index yet
      tripsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
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
    if (!pickupAddress || !requestedStartTime || passengerCount < 1) return;
    if (tripType === 'dropoff' && !dropoffAddress) return;
    if (tripType === 'return' && !returnLocations) return;
    
    try {
      await addDoc(collection(db, 'trips'), {
        userId: profile!.userId,
        status: 'pending',
        pickupAddress,
        tripType,
        dropoffAddress: tripType === 'dropoff' ? dropoffAddress : null,
        returnLocations: tripType === 'return' ? returnLocations : null,
        requestedStartTime,
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
      setRequestedStartTime('');
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
          <Card>
            <CardHeader>
              <CardTitle>Book a Vehicle</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTrip} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-700">Trip Type</label>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value as 'dropoff' | 'return')}
                    className="w-full p-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-white"
                  >
                    <option value="dropoff">Drop-off Only</option>
                    <option value="return">Return Trip / Tour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-700">Pickup Address</label>
                  <input 
                    type="text" 
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full p-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    placeholder="Enter pickup location"
                  />
                </div>
                {tripType === 'dropoff' ? (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-700">Dropoff Address</label>
                    <input 
                      type="text" 
                      required
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                      className="w-full p-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                      placeholder="Enter destination"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-700">Locations Hoping to Go</label>
                    <textarea 
                      required
                      value={returnLocations}
                      onChange={(e) => setReturnLocations(e.target.value)}
                      className="w-full p-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                      placeholder="E.g., Kandy, Nuwara Eliya, return to Colombo"
                      rows={2}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-700">Start Time</label>
                    <input 
                      type="time" 
                      required
                      value={requestedStartTime}
                      onChange={(e) => setRequestedStartTime(e.target.value)}
                      className="w-full p-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-700">Passengers</label>
                    <input 
                      type="number" 
                      min="1"
                      max="100"
                      required
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                      className="w-full p-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-700">Remarks / Notes (Optional)</label>
                  <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full p-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                    placeholder="Any notes to admin"
                    rows={2}
                  />
                </div>
                <Button type="submit" className="w-full mt-2">Request Booking</Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>My Trip History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-zinc-500">Loading trips...</div>
              ) : trips.length === 0 ? (
                <div className="text-zinc-500 text-center py-8">No trips found. Book a vehicle to get started!</div>
              ) : (
                <div className="space-y-4">
                  {trips.map(trip => (
                    <div key={trip.id} className="border border-zinc-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize
                            ${trip.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              trip.status === 'allocated' ? 'bg-blue-100 text-blue-800' :
                              trip.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                              trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-zinc-100 text-zinc-800'}`}>
                            {trip.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {trip.createdAt?.toDate ? new Date(trip.createdAt.toDate()).toLocaleString() : 'Just now'}
                          </span>
                          {trip.tripType && (
                            <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded uppercase tracking-wider">
                              {trip.tripType}
                            </span>
                          )}
                        </div>
                        <div className="text-sm flex flex-col space-y-1">
                          <div><span className="font-medium">From:</span> <span className="text-zinc-600">{trip.pickupAddress}</span></div>
                          {trip.tripType === 'return' ? (
                            <div><span className="font-medium">Destinations:</span> <span className="text-zinc-600">{trip.returnLocations}</span></div>
                          ) : (
                            <div><span className="font-medium">To:</span> <span className="text-zinc-600">{trip.dropoffAddress}</span></div>
                          )}
                          {trip.requestedStartTime && (
                            <div><span className="font-medium">Time:</span> <span className="text-zinc-600">{trip.requestedStartTime}</span></div>
                          )}
                          {trip.passengerCount && (
                            <div><span className="font-medium">Passengers:</span> <span className="text-zinc-600">{trip.passengerCount}</span></div>
                          )}
                          {trip.remarks && (
                            <div className="italic text-zinc-500 mt-1">"{trip.remarks}"</div>
                          )}
                        </div>
                        {trip.driverId && (
                          <div className="text-sm mt-3 text-emerald-600 font-medium bg-emerald-50 inline-block px-2 py-1 rounded">Driver Assigned! Check map for details.</div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 shrink-0">
                        {trip.status === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => handleCancelTrip(trip.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                            Cancel
                          </Button>
                        )}
                        {trip.status === 'in_progress' && (
                          <Button variant="outline" size="sm" onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'trips', trip.id), {
                                status: 'completed',
                                dropoffTime: Date.now(),
                                updatedAt: serverTimestamp()
                              });
                            } catch (error) {
                              handleFirestoreError(error, OperationType.UPDATE, `trips/${trip.id}`);
                            }
                          }} className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300">
                            End Trip
                          </Button>
                        )}
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
