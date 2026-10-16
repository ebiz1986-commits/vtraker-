import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import http from "http";
import fs from "fs";
// @ts-ignore
import { sendSms, bookingMsg } from "./server/sms.js";

// Firebase project details, used to verify callers and read their role
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
} catch (err) {
  console.warn("Notice: Firebase config not loaded:", err);
}

// Returns the caller's uid if the Firebase ID token is valid, otherwise null
async function verifyIdToken(idToken: string): Promise<string | null> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  return data.users?.[0]?.localId || null;
}

// Reads users/{uid} with the caller's own token, so Firestore rules decide what they can see
async function getUserRole(idToken: string, uid: string): Promise<string | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${uid}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!res.ok) return null;
  const data: any = await res.json();
  return data.fields?.role?.stringValue || null;
}

// Only signed-in admins may trigger SMS sends
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!idToken) {
    return res.status(401).json({ ok: false, error: "Sign in required" });
  }
  try {
    const uid = await verifyIdToken(idToken);
    if (!uid) {
      return res.status(401).json({ ok: false, error: "Invalid or expired session" });
    }
    const role = await getUserRole(idToken, uid);
    if (role !== "admin") {
      return res.status(403).json({ ok: false, error: "Admin access required" });
    }
    next();
  } catch (err: any) {
    console.error("Admin check failed:", err?.message || err);
    return res.status(500).json({ ok: false, error: "Could not verify access" });
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const httpServer = http.createServer(app);

  app.use(express.json());

  // API endpoint for sending SMS for confirmed bookings to passenger/user (admins only).
  // The Text.lk API key is read from the server environment (TEXTLK_API_KEY), never from the request.
  app.post("/api/sms/send-booking", requireAdmin, async (req, res) => {
    try {
      const { phone, booking, senderId } = req.body;
      const mobile = phone || booking?.passengerPhone || booking?.userPhone || booking?.phone;

      if (!mobile) {
        return res.status(400).json({ ok: false, error: "Passenger mobile number is required" });
      }

      let activeSenderId = senderId;
      if (!activeSenderId || activeSenderId === "NotifyDEMO" || activeSenderId === "TextLKDemo") {
        activeSenderId = "SKO-VBOOK";
      }

      const formattedBooking = {
        refNo: booking?.refNo || booking?.id || "N/A",
        passenger: booking?.passenger || booking?.passengerName || "Passenger",
        from: booking?.from || booking?.pickupAddress || "Pickup",
        to: booking?.to || booking?.dropoffAddress || booking?.returnLocations || "Destination",
        date: booking?.date || booking?.requestedDate || "",
        time: booking?.time || booking?.requestedStartTime || "",
        vehicleNo: booking?.vehicleNo || booking?.vehicleName || "Vehicle",
        driverName: booking?.driverName || "",
        driverPhone: booking?.driverPhone || ""
      };

      const messageText = bookingMsg(formattedBooking);
      const result = await sendSms(mobile, messageText, activeSenderId);
      return res.json({ ok: true, result, smsUid: result?.uid || null, smsSentAt: new Date() });
    } catch (err: any) {
      console.error("SMS failed:", err?.message || err);
      return res.status(500).json({ ok: false, error: err?.message || "SMS sending failed" });
    }
  });

  // Determine if we are running in development mode (e.g. via dev script or typescript server directly)
  const isDev = process.env.NODE_ENV !== "production" && !process.argv.some(arg => arg.includes("server.cjs")) || process.argv.some(arg => arg.includes("server.ts"));

  // Vite middleware for development
  if (isDev) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          server: httpServer,
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files BEFORE the SPA fallback
    const distPath = path.join(process.cwd(), "dist");
    
    // Explicitly serve static assets
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.json') || filePath.endsWith('.webmanifest')) {
          res.setHeader('Content-Type', 'application/json');
        } else if (filePath.endsWith('.ico')) {
          res.setHeader('Content-Type', 'image/x-icon');
        }
      }
    }));
    
    // SPA fallback: Send index.html for unknown routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} bound to 0.0.0.0`);
  });
}

startServer();
