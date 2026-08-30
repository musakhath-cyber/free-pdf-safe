import { useEffect, useRef } from "react";

export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const apply = () => {
      video.playbackRate = 0.8;
    };
    apply();
    video.addEventListener("loadedmetadata", apply);
    video.addEventListener("play", apply);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseIfNeeded = () => {
      if (reduce.matches) video.pause();
      else void video.play().catch(() => {});
    };
    pauseIfNeeded();
    reduce.addEventListener("change", pauseIfNeeded);
    return () => {
      video.removeEventListener("loadedmetadata", apply);
      video.removeEventListener("play", apply);
      reduce.removeEventListener("change", pauseIfNeeded);
    };
  }, []);

  return (
    <div className="hero-video-wrap" aria-hidden="true">
      <video
        ref={ref}
        className="hero-video"
        src="/hero-knight.mp4"
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        disablePictureInPicture
      />
    </div>
  );
}
