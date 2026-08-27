import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { BrandLockup } from "@/components/brand/logo";
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

function Login() {
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      setError(result.error.message ?? "Could not sign in.");
      return;
    }
    window.location.assign(redirect ?? "/");
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <BrandLockup subtitle="Sign in to open the owner desk — ads, notices, and future studio knobs." />
        {authEnabled ? (
          <div className="mt-6 space-y-3">
            {GROK_PROVIDERS.map((provider) => (
              <Button
                key={provider.providerId}
                variant="secondary"
                className="w-full"
                onClick={() => signIn(provider.providerId, { callbackURL: redirect })}
              >
                Continue with {provider.label}
              </Button>
            ))}
            {emailAndPasswordEnabled ? (
              <form className="email-form" onSubmit={onEmailSubmit}>
                <p className="form-kicker">Email and password</p>
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
      </div>
    </main>
  );
}
