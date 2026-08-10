import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getClientSession();
  if (!session) return new NextResponse(null, { status: 401 });

  const r = await prisma.adReport.findFirst({
    where: { id, clientId: session.clientId },
    select: { screenshot: true, screenshotMime: true },
  });
  if (!r || !r.screenshot) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(r.screenshot), {
    headers: {
      "Content-Type": r.screenshotMime || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
