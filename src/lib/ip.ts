import { headers } from "next/headers";

export async function getClientIp(): Promise<string | null> {
  const hdrs = await headers();
  const raw =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip")?.trim() ||
    null;
  if (!raw || raw === "::1" || raw === "127.0.0.1") return "localhost";
  return raw;
}
