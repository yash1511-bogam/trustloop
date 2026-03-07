import { NextRequest, NextResponse } from "next/server";
import { AiProvider } from "@prisma/client";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest } from "@/lib/http";
import { testProviderKey } from "@/lib/ai/service";

const testSchema = z.object({
  provider: z.nativeEnum(AiProvider),
  apiKey: z.string().min(8).max(512),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit();
  if (access.response) {
    return access.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid key test payload.");
  }

  const result = await testProviderKey({
    provider: parsed.data.provider,
    apiKey: parsed.data.apiKey.trim(),
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
