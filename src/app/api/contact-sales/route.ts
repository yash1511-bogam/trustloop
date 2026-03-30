import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { sendEnterpriseContactEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().min(1).max(200),
  phone: z.string().max(50).optional().default(""),
  message: z.string().max(2000).optional().default(""),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  const auth = await getAuth();
  const { name, email, company, phone, message } = parsed.data;

  await prisma.enterpriseContactInquiry.create({
    data: {
      workspaceId: auth?.user.workspaceId ?? null,
      name,
      email,
      company,
      phone: phone || null,
      message: message || null,
    },
  });

  try {
    await sendEnterpriseContactEmail({ toEmail: email, name, company });
  } catch (e) {
    log.billing.error("Enterprise contact email failed", {
      email,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return NextResponse.json({ ok: true });
}
