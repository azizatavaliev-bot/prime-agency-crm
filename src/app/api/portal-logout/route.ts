import { NextResponse } from "next/server";
import { clientLogout } from "@/lib/auth";

export async function POST(req: Request) {
  await clientLogout();
  return NextResponse.redirect(new URL("/portal/login", req.url), 303);
}
