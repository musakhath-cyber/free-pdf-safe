import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* preview hosts may block SW */
    });
  }, []);
  return null;
}

export function InstallLink() {
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!promptEvent) return null;

  return (
    <>
      <button
        type="button"
        className="text-link"
        onClick={() => {
          void promptEvent.prompt().then(() => setPromptEvent(null));
        }}
      >
        Install app
      </button>
      <span aria-hidden="true"> · </span>
    </>
  );
}
