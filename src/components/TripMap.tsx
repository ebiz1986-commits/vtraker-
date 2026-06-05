import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Compass, Info, Play, Pause, RefreshCw, AlertTriangle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface TripMapProps {
  trip: any;
  isDriver?: boolean;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '';

export function TripMap({ trip, isDriver = false }: TripMapProps) {
  // Use state to track live coordinate positions
  const [vehiclePos, setVehiclePos] = useState<{ lat: number; lng: number }>({
    lat: trip.currentLocation?.lat || 6.9271, // Colombo default
    lng: trip.currentLocation?.lng || 79.8612,
  });
  
  const [pickupPos, setPickupPos] = useState<{ lat: number; lng: number }>({
    lat: trip.pickupCoords?.lat || 6.9271,
    lng: trip.pickupCoords?.lng || 79.8612,
  });

  const [dropoffPos, setDropoffPos] = useState<{ lat: number; lng: number }>({
    lat: trip.dropoffCoords?.lat || 6.9400,
    lng: trip.dropoffCoords?.lng || 79.8700,
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Generate realistic coordinates centered near the user's city if not initialized
  useEffect(() => {
    const initializeCoordinates = async () => {
      // If trip already has stored coordinates, let's use them directly
      if (trip.pickupCoords?.lat && trip.dropoffCoords?.lat) {
        setPickupPos(trip.pickupCoords);
        setDropoffPos(trip.dropoffCoords);
        if (trip.currentLocation?.lat) {
          setVehiclePos(trip.currentLocation);
        } else {
          setVehiclePos(trip.pickupCoords);
        }
        return;
      }

      // Fallback generator: Attempt to request user's actual city coords to make it look hyper-realistic!
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const pickup = { lat, lng };
          
          // Destination is offset by ~2km
          const dropoff = {
            lat: lat + 0.012,
            lng: lng + 0.015,
          };

          setPickupPos(pickup);
          setDropoffPos(dropoff);
          setVehiclePos(pickup);

          // Update trip object in Firestore with these initial coords if we are driver or creator
          try {
            await updateDoc(doc(db, 'trips', trip.id), {
              pickupCoords: pickup,
              dropoffCoords: dropoff,
              currentLocation: pickup,
            });
          } catch (e) {
            console.error("Error setting coordinates:", e);
          }
        },
        async () => {
          // Defaults to Colombo
          const pickup = { lat: 6.9271, lng: 79.8612 };
          const dropoff = { lat: 6.9412, lng: 79.8732 };
          setPickupPos(pickup);
          setDropoffPos(dropoff);
          setVehiclePos(pickup);
          
          try {
            await updateDoc(doc(db, 'trips', trip.id), {
              pickupCoords: pickup,
              dropoffCoords: dropoff,
              currentLocation: pickup,
            });
          } catch (e) {
            console.error("Error setting default coordinates:", e);
          }
        },
        { timeout: 5000 }
      );
    };

    initializeCoordinates();
  }, [trip.id, trip.pickupCoords, trip.dropoffCoords]);

  // Synchronize Firestore changes to state in real-time
  useEffect(() => {
    if (trip.currentLocation?.lat && trip.currentLocation?.lng) {
      setVehiclePos({
        lat: trip.currentLocation.lat,
        lng: trip.currentLocation.lng,
      });
    }
  }, [trip.currentLocation]);

  // Handle live device geolocation recording if isDriver is active
  useEffect(() => {
    const isActive = trip.status === 'driver_started' || trip.status === 'in_progress';
    if (isDriver && isActive && !isSimulating) {
      if ('geolocation' in navigator) {
        // Watch driver position in real-time
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
            const heading = position.coords.heading || 0;
            const liveLoc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: heading,
              updatedAt: Date.now(),
            };

            setVehiclePos({ lat: liveLoc.lat, lng: liveLoc.lng });
            
            // Save to Firestore so user sees the vehicle moving in real-time!
            try {
              await updateDoc(doc(db, 'trips', trip.id), {
                currentLocation: liveLoc,
              });
            } catch (err) {
              console.error("Error writing active driver position:", err);
            }
          },
          (err) => {
            console.warn("GPS tracking active but restricted:", err.message);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isDriver, trip.status, isSimulating, trip.id]);

  // Simulator Engine to animate the vehicle along the vector line
  const handleToggleSimulation = () => {
    if (isSimulating) {
      // Stop simulation
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      setIsSimulating(false);
      toast.success("Simulation paused.");
    } else {
      setIsSimulating(true);
      toast.success("Driver simulation started! Car moves dynamically along path.");
      
      let stepIdx = 0;
      const totalSteps = 40;

      // Start interval
      simulationIntervalRef.current = setInterval(async () => {
        stepIdx++;
        
        if (stepIdx > totalSteps) {
          // Reset or loop around
          stepIdx = 0;
        }

        const ratio = stepIdx / totalSteps;
        // Linear interpolation
        const currentLat = pickupPos.lat + (dropoffPos.lat - pickupPos.lat) * ratio;
        const currentLng = pickupPos.lng + (dropoffPos.lng - pickupPos.lng) * ratio;

        // Calculate heading/bearing
        const bearing = Math.atan2(dropoffPos.lng - pickupPos.lng, dropoffPos.lat - pickupPos.lat) * (180 / Math.PI);

        const simulatedLoc = {
          lat: currentLat,
          lng: currentLng,
          heading: bearing,
          updatedAt: Date.now(),
        };

        setVehiclePos({ lat: currentLat, lng: currentLng });

        try {
          await updateDoc(doc(db, 'trips', trip.id), {
            currentLocation: simulatedLoc,
          });
        } catch (err) {
          console.error("Simulation database save error:", err);
        }
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl mt-4">
      {/* MAP STATUS BAR */}
      <div className="bg-[#0b101d] px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-200 tracking-wide font-sans">
            LIVE VEHICLE TRACKER
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {trip.status.replace('_', ' ')}
          </span>
          {isDriver && (
            <button
              onClick={handleToggleSimulation}
              className={`text-[9px] font-bold px-2.5 py-1 rounded transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer focus:outline-none ${
                isSimulating ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
              }`}
            >
              {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isSimulating ? 'Pause Sim' : 'Simulate Drive'}
            </button>
          )}
        </div>
      </div>

      {/* CORE RENDER DECISION: GOOGLE MAPS vs SIMULATED HYPOTHETIST GRID */}
      <div className="relative w-full h-[320px] bg-slate-950">
        {hasValidKey ? (
          /* GOOGLE MAPS ACTIVE ENGINE */
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={vehiclePos}
              center={vehiclePos}
              defaultZoom={14}
              zoom={14}
              mapId="VBOOKING_VEHICLE_TRACK"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              disableDefaultUI={true}
              zoomControl={true}
            >
              {/* Pickup Marker */}
              <AdvancedMarker position={pickupPos} title={`Pickup: ${trip.pickupAddress}`}>
                <div className="flex flex-col items-center">
                  <div className="bg-emerald-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded shadow shadow-emerald-950 tracking-wider">P</div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white -mt-0.5" />
                </div>
              </AdvancedMarker>

              {/* Dropoff Marker */}
              <AdvancedMarker position={dropoffPos} title={`Dropoff: ${trip.dropoffAddress || trip.returnLocations}`}>
                <div className="flex flex-col items-center">
                  <div className="bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded shadow shadow-rose-950 tracking-wider">D</div>
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-600 border-2 border-white -mt-0.5" />
                </div>
              </AdvancedMarker>

              {/* Active Vehicle Marker */}
              <AdvancedMarker position={vehiclePos} title={`Vehicle: ${trip.vehicleName || 'Driver'}`}>
                <div className="relative w-10 h-10 flex items-center justify-center bg-sky-500 rounded-full border border-white text-white shadow-lg transition-all duration-1000">
                  <Navigation 
                    className="w-5 h-5 drop-shadow-md" 
                    style={{ transform: `rotate(${(trip.currentLocation?.heading || 0) - 45}deg)` }} 
                  />
                  <div className="absolute -inset-0.5 rounded-full border border-sky-400 animate-ping opacity-40" />
                </div>
              </AdvancedMarker>
            </Map>
          </APIProvider>
        ) : (
          /* HIGH-QUALITY VECTOR FALLBACK / SIMULATION DASHBOARD */
          <div className="absolute inset-0 overflow-hidden bg-slate-950 flex flex-col justify-between p-4">
            {/* Background Map Simulation Grid */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <div className="w-full h-full" style={{
                backgroundImage: 'radial-gradient(ellipse at center, rgba(30,41,59,0.5) 0%, rgba(10,15,28,1) 80%), repeating-linear-gradient(0deg, #1e293b, #1e293b 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #1e293b, #1e293b 1px, transparent 1px, transparent 40px)',
                backgroundSize: '100% 100%, 40px 40px, 40px 40px'
              }} />
            </div>

            {/* Simulated Path Indicator */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none p-8" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Pickup to Dropoff route */}
              <line x1="20" y1="80" x2="80" y2="20" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="3,3" />
              <line x1="20" y1="80" x2="80" y2="20" stroke="rgba(14,165,233,0.3)" strokeWidth="1" />
              
              {/* Pickup */}
              <circle cx="20" cy="80" r="3" fill="#10b981" />
              
              {/* Dropoff */}
              <circle cx="80" cy="20" r="3" fill="#f43f5e" />

              {/* Simulated Vehicle along path */}
              {(() => {
                // Approximate coordinate interpolation inside SVG coordinates space
                const latDiff = dropoffPos.lat - pickupPos.lat;
                const lngDiff = dropoffPos.lng - pickupPos.lng;
                const totalDist = Math.sqrt(latDiff*latDiff + lngDiff*lngDiff);
                if (totalDist <= 0) return null;

                const curLatDiff = vehiclePos.lat - pickupPos.lat;
                const curLngDiff = vehiclePos.lng - pickupPos.lng;
                const curDist = Math.sqrt(curLatDiff*curLatDiff + curLngDiff*curLngDiff);
                const ratio = Math.max(0, Math.min(1, curDist / totalDist));

                const x = 20 + (80 - 20) * ratio;
                const y = 80 + (20 - 80) * ratio; // inverted axis

                return (
                  <g transform={`translate(${x}, ${y})`}>
                    <circle r="6" fill="rgba(14, 165, 233, 0.4)" className="animate-ping" />
                    <circle r="4" fill="#0ea5e9" stroke="#ffffff" strokeWidth="1" />
                  </g>
                );
              })()}
            </svg>

            {/* API Key Instructions */}
            <div className="relative z-10 w-full max-w-sm mx-auto bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 shadow-2xl flex flex-col gap-2.5 mt-2 text-xs">
              <div className="flex gap-2 text-amber-400 font-bold items-center">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Google Maps API Key Inactive</span>
              </div>
              <p className="text-slate-300 leading-normal text-[11px] font-sans">
                To explore live Google Street & Satellite vectors of your drivers on real streets:
              </p>
              <div className="text-[11px] text-slate-400 space-y-1 bg-black/40 p-2.5 rounded font-sans leading-relaxed border border-slate-800">
                <p>1. Get an API Key: <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-sky-400 font-semibold underline hover:text-sky-300">Google Cloud Console</a>.</p>
                <p>2. Open **Settings** (⚙️ top-right) → **Secrets**.</p>
                <p>3. Enter `GOOGLE_MAPS_PLATFORM_KEY` with your actual token.</p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-sky-400 font-semibold bg-sky-950/20 px-2 py-1.5 rounded border border-sky-900/30">
                <span>⚡ Active Simulation Connected</span>
                <span className="font-mono text-[9px] uppercase bg-sky-950 px-1 text-slate-300 border border-slate-800">Telemetry Active</span>
              </div>
            </div>

            {/* Quick Stats Overlay (Footer) */}
            <div className="relative z-10 flex justify-between bg-black/60 border border-slate-800/80 rounded-lg p-2.5 backdrop-blur-sm text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-slate-400 animate-spin" style={{ animationDuration: '6s' }} />
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-500">Telemetry Lat/Lng</div>
                  <span className="text-slate-300">{vehiclePos.lat.toFixed(5)}, {vehiclePos.lng.toFixed(5)}</span>
                </div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 text-right">Driver Info</div>
                <span className="text-slate-200 block text-right font-bold truncate max-w-[120px]">{trip.driverName || 'No Driver'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* METRIC CARD BAR */}
      <div className="grid grid-cols-2 divide-x divide-slate-850 bg-[#070b13] py-2.5 text-center text-xs">
        <div>
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-0.5">Pickup Location</div>
          <p className="text-slate-200 font-bold truncate px-3">{trip.pickupAddress}</p>
        </div>
        <div>
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-0.5">Dropoff / Destination</div>
          <p className="text-slate-200 font-bold truncate px-3">{trip.dropoffAddress || trip.returnLocations}</p>
        </div>
      </div>
    </div>
  );
}
