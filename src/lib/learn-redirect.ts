import { redirect } from "@tanstack/react-router";

// /learn (public/learn) replaced the old home, Explore/Dashboard and Vault
// pages. Their routes stay only to send visitors there: a server redirect for
// direct visits and bookmarks, and a full-page redirect for in-app links
// (/learn is a static page, not a router route).
export const LEARN_PATH = "/learn";

export function redirectToLearn(status: 301 | 302) {
  return {
    server: {
      handlers: {
        GET: ({ request }: { request: Request }) => {
          const { search } = new URL(request.url);
          return new Response(null, { status, headers: { location: LEARN_PATH + search } });
        },
      },
    },
    beforeLoad: () => {
      throw redirect({ href: LEARN_PATH, reloadDocument: true });
    },
  };
}
