import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DriverDashboard() {
  const { profile } = useAuth();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [completedTripsCount, setCompletedTripsCount] = useState(0);
  const [completedHours, setCompletedHours] = useState('0.0');
  const [totalKmLogged, setTotalKmLogged] = useState(0);
  const [loading, setLoading] = useState(true);
  const [odometerValues, setOdometerValues] = useState<{[key: string]: string}>({});
  
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!profile?.userId) return;
    
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
            if (trip.status === 'allocated' && change.type === 'added') {
              // Usually added when assigned for the first time
              toast.success('New Trip Assigned!', {
                description: `${trip.pickupAddress} to ${destination}`,
                duration: 5000,
              });
            } else if (trip.status === 'cancelled') {
              toast.error('A trip was cancelled by the user.', {
                 description: `${trip.pickupAddress} to ${destination}`
              });
            }
          }
        });
      }

      const tripsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      const active = tripsData.filter(t => t.status === 'allocated' || t.status === 'in_progress');
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
      const odoStr = odometerValues[tripId];
      if (!odoStr || isNaN(Number(odoStr))) {
        alert("Please enter a valid numeric odometer reading (KM).");
        return;
      }
      const odometer = Number(odoStr);

      const updates: any = {
        updatedAt: serverTimestamp()
      };
      
      if (currentStatus === 'allocated') {
        updates.status = 'in_progress';
        updates.startOdometer = odometer;
      } else if (currentStatus === 'in_progress') {
        // Validation: end shouldn't be less than start if we can check it
        // However, we wait until server check, but doing a quick client check is good if we fetch it
        updates.status = 'completed';
        updates.dropoffTime = Date.now();
        updates.endOdometer = odometer;
      }
      
      await updateDoc(doc(db, 'trips', tripId), updates);
      
      setOdometerValues(prev => {
        const next = {...prev};
        delete next[tripId];
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  return (
    <Layout title="Driver Console">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-blue-50/70 backdrop-blur-md border border-blue-200/60 shadow-lg text-blue-900">
            <CardHeader>
              <CardTitle className="text-blue-950 font-bold">Daily Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-blue-600/80 text-sm font-semibold uppercase tracking-wider">Date</p>
                  <p className="text-xl font-medium">{format(new Date(), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-blue-600/80 text-sm font-semibold uppercase tracking-wider">Trips Completed Today</p>
                  <p className="text-4xl font-bold">{completedTripsCount}</p>
                </div>
                <div>
                  <p className="text-blue-600/80 text-sm font-semibold uppercase tracking-wider">KM Traveled</p>
                  <p className="text-3xl font-semibold">{totalKmLogged} km</p>
                </div>
                <div>
                  <p className="text-blue-600/80 text-sm font-semibold uppercase tracking-wider">Hours Logged</p>
                  <p className="text-3xl font-semibold">{completedHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>My Active Trips</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-zinc-500">Loading trips...</div>
              ) : activeTrips.length === 0 ? (
                <div className="text-zinc-500 text-center py-8">No assigned trips right now. You will be notified when Admin assigns you a trip.</div>
              ) : (
                <div className="space-y-4">
                  {activeTrips.map(trip => (
                    <div key={trip.id} className="border border-zinc-200 rounded-lg p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-lg mb-1 flex items-center gap-2">
                            {trip.status === 'allocated' ? 'Upcoming Trip' : 'Active Trip'}
                            {trip.tripType && (
                              <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded uppercase tracking-wider">
                                {trip.tripType}
                              </span>
                            )}
                          </h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium uppercase tracking-wider
                            ${trip.status === 'allocated' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {trip.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-zinc-500">Pickup Time</p>
                          <p className="font-semibold">{format(new Date(trip.pickupTime), 'h:mm a')}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-6 bg-zinc-50 p-4 rounded-md">
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase">Pickup Location</p>
                          <p className="font-medium text-zinc-900">{trip.pickupAddress}</p>
                        </div>
                        <div className="w-px h-4 bg-zinc-300 ml-2"></div>
                        {trip.tripType === 'return' ? (
                          <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase">Destinations</p>
                            <p className="font-medium text-zinc-900">{trip.returnLocations}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase">Dropoff Location</p>
                            <p className="font-medium text-zinc-900">{trip.dropoffAddress}</p>
                          </div>
                        )}
                        {trip.requestedStartTime && (
                          <>
                            <div className="w-px h-4 bg-zinc-300 ml-2 mt-2"></div>
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-zinc-500 uppercase">Requested Start</p>
                              <p className="font-medium text-zinc-900">{trip.requestedStartTime}</p>
                            </div>
                          </>
                        )}
                        {trip.passengerCount && (
                          <>
                            <div className="w-px h-4 bg-zinc-300 ml-2 mt-2"></div>
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-zinc-500 uppercase">Passengers</p>
                              <p className="font-medium text-zinc-900">{trip.passengerCount}</p>
                            </div>
                          </>
                        )}
                        {trip.remarks && (
                          <>
                            <div className="w-px h-4 bg-zinc-300 ml-2 mt-2"></div>
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-zinc-500 uppercase">Remarks / Notes</p>
                              <p className="italic text-zinc-600">"{trip.remarks}"</p>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="w-full">
                          <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">
                            {trip.status === 'allocated' ? 'Start Odometer (KM)' : 'End Odometer (KM)'}
                          </label>
                          <input 
                            type="number"
                            className="w-full p-2 border border-zinc-300 rounded"
                            placeholder="e.g. 15020"
                            value={odometerValues[trip.id] || ''}
                            onChange={(e) => setOdometerValues({...odometerValues, [trip.id]: e.target.value})}
                          />
                        </div>
                        <div className="flex gap-3">
                          {trip.status === 'allocated' && (
                            <Button 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                              onClick={() => handleUpdateStatus(trip.id, trip.status)}
                            >
                              Start Trip
                            </Button>
                          )}
                          {trip.status === 'in_progress' && (
                            <Button 
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                              onClick={() => handleUpdateStatus(trip.id, trip.status)}
                            >
                              Complete Trip
                            </Button>
                          )}
                        </div>
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
