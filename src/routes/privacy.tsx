import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Imboni SAT Success Hub" },
      { name: "description", content: "How Imboni SAT Success Hub uses your name and email." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Imboni SAT Success Hub. Last updated October 2026.</p>
      <div className="mt-8 space-y-6">
          <section>
            <h2 className="font-display text-xl font-bold">What we collect</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">When you create an account we store your display name and email address. If you choose Continue with Google, Google shares your name and email with us. We do not receive your Google password.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold">Why we use it</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Only to sign you in, save your account, and let you take part in the forum. Lesson progress is saved on your own device.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold">What we never do</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">We do not sell your information, show ads, or share it with advertisers. We share it only with the services that run the site (our hosting and database providers), and only so the site works.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold">Your choices</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">You can ask us to delete your account and the data tied to it at any time. Email admin@imboniacademy.org.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold">Contact</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Imboni Academy, Kigali, Rwanda. Questions: admin@imboniacademy.org.</p>
          </section>
      </div>
      <p className="mt-10 text-sm"><Link to="/" className="font-medium text-primary hover:underline">Back to home</Link></p>
    </div>
  );
}
