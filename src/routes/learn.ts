import { createFileRoute } from "@tanstack/react-router";
import learnHtml from "../../public/learn/index.html?raw";

// /learn is a static page whose files live in public/learn. Static hosting
// only maps /learn/ to its index.html, so this route answers /learn itself
// with the same file. Its <base href="/learn/"> loads the rest from there.
export const Route = createFileRoute("/learn")({
  server: {
    handlers: {
      GET: () =>
        new Response(learnHtml, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=0, must-revalidate",
          },
        }),
    },
  },
});
