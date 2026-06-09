import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import http from "http";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // Determine if we are running in development mode (e.g. via dev script or typescript server directly)
  const isDev = process.env.NODE_ENV !== "production" || process.argv.some(arg => arg.includes("server.ts"));

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
