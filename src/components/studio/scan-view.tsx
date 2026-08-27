import { Check, Copy, ExternalLink, ScanLine, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { decodeQrFromCanvas, decodeQrFromFile, isHttpUrl } from "@/lib/pdf/qr";
import { formatClock, uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";

export function ScanView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { scans, addScan, removeScan } = useStudio();

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (!live) return;
    let frame = 0;
    let ticking = false;
    const tick = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        frame = requestAnimationFrame(() => {
          void tick();
        });
        return;
      }
      if (!ticking) {
        ticking = true;
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const value = await decodeQrFromCanvas(canvas, video);
          if (value) {
            addScan({ id: uid(), text: value, at: Date.now() });
            toast.success("QR code read");
            stopCamera();
            ticking = false;
            return;
          }
        }
        ticking = false;
      }
      frame = requestAnimationFrame(() => {
        void tick();
      });
    };
    frame = requestAnimationFrame(() => {
      void tick();
    });
    return () => cancelAnimationFrame(frame);
  }, [addScan, live]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setLive(true);
    } catch {
      setError("Camera is blocked. Upload a screenshot instead.");
      setLive(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
    setLive(false);
  }

  async function onFile(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    try {
      const value = await decodeQrFromFile(file);
      if (!value) {
        toast.error("No QR code in that image.");
        return;
      }
      addScan({ id: uid(), text: value, at: Date.now() });
      toast.success("QR code read");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that image.");
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Could not copy.");
    }
  }

  const latest = scans[0];

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void onFile(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="relative overflow-hidden rounded-xl bg-ink">
        <video
          ref={videoRef}
          className={`aspect-[3/4] w-full object-cover ${live ? "opacity-100" : "opacity-0"}`}
          playsInline
          muted
          autoPlay
        />
        {!live ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-lg bg-white/10 text-primary-fg">
              <ScanLine className="size-5" strokeWidth={1.75} />
            </span>
            <p className="font-display text-xl text-primary-fg">Point at a code</p>
            <p className="max-w-[32ch] text-sm text-primary-fg/70">
              The camera never uploads. You can also drop in a screenshot.
            </p>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="finder" />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {live ? (
          <Button variant="secondary" className="flex-1" onClick={stopCamera}>
            Stop camera
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => void startCamera()}>
            Start camera
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={() => fileRef.current?.click()}>
          Upload image
        </Button>
      </div>

      {latest ? (
        <article className="panel space-y-3 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">Latest</p>
          <p className="break-all text-sm text-fg">{latest.text}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => void copyText(latest.text)}>
              {copied === latest.text ? <Check /> : <Copy />}
              {copied === latest.text ? "Copied" : "Copy"}
            </Button>
            {isHttpUrl(latest.text) ? (
              <Button size="sm" variant="secondary" onClick={() => window.open(latest.text, "_blank", "noopener")}>
                <ExternalLink />
                Open link
              </Button>
            ) : null}
          </div>
        </article>
      ) : null}

      {scans.length > 1 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-fg">Recent on this device</h2>
          <ul className="space-y-2">
            {scans.slice(1).map((scan) => (
              <li key={scan.id} className="panel flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{scan.text}</p>
                  <p className="text-xs text-subtle">{formatClock(scan.at)}</p>
                </div>
                <button
                  type="button"
                  className="flex size-9 items-center justify-center text-muted"
                  aria-label="Remove scan"
                  onClick={() => removeScan(scan.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
