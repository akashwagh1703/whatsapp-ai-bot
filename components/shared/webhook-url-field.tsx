"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { getWebhookUrl } from "@/lib/app-url";

/** Webhook URL: env on SSR; falls back to window.origin only after mount. */
export function WebhookUrlField({ readOnly = true }: { readOnly?: boolean }) {
  const [url, setUrl] = useState(getWebhookUrl);

  useEffect(() => {
    const fromEnv = getWebhookUrl();
    if (fromEnv.startsWith("http")) {
      setUrl(fromEnv);
      return;
    }
    setUrl(`${window.location.origin}/api/webhooks/whatsapp`);
  }, []);

  return (
    <Input
      readOnly={readOnly}
      value={url}
      className="font-mono text-xs"
      suppressHydrationWarning
    />
  );
}
