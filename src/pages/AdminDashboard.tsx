import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { toast } from 'sonner';

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
  
  // New Vehicle state
  const [newVehicle, setNewVehicle] = useState({ type: 'car', reg: '' });
  
  // New User state
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'driver', pin: '' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    // Listen to Trips
    const qTrips = query(collection(db, 'trips'));
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      // Check for notifications
      if (!initialLoadRef.current) {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const trip = change.doc.data();
            if (trip.status === 'pending') {
              toast('New Trip Request', {
                description: `From ${trip.pickupAddress} to ${trip.dropoffAddress}`,
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
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
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
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'allocated',
        driverId: selectedDriver,
        vehicleId: selectedVehicle,
        updatedAt: serverTimestamp()
      });
      setAllocatingTrip(null);
      setSelectedDriver('');
      setSelectedVehicle('');
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.pin || newUser.pin.length < 6) return;
    setIsCreatingUser(true);
    
    try {
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.pin);
      const newUid = userCredential.user.uid;
      
      await signOut(secondaryAuth);
      
      await setDoc(doc(db, 'users', newUid), {
        userId: newUid,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: serverTimestamp()
      });
      
      setNewUser({ email: '', name: '', role: 'driver', pin: '' });
      setIsCreatingUser(false);
    } catch (error: any) {
      setIsCreatingUser(false);
      alert("Error creating user: " + error.message);
    }
  };

  const handleExportCSV = () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentTrips = trips.filter(t => t.createdAt && t.createdAt.toMillis() > sevenDaysAgo);
    
    if (recentTrips.length === 0) {
      alert("No trips found in the last 7 days.");
      return;
    }

    const headers = [
      'Trip ID', 'Status', 'Date', 'User Name', 'User Email', 'Driver Name', 
      'Vehicle ID', 'Pickup Address', 'Dropoff Address', 'Requested Start', 
      'Passengers', 'Start ODO', 'End ODO', 'KM Traveled'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    recentTrips.forEach(trip => {
      const user = allUsers.find(u => u.userId === trip.userId) || {};
      const driver = allUsers.find(d => d.userId === trip.driverId) || {};
      const vehicle = vehicles.find(v => v.id === trip.vehicleId) || {};
      
      const tripDate = trip.createdAt ? new Date(trip.createdAt.toMillis()).toLocaleString().replace(/,/g, '') : '';
      const startOdo = trip.startOdometer || '';
      const endOdo = trip.endOdometer || '';
      const kmTraveled = (typeof startOdo === 'number' && typeof endOdo === 'number') ? (endOdo - startOdo) : '';
      
      const row = [
        trip.id,
        trip.status,
        tripDate,
        `"${user.name || ''}"`,
        `"${user.email || ''}"`,
        `"${driver.name || ''}"`,
        `"${vehicle.registrationNumber || ''}"`,
        `"${(trip.pickupAddress || '').replace(/"/g, '""')}"`,
        `"${(trip.dropoffAddress || '').replace(/"/g, '""')}"`,
        `"${trip.requestedStartTime || ''}"`,
        trip.passengerCount || 1,
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

  const pendingTrips = trips.filter(t => t.status === 'pending');
  const activeTrips = trips.filter(t => t.status === 'allocated' || t.status === 'in_progress');

  return (
    <Layout title="Admin Control Center">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Management */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle>Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportCSV} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Export 7-Day Travel Record
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
                    className="w-full mt-1 p-2 border border-zinc-300 rounded"
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
                    className="w-full mt-1 p-2 border border-zinc-300 rounded"
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
                      <span className="text-zinc-500 capitalize">{v.status}</span>
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
                    <label className="text-xs font-medium text-zinc-600">Role</label>
                    <select 
                      className="w-full mt-1 p-2 text-sm border border-zinc-300 rounded"
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value})}
                    >
                      <option value="driver">Driver</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600">PIN (6+ digits)</label>
                    <input 
                      type="text" 
                      required
                      minLength={6}
                      value={newUser.pin}
                      onChange={e => setNewUser({...newUser, pin: e.target.value})}
                      className="w-full mt-1 p-2 text-sm border border-zinc-300 rounded"
                      placeholder="e.g. 123456"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">Name</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full mt-1 p-2 text-sm border border-zinc-300 rounded"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">Email Login</label>
                  <input 
                    type="email" 
                    required
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full mt-1 p-2 text-sm border border-zinc-300 rounded"
                    placeholder="name@example.com"
                  />
                </div>
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
                  {allUsers.length === 0 && <li className="py-2 text-zinc-500">No users found.</li>}
                  {allUsers.filter(u => u.role !== 'admin').map(u => (
                    <li key={u.id} className="py-2 flex justify-between items-center">
                      <div>
                        <span className="font-medium block">{u.name || u.email}</span>
                        <span className="text-xs text-zinc-500 capitalize">{u.role}</span>
                      </div>
                      {u.role === 'user' ? (
                        <Button size="sm" variant="outline" onClick={() => handleSetRole(u.userId, 'driver')}>Make Driver</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleSetRole(u.userId, 'user')}>Remove</Button>
                      )}
                    </li>
                  ))}
                </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dispatch */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50 rounded-t-lg border-b border-orange-100">
              <CardTitle className="text-orange-900 flex justify-between items-center">
                Pending Bookings
                <span className="bg-orange-200 text-orange-900 text-xs px-2 py-1 rounded-full">{pendingTrips.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {pendingTrips.length === 0 ? (
                <div className="text-zinc-500 text-center">No pending trips.</div>
              ) : (
                <div className="space-y-4">
                  {pendingTrips.map(trip => (
                    <div key={trip.id} className="border border-zinc-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
                        <div>
                          <p className="text-sm font-medium">From: <span className="font-normal">{trip.pickupAddress}</span></p>
                          <p className="text-sm font-medium">To: <span className="font-normal">{trip.dropoffAddress}</span></p>
                          {trip.requestedStartTime && (
                            <p className="text-sm font-medium">Requested Start: <span className="font-normal">{trip.requestedStartTime}</span></p>
                          )}
                          {trip.passengerCount && (
                            <p className="text-sm font-medium">Passengers: <span className="font-normal">{trip.passengerCount}</span></p>
                          )}
                        </div>
                        <div className="shrink-0 shrink-0 text-right">
                          <p className="text-xs text-zinc-500">Time: {new Date(trip.pickupTime).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {allocatingTrip === trip.id ? (
                        <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg mt-2">
                          <h4 className="text-sm font-semibold mb-3">Allocate Trip</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="text-xs font-medium text-zinc-600 block mb-1">Select Driver</label>
                              <select 
                                className="w-full text-sm p-2 border border-zinc-300 rounded"
                                value={selectedDriver}
                                onChange={e => setSelectedDriver(e.target.value)}
                              >
                                <option value="">-- Choose Driver --</option>
                                {drivers.map(d => <option key={d.id} value={d.userId}>{d.name || d.email}</option>)}
                              </select>
                            </div>
                            <div>
                               <label className="text-xs font-medium text-zinc-600 block mb-1">Select Vehicle</label>
                               <select 
                                className="w-full text-sm p-2 border border-zinc-300 rounded"
                                value={selectedVehicle}
                                onChange={e => setSelectedVehicle(e.target.value)}
                              >
                                <option value="">-- Choose Vehicle --</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNumber} ({v.type})</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAllocate(trip.id)} disabled={!selectedDriver || !selectedVehicle}>Confirm Dispatch</Button>
                            <Button size="sm" variant="outline" onClick={() => setAllocatingTrip(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button onClick={() => setAllocatingTrip(trip.id)} size="sm">Allocate Driver</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Active Trips
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{activeTrips.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTrips.length === 0 ? (
                <div className="text-zinc-500 text-center">No active trips.</div>
              ) : (
                <div className="space-y-4">
                  {activeTrips.map(trip => {
                    const driver = drivers.find(d => d.userId === trip.driverId);
                    return (
                      <div key={trip.id} className="border border-zinc-200 rounded-lg p-4 flex justify-between items-center text-sm">
                        <div>
                          <p><span className="font-semibold text-zinc-900">{driver?.name || 'Unknown'}</span> is on trip</p>
                          <p className="text-zinc-500 mt-1">{trip.pickupAddress} &rarr; {trip.dropoffAddress}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-medium ${trip.status === 'in_progress' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {trip.status.replace('_', ' ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
