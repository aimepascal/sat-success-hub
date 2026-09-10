import { Link } from "@tanstack/react-router";
import { InstallAppButton } from "@/components/InstallAppButton";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-elevated">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} SAT Hub. Built for global scholars.</p>
        <div className="flex items-center gap-5">
          <InstallAppButton />
          <Link to="/impact" className="hover:text-foreground">Impact</Link>
          <Link to="/auth" className="hover:text-foreground">Join</Link>
        </div>
      </div>
    </footer>
  );
}
