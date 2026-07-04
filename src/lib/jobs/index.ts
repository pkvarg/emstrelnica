import { startPgBoss } from "@/lib/pgboss";
import { registerBookingExpiryHandler } from "./booking-expiry";
import { registerBookingReminderHandler } from "./booking-reminder";
import { registerNoShowHandler } from "./booking-noshow";
import { registerAutoCompleteHandler } from "./booking-autocomplete";
import { registerRetentionSweepHandler, scheduleRetentionSweep } from "./retention-sweep";
import {
  registerMembershipRolloverHandler,
  registerMembershipReminderHandler,
  scheduleMembershipCrons,
} from "./membership";
import { registerNotifySendHandler } from "./notify-send";

let registered = false;

export async function registerAllJobs() {
  if (registered) return;

  const boss = await startPgBoss();
  await registerNotifySendHandler(boss);
  await registerBookingExpiryHandler(boss);
  await registerBookingReminderHandler(boss);
  await registerNoShowHandler(boss);
  await registerAutoCompleteHandler(boss);
  await registerRetentionSweepHandler(boss);
  await registerMembershipRolloverHandler(boss);
  await registerMembershipReminderHandler(boss);

  await scheduleRetentionSweep(boss);
  await scheduleMembershipCrons(boss);

  registered = true;
}
