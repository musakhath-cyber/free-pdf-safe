import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { BrandLockup } from "@/components/brand/logo";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";

type LoginSearch = { redirect: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" && search.redirect.startsWith("/") ? search.redirect : "/",
  }),
  component: Login,
});

function brokerSignInAvailable(hostname: string): boolean {
  return (
    hostname.endsWith(".grok-sandbox.com") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

function Login() {
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showBroker, setShowBroker] = useState(false);

  useEffect(() => {
    setShowBroker(brokerSignInAvailable(window.location.hostname));
  }, []);

  async function onEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const opts = { email: email.trim(), password, callbackURL: redirect };
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ ...opts, name: name.trim() || email.trim() })
        : await authClient.signIn.email(opts);
    setPending(false);
    if (result.error) {
      const message = result.error.message ?? "Could not sign in.";
      setError(
        message.toLowerCase().includes("invalid origin")
          ? "This live address was not trusted yet. Refresh once the new version is up, then try again."
          : message,
      );
      return;
    }
    window.location.assign(redirect ?? "/");
  }

  async function onBroker(providerId: string) {
    setError(null);
    setPending(true);
    try {
      await signIn(providerId, { callbackURL: redirect });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start sign-in.");
      setPending(false);
    }
  }

  return (
    <div className="site-page">
      <SiteHeader />
      <main className="auth-shell">
      <div className="auth-card">
        <BrandLockup subtitle="Convert, Sign, and Scan stay free. Sign in with email only to open the Owner’s Desk — ads, notices, and public copy." />
        {authEnabled ? (
          <div className="mt-6 space-y-3">
            {showBroker
              ? GROK_PROVIDERS.map((provider) => (
                  <Button
                    key={provider.providerId}
                    variant="secondary"
                    className="w-full"
                    disabled={pending}
                    onClick={() => onBroker(provider.providerId)}
                  >
                    Continue with {provider.label}
                  </Button>
                ))
              : (
                <p className="form-kicker">
                  On the live site, create an email account. The first account becomes the owner.
                </p>
              )}
            {emailAndPasswordEnabled ? (
              <form className="email-form" onSubmit={onEmailSubmit}>
                {showBroker ? <p className="form-kicker">Email and password</p> : null}
                {mode === "signup" ? (
                  <label className="field">
                    <span>Name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </label>
                ) : null}
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </label>
                {error ? <p className="form-error">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
                </Button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setMode(mode === "signup" ? "signin" : "signup");
                    setError(null);
                  }}
                >
                  {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Create one"}
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link to="/" className="text-link mt-6 inline-block">
          Back to the studio
        </Link>
        <p className="owner-link">
          <Link to="/privacy">Privacy</Link>
        </p>
      </div>
    </main>
    </div>
  );
}
