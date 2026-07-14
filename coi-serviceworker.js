/*! coi-serviceworker v0.1.7 | MIT License | https://github.com/gzguidoti/coi-serviceworker */
if (typeof window === "undefined") {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
    self.addEventListener("fetch", (e) => {
        if (e.request.mode === "navigate" || (e.request.mode === "cors" && e.request.url.startsWith(self.location.origin))) {
            e.respondWith(
                fetch(e.request)
                    .then((response) => {
                        if (response.status === 0) return response;
                        const newHeaders = new Headers(response.headers);
                        newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
                        return new Response(response.body, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: newHeaders,
                        });
                    })
                    .catch((e) => console.error(e))
            );
        }
    });
} else {
    (() => {
        if (window.crossOriginIsolated) return;
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register(window.document.currentScript.src).then((registration) => {
                registration.addEventListener("updatefound", () => {
                    location.reload();
                });
                if (registration.active && !navigator.serviceWorker.controller) {
                    location.reload();
                }
            });
        }
    })();
}
