'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Unregister SW lama yang mungkin corrupt/stuck dulu
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        const staleRegistrations = registrations.filter(
          (reg) => reg.active && !reg.active.scriptURL.includes('/sw.js')
        );
        staleRegistrations.forEach((reg) => reg.unregister());
      });

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('SW registered:', reg.scope);
          // Force update cek setiap kali halaman dibuka
          reg.update();
        })
        .catch((err) => {
          console.warn('SW registration failed:', err);
        });
    }
  }, []);

  return null;
}
