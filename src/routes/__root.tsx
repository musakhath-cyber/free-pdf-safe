import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { PwaRegister } from "@/components/pwa/register";
import appCss from "../styles.css?url";

const APP_NAME = "Free PDF Safe";

const fetchSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  return user ? { id: user.id, email: user.email } : null;
});

export const Route = createRootRoute({
  beforeLoad: async () => ({ sessionUser: await fetchSessionUser() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Convert photos and documents to PDF, stamp a signature, and scan QR codes — all on this device.",
      },
      { name: "theme-color", content: "#eef2f7" },
      { property: "og:title", content: APP_NAME },
      {
        property: "og:description",
        content: "Convert photos and docs to PDF, stamp signatures, and scan QR codes — privately in the browser.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://freepdfsafe.online" },
      { property: "og:image", content: "https://freepdfsafe.online/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "robots", content: "index, follow" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "canonical", href: "https://freepdfsafe.online" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: () => (
    <html lang="en-ZA" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script async src="https://plausible.io/js/pa-7vdfJRpi29HHk_i8jagPk.js" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};if(location.hostname==="freepdfsafe.online")plausible.init()',
          }}
        />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <PwaRegister />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
