import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import http from "http";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
// @ts-ignore
import { sendSms, bookingMsg } from "./server/sms.js";

// Initialize Firebase for server-side settings lookup
let serverDb: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const serverFbApp = initializeApp(configData, "server-fb-app");
    serverDb = getFirestore(serverFbApp, configData.firestoreDatabaseId);
  }
} catch (err) {
  console.warn("Notice: Server-side Firebase config not loaded:", err);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const httpServer = http.createServer(app);

  app.use(express.json());

  // API endpoint for sending SMS for confirmed bookings to passenger/user
  app.post("/api/sms/send-booking", async (req, res) => {
    try {
      const { phone, booking, senderId, apiKey } = req.body;
      const mobile = phone || booking?.passengerPhone || booking?.userPhone || booking?.phone;

      if (!mobile) {
        return res.status(400).json({ ok: false, error: "Passenger mobile number is required" });
      }

      let activeSenderId = senderId;
      let activeApiKey = apiKey;

      // If senderId or apiKey was not provided in request body, fetch from Firestore settings/system
      if ((!activeSenderId || !activeApiKey) && serverDb) {
        try {
          const sysSnap = await getDoc(doc(serverDb, "settings", "system"));
          if (sysSnap.exists()) {
            const sysData = sysSnap.data();
            if (!activeSenderId && sysData.smsSenderId) activeSenderId = sysData.smsSenderId;
            if (!activeApiKey && sysData.smsApiKey) activeApiKey = sysData.smsApiKey;
          }
        } catch (fErr) {
          console.warn("Could not fetch system SMS config from Firestore:", fErr);
        }
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
      const result = await sendSms(mobile, messageText, activeSenderId, activeApiKey);
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
