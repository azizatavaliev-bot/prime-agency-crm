import { NextResponse } from "next/server";
import { runReminders, runTaskDigest } from "@/lib/reminders";

/** Крон: GET /api/cron/reminders?key=CRON_KEY */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_KEY || key !== process.env.CRON_KEY)
    return new NextResponse("forbidden", { status: 403 });
  // ?digest=1 — утренняя сводка по задачам (ставится на 9:00),
  // без него — обычный прогон напоминаний.
  const digest = new URL(req.url).searchParams.get("digest") === "1";
  const log = digest ? await runTaskDigest() : await runReminders();
  return NextResponse.json({ ok: true, sent: log.length, log });
}
