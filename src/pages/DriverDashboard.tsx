import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function DriverDashboard() {
  const { profile } = useAuth();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [completedTripsCount, setCompletedTripsCount] = useState(0);
  const [completedHours, setCompletedHours] = useState('0.0');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!profile?.userId) return;
    
    // Get all trips for this driver
    const q = query(
      collection(db, 'trips'),
      where('driverId', '==', profile.userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
      completedToday.forEach(t => {
         if (t.pickupTime && t.dropoffTime) {
            totalTimeMillis += (t.dropoffTime - t.pickupTime);
         }
      });
      const hours = (totalTimeMillis / (1000 * 60 * 60)).toFixed(1);
      
      setCompletedTripsCount(completedToday.length);
      setCompletedHours(hours);
      setLoading(false);
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
        updates.status = 'in_progress';
      } else if (currentStatus === 'in_progress') {
        updates.status = 'completed';
        updates.dropoffTime = Date.now();
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
          <Card className="bg-zinc-900 text-zinc-50 border-none">
            <CardHeader>
              <CardTitle className="text-zinc-100">Daily Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-zinc-400 text-sm">Date</p>
                  <p className="text-xl font-medium">{format(new Date(), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">Trips Completed Today</p>
                  <p className="text-4xl font-bold">{completedTripsCount}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-sm">Hours Logged</p>
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
                          <h4 className="font-semibold text-lg mb-1">
                            {trip.status === 'allocated' ? 'Upcoming Trip' : 'Active Trip'}
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
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase">Dropoff Location</p>
                          <p className="font-medium text-zinc-900">{trip.dropoffAddress}</p>
                        </div>
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
