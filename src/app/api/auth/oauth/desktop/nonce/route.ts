import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { redisSet } from "@/lib/redis";

export async function POST(): Promise<NextResponse> {
  const nonce = randomBytes(24).toString("hex");
  await redisSet(`desktop:oauth-nonce:${nonce}`, "1", 600);
  return NextResponse.json({ nonce });
}
