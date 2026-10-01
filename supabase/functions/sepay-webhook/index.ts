import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const textEncoder = new TextEncoder();

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function timingSafeEqual(a: string, b: string) {
  const aBytes = textEncoder.encode(a);
  const bBytes = textEncoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;

  let mismatch = 0;
  for (let index = 0; index < aBytes.length; index += 1) {
    mismatch |= aBytes[index] ^ bBytes[index];
  }
  return mismatch === 0;
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(message));
  return bytesToHex(signature);
}

async function verifyRequest(request: Request, rawBody: string) {
  const apiKey = Deno.env.get("SEPAY_WEBHOOK_API_KEY")?.trim();
  if (apiKey) {
    const authorization = request.headers.get("authorization") ?? "";
    const received = authorization.replace(/^Apikey\s+/i, "").trim();
    if (!received || !timingSafeEqual(received, apiKey)) {
      return false;
    }
  }

  const hmacSecret = Deno.env.get("SEPAY_WEBHOOK_SECRET")?.trim();
  if (hmacSecret) {
    const header = request.headers.get("x-sepay-signature") ?? "";
    const received = header.replace(/^sha256=/i, "").trim().toLowerCase();
    const expected = await hmacSha256Hex(hmacSecret, rawBody);
    if (!received || !timingSafeEqual(received, expected)) {
      return false;
    }
  }

  return true;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  const rawBody = await request.text();
  const verified = await verifyRequest(request, rawBody);
  if (!verified) {
    return json({ success: false, message: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ success: false, message: "Invalid JSON" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    return json({ success: false, message: "Webhook service is not configured" }, 503);
  }

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("process_sepay_webhook", { p_payload: payload });

  if (error) {
    console.error("SePay webhook processing failed", error);
    return json({ success: false, message: "Cannot process webhook" }, 500);
  }

  return json({ success: true, result: data });
});
