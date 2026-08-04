import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

/** Крон: GET /api/cron/reminders?key=CRON_KEY */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (process.env.CRON_KEY && key !== process.env.CRON_KEY)
    return new NextResponse("forbidden", { status: 403 });
  const log = await runReminders();
  return NextResponse.json({ ok: true, sent: log.length, log });
}
