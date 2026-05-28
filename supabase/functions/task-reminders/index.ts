import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const appUrl = Deno.env.get("APP_URL") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

  const res = await fetch(`${appUrl}/api/cron/task-reminders`, {
    headers: {
      "x-cron-secret": cronSecret,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
