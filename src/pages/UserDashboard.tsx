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
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [requestedStartTime, setRequestedStartTime] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
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
                description: `Your trip to ${trip.dropoffAddress} has been assigned a driver.`,
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
    if (!pickupAddress || !dropoffAddress || !requestedStartTime || passengerCount < 1) return;
    
    try {
      await addDoc(collection(db, 'trips'), {
        userId: profile!.userId,
        status: 'pending',
        pickupAddress,
        dropoffAddress,
        requestedStartTime,
        passengerCount,
        pickupLat: 0, // Mock for now
        pickupLng: 0,
        dropoffLat: 0,
        dropoffLng: 0,
        pickupTime: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setPickupAddress('');
      setDropoffAddress('');
      setRequestedStartTime('');
      setPassengerCount(1);
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
                    <div key={trip.id} className="border border-zinc-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
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
                        </div>
                        <div className="text-sm font-medium">From: <span className="font-normal text-zinc-600">{trip.pickupAddress}</span></div>
                        <div className="text-sm font-medium">To: <span className="font-normal text-zinc-600">{trip.dropoffAddress}</span></div>
                        {trip.requestedStartTime && (
                          <div className="text-sm font-medium mt-1">Requested Start: <span className="font-normal text-zinc-600">{trip.requestedStartTime}</span></div>
                        )}
                        {trip.passengerCount && (
                          <div className="text-sm font-medium">Passengers: <span className="font-normal text-zinc-600">{trip.passengerCount}</span></div>
                        )}
                        {trip.driverId && (
                          <div className="text-sm mt-1 text-zinc-500">Driver Assigned! Check map for details.</div>
                        )}
                      </div>
                      
                      {trip.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => handleCancelTrip(trip.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 shrink-0">
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
                        }} className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 shrink-0">
                          End Trip
                        </Button>
                      )}
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
