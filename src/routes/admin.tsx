import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  claimAdmin,
  getAdminState,
  saveSiteSettings,
  type AdminSiteState,
} from "@/lib/site-settings";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [state, setState] = useState<AdminSiteState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAdminState()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load the owner desk.");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isPending) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-raised" />
          <div className="mt-4 h-6 w-40 animate-pulse rounded bg-raised" />
        </div>
      </main>
    );
  }
  if (!user) {
    return <Navigate to="/login" search={{ redirect: "/admin" }} />;
  }

  async function onClaim() {
    setClaiming(true);
    try {
      setState(await claimAdmin());
      toast.success("You now own this studio.");
    } catch {
      toast.error("Could not claim the studio.");
    } finally {
      setClaiming(false);
    }
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state?.isOwner) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const next = await saveSiteSettings({
        data: {
          adsEnabled: form.get("adsEnabled") === "on",
          adsensePublisherId: String(form.get("adsensePublisherId") ?? ""),
          adsenseSlotId: String(form.get("adsenseSlotId") ?? ""),
          siteNotice: String(form.get("siteNotice") ?? ""),
          tagline: String(form.get("tagline") ?? ""),
        },
      });
      setState(next);
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <BrandLockup subtitle="Owner desk. Turn ads on when you are ready, and keep the studio copy in one place." />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <UserButton />
          <Link to="/" className="text-link">
            Open studio
          </Link>
        </div>
      </header>

      {loadError ? <p className="form-error">{loadError}</p> : null}

      {!state ? (
        <div className="panel p-5">
          <div className="h-24 animate-pulse rounded-md bg-raised" />
        </div>
      ) : state.canClaim ? (
        <section className="panel p-5 space-y-4">
          <h1 className="section-title">Claim this studio</h1>
          <p className="text-sm text-muted">
            The first signed-in person here becomes the owner. Only the owner can allow ads or edit the
            public copy later.
          </p>
          <Button onClick={onClaim} disabled={claiming}>
            {claiming ? "Claiming…" : "Become owner"}
          </Button>
        </section>
      ) : !state.isOwner ? (
        <section className="panel p-5 space-y-3">
          <h1 className="section-title">Owner desk is taken</h1>
          <p className="text-sm text-muted">
            This live site already has an owner. You can still use Convert, Sign, and Scan — files stay
            on your device.
          </p>
          <Link to="/" className="text-link">
            Back to the studio
          </Link>
        </section>
      ) : (
        <form className="panel p-5 space-y-5" onSubmit={onSave}>
          <div>
            <h1 className="section-title">Site settings</h1>
            <p className="mt-1 text-sm text-muted">Changes show on the public studio as soon as you save.</p>
          </div>

          <label className="toggle-row">
            <span>
              <strong>Allow ads</strong>
              <span className="block text-sm font-normal text-muted">
                Shows an ad well on the studio. PDFs still never upload.
              </span>
            </span>
            <input
              type="checkbox"
              name="adsEnabled"
              defaultChecked={state.adsEnabled}
              className="toggle"
            />
          </label>

          <label className="field">
            <span>AdSense publisher ID</span>
            <input
              name="adsensePublisherId"
              defaultValue={state.adsensePublisherId}
              placeholder="ca-pub-xxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Ad slot ID</span>
            <input
              name="adsenseSlotId"
              defaultValue={state.adsenseSlotId}
              placeholder="Optional slot number"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Studio tagline</span>
            <input name="tagline" defaultValue={state.tagline} maxLength={160} />
          </label>

          <label className="field">
            <span>Public notice</span>
            <textarea
              name="siteNotice"
              defaultValue={state.siteNotice}
              rows={3}
              maxLength={280}
              placeholder="Optional banner on the studio, for updates or promotions."
            />
          </label>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      )}
      <Toaster position="top-center" theme="light" />
    </main>
  );
}
