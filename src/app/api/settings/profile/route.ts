import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuthAndRateLimit } from "@/lib/api-guard";
import { badRequest, forbidden } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const phonePattern = /^\+[1-9]\d{7,14}$/;

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || phonePattern.test(value), {
      message: "Phone must be in E.164 format.",
    })
    .optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const profile = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
    },
  });

  return NextResponse.json({ profile });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = await requireApiAuthAndRateLimit(request);
  if (access.response) {
    return access.response;
  }
  const auth = access.auth;
  if (auth.kind !== "session") {
    return forbidden();
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid profile payload.");
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      name: parsed.data.name?.trim() || undefined,
      phone: parsed.data.phone?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
    },
  });

  return NextResponse.json({ profile: updated });
}
