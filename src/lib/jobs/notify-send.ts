import type { PgBoss } from "pg-boss";
import { callHono, logNotification } from "@/lib/notify";
import { startPgBoss } from "@/lib/pgboss";

export const NOTIFY_SEND = "notify.send";
export const NOTIFY_SEND_DLQ = "notify.send.dlq";

export interface NotifyJobLog {
  channel: "email" | "sms";
  to: string;
  template: string;
  locale: string;
  subject?: string;
  bookingId?: string;
  userId?: string;
}

export interface NotifyJobData {
  endpoint: string;
  payload: Record<string, unknown>;
  log: NotifyJobLog | null;
}

export async function registerNotifySendHandler(boss: PgBoss) {
  await ensureNotifyQueue(boss);

  await boss.work<NotifyJobData>(NOTIFY_SEND, async (jobs) => {
    for (const job of jobs) {
      const { endpoint, payload, log } = job.data;
      const result = await callHono(endpoint, payload);
      if (!result.success) {
        throw new Error(
          `[notify.send] ${endpoint} failed: ${result.error ?? "unknown"}`,
        );
      }
      if (log) {
        await logNotification({
          ...log,
          status: "sent",
          providerResponse: result,
        });
      }
    }
  });

  await boss.work<NotifyJobData>(NOTIFY_SEND_DLQ, async (jobs) => {
    for (const job of jobs) {
      const { endpoint, log } = job.data;
      console.error(
        `[notify.send.dlq] permanent failure for ${endpoint}`,
        job.data,
      );
      if (log) {
        await logNotification({
          ...log,
          status: "failed",
          providerResponse: { error: "max retries exceeded" },
        });
      }
    }
  });
}

let queueEnsured = false;

async function ensureNotifyQueue(boss: PgBoss) {
  if (queueEnsured) return;
  await boss.createQueue(NOTIFY_SEND_DLQ);
  await boss.createQueue(NOTIFY_SEND, {
    retryLimit: 10,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 3600,
    deadLetter: NOTIFY_SEND_DLQ,
  });
  queueEnsured = true;
}

export async function enqueueNotify(data: NotifyJobData) {
  const boss = await startPgBoss();
  await ensureNotifyQueue(boss);
  await boss.send(NOTIFY_SEND, data);
}
