// sw.js - Service Worker for the virtual file system

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const getFileFromMainThread = async (path) => {
  const [client] = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  if (!client) return null;

  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data.error) {
        resolve(null);
      } else {
        resolve(event.data);
      }
    };
    client.postMessage({ type: 'GET_FILE', path }, [channel.port2]);
  });
};


self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle requests from our preview origin
  if (url.hostname.endsWith('.vfs.local')) {
    event.respondWith((async () => {
      let path = url.pathname;
      
      // The bundler outputs TSX as the entrypoint
      if(path === '/index.tsx'){
        path = '/bundle.js'
      }

      const fileData = await getFileFromMainThread(path);
      
      if (fileData && fileData.found) {
        const headers = {
          'Content-Type': fileData.mimeType || 'application/octet-stream',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        };
        return new Response(fileData.content, { headers });
      } else {
        console.warn(`[SW] File not found: ${path}`);
        return new Response('File not found', { status: 404 });
      }
    })());
  }
});
