// Generates the PWA service worker AFTER the full build (vite + nitro) has
// finished, directly into the real deployable output directory.
//
// Why this exists: vite-plugin-pwa's `generateSW` strategy runs during the
// Vite client build and writes into `dist/client` — but this project's
// TanStack Start + Nitro pipeline emits the actual deployable client assets
// somewhere else entirely, bypassing `dist/client` entirely. That meant the
// previous in-plugin config silently precached 0 files and the resulting
// sw.js never even made it into the deployed output — the "Install app"
// button and offline support were dead on production.
//
// Where "somewhere else" actually is depends on which Nitro preset runs:
// a plain local `vite build` uses the generic node preset and writes static
// assets to `.output/public`. On Vercel, Nitro auto-detects the platform and
// switches to its Vercel preset, which skips `.output/public` altogether and
// writes straight into `.vercel/output/static` (the exact folder Vercel's
// static file server reads from). We check both, in order, and use whichever
// one the build actually produced.
//
// Running workbox-build's generateSW() here, after `vite build` completes,
// against the real output directory fixes both problems: it precaches the
// real hashed asset filenames, and writes sw.js to the exact folder that
// actually gets served in production.
import { generateSW } from "workbox-build";
import { existsSync } from "node:fs";

const CANDIDATE_DIRS = [".vercel/output/static", ".output/public"];
const OUT_DIR = CANDIDATE_DIRS.find(existsSync);

if (!OUT_DIR) {
  console.error(
    `[generate-sw] none of ${CANDIDATE_DIRS.join(", ")} exist — did the build run first?`
  );
  process.exit(1);
}

console.log(`[generate-sw] using output directory: ${OUT_DIR}`);

const { count, size, warnings } = await generateSW({
  swDest: `${OUT_DIR}/sw.js`,
  globDirectory: OUT_DIR,
  globPatterns: ["**/*.{js,css,png,jpg,jpeg,svg,webp,woff2}"],
  globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js"],
  navigateFallback: "/",
  navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "sat-hub-pages",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      urlPattern: ({ url, request }) =>
        url.origin === self.location.origin &&
        ["style", "script", "image", "font"].includes(request.destination),
      handler: "CacheFirst",
      options: {
        cacheName: "sat-hub-assets",
        expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
  ],
});

for (const warning of warnings) console.warn(`[generate-sw] ${warning}`);

if (count === 0) {
  console.error("[generate-sw] Precached 0 files — something is still wrong with globDirectory.");
  process.exit(1);
}

console.log(`[generate-sw] Precached ${count} files (${(size / 1024 / 1024).toFixed(2)} MB) into ${OUT_DIR}/sw.js`);
