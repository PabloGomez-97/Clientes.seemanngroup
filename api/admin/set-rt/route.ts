import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: Request) {
  const { rt, key } = await req.json();
  if (!rt || !key) return NextResponse.json({ ok: false }, { status: 400 });
  await kv.set(key, rt);
  return NextResponse.json({ ok: true });
}
