import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Menu, X } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";

export function SiteHeader() {
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin(userId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const navLinks = userId
    ? [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/vault", label: "Vault" },
        { to: "/forum", label: "Forum" },
        { to: "/scholarships", label: "Scholarships" },
        { to: "/impact", label: "Impact" },
        ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
      ]
    : [
        { to: "/impact", label: "Impact" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>SAT Hub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-muted text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {userId ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/auth">Log in</Link></Button>
              <Button size="sm" asChild><Link to="/auth" search={{ mode: "signup" }}>Join free</Link></Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="flex flex-col px-4 py-3">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
                {l.label}
              </Link>
            ))}
            {userId ? (
              <Button variant="outline" size="sm" className="mt-2" onClick={handleSignOut}>Sign out</Button>
            ) : (
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1"><Link to="/auth">Log in</Link></Button>
                <Button size="sm" asChild className="flex-1"><Link to="/auth">Join</Link></Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
