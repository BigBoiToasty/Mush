// The old Vercel copy of Mush moved to https://mush.christopherle.org.
// Browsers that still have its offline app installed fetch this file when
// they check for an update. It replaces the old app: deletes its saved copy,
// removes itself, and reloads open tabs so they follow the redirect.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
    await self.registration.unregister()
    const tabs = await self.clients.matchAll({ type: 'window' })
    tabs.forEach((tab) => tab.navigate(tab.url))
  })())
})
