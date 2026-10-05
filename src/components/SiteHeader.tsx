import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { canReviewQuestions, useRoles } from "@/hooks/use-roles";
import { LANGUAGES, setLanguage, useI18n, type Language } from "@/lib/i18n";
import { learningDb } from "@/lib/learning/db";
import logoUrl from "@/assets/logo.png";

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

  const { t, language } = useI18n();
  const { data: roles } = useRoles(userId);

  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    // Remembered on the account too, when there is one. Ignored if it fails:
    // the choice is already saved on this device.
    if (userId) void learningDb.from("profiles").update({ language: next }).eq("id", userId);
  };

  const languageSwitch = (
    <div className="flex items-center rounded-md border border-border p-0.5" role="group" aria-label={t("language.label")}>
      {LANGUAGES.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => chooseLanguage(option.code)}
          aria-pressed={language === option.code}
          title={option.label}
          className={`rounded px-2 py-1 text-xs font-semibold uppercase ${language === option.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {option.code}
        </button>
      ))}
    </div>
  );

  const navLinks = [
    ...(userId ? [{ to: "/today", label: t("nav.today") }] : []),
    { to: "/dashboard", label: userId ? "Dashboard" : "Explore" },
    { to: "/vault", label: "Vault" },
    { to: "/forum", label: "Forum" },
    { to: "/impact", label: "Impact" },
    ...(canReviewQuestions(roles) ? [{ to: "/review-desk", label: t("nav.reviewDesk") }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight" aria-label="Imboni SAT Success Hub home">
          <img src={logoUrl} alt="" width={32} height={32} className="h-8 w-8" />
          <span>Imboni SAT Success Hub</span>
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
          {languageSwitch}
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
            <div className="mb-2 self-start">{languageSwitch}</div>
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
