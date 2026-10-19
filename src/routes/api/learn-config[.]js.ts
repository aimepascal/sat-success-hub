import { createFileRoute } from "@tanstack/react-router";

// The static /learn page (public/learn) cannot read Vite env vars, so it loads
// this script to get the same Supabase project and publishable key the Hub
// uses. Only public values: the publishable key is already in the Hub bundle.
export const Route = createFileRoute("/api/learn-config.js")({
  server: {
    handlers: {
      GET: () => {
        const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const key =
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          "";
        if (!url || !key) console.error("[learn-config] Missing Supabase URL or publishable key");
        return new Response(`window.LEARN_CONFIG=${JSON.stringify({ url, key })};\n`, {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
