/**
 * Utility to clear the browser cache memory, local storage, and session storage.
 * Does not affect passwords or saved credentials which are securely managed
 * by the browser's credential manager.
 */
export function clearBrowserCacheMemory() {
  console.log('[Cache Clear] Initiating cache and memory purge...');

  // 1. Clear LocalStorage (preserving theme settings to avoid high-contrast flashing on loading)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const theme = localStorage.getItem('sko-vbooking-theme');
      localStorage.clear();
      if (theme) {
        localStorage.setItem('sko-vbooking-theme', theme);
      }
      console.log('[Cache Clear] LocalStorage cleared successfully.');
    }
  } catch (e) {
    console.warn('[Cache Clear] LocalStorage clear blocked or unvailable:', e);
  }

  // 2. Clear SessionStorage
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear();
      console.log('[Cache Clear] SessionStorage cleared successfully.');
    }
  } catch (e) {
    console.warn('[Cache Clear] SessionStorage clear blocked or unavailable:', e);
  }

  // 3. Clear CacheStorage API (caches stored index files, image assets, static chunks, sw caches)
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then((cacheNames) => {
        Promise.all(
          cacheNames.map((cacheName) => {
            console.log(`[Cache Clear] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        ).then(() => {
          console.log('[Cache Clear] CacheStorage cleared successfully.');
        });
      }).catch((err) => {
        console.error('[Cache Clear] Failed to retrieve cache keys:', err);
      });
    }
  } catch (e) {
    console.warn('[Cache Clear] CacheStorage API not supported or blocked:', e);
  }

  // 4. Update and refresh active Service Workers to load newest server files
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          reg.update().catch((e) => console.log('[Cache Clear] Worker update deferred:', e));
        });
      });
    }
  } catch (e) {
    console.warn('[Cache Clear] ServiceWorker registry access failed:', e);
  }
}
