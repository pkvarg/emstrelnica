export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerAllJobs } = await import("@/lib/jobs");
    try {
      await registerAllJobs();
    } catch (e) {
      console.error("[instrumentation] pg-boss registration failed:", e);
    }
  }
}
