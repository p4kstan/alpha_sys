/**
 * FacebookPixel.tsx
 * ─────────────────
 * Fetches the Facebook Pixel ID from app_settings and injects
 * the full Meta Pixel script into <head> at runtime.
 *
 * - Automatically fires PageView on every route change via React Router.
 * - Safe to render multiple times — will only inject the script once.
 * - No pixel ID = no-op (nothing injected).
 */

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

/** Fetch the Pixel ID from DB (cached 10 min) */
function useFacebookPixelId() {
  return useQuery({
    queryKey: ["app-setting-facebook-pixel"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "facebook_pixel_id")
        .maybeSingle();
      return (data?.value as string | null) ?? null;
    },
    staleTime: 10 * 60_000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/** Inject Meta Pixel base code once and track PageViews on route changes */
export function FacebookPixel() {
  const { data: pixelId } = useFacebookPixelId();
  const injectedRef = useRef(false);
  const location = useLocation();

  // Inject the base pixel script (runs once when pixelId is first available)
  useEffect(() => {
    if (!pixelId || injectedRef.current) return;

    injectedRef.current = true;

    // Base pixel script
    const script = document.createElement("script");
    script.id = "facebook-pixel-base";
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // noscript fallback
    const noscript = document.createElement("noscript");
    noscript.id = "facebook-pixel-noscript";
    const img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.head.appendChild(noscript);
  }, [pixelId]);

  // Fire PageView on every route change
  useEffect(() => {
    if (!pixelId || !window.fbq) return;
    window.fbq("track", "PageView");
  }, [location.pathname, pixelId]);

  return null;
}
