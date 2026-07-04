"use server";

const HONO_URL = process.env.NEXT_PUBLIC_HONO_API_URL || "http://localhost:3013";

export async function incrementVisitors() {
  try {
    await fetch(`${HONO_URL}/api/visitors/strelnica/increase`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch (e) {
    console.error("Failed to increment visitors:", e);
  }
}

export async function incrementBots() {
  try {
    await fetch(`${HONO_URL}/api/bots/strelnica/increase`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch (e) {
    console.error("Failed to increment bots:", e);
  }
}

export async function incrementEmails() {
  try {
    await fetch(`${HONO_URL}/api/emails/strelnica/increase`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch (e) {
    console.error("Failed to increment emails:", e);
  }
}
