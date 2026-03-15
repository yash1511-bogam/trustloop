/**
 * Send invite code emails to verified early access users using the production database.
 *
 * Loads .env.prod so it uses the prod DATABASE_URL, RESEND_API_KEY, etc.
 *
 * Usage:
 *   pnpm tsx scripts/send-invite-codes-prod.ts              # dry-run (shows what would be sent)
 *   pnpm tsx scripts/send-invite-codes-prod.ts --send       # actually send emails
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.prod into process.env before any other imports
const envPath = resolve(__dirname, "..", ".env.prod");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

import { randomBytes } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function generateCode(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

async function main() {
  const shouldSend = process.argv.includes("--send");
  const { sendEarlyAccessInviteEmail } = await import("../src/lib/email");

  console.log(`Mode: ${shouldSend ? "SEND" : "DRY-RUN"}`);
  console.log(`DB: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, "//***@")}\n`);

  const verified = await prisma.earlyAccessRequest.findMany({
    where: { emailVerified: true },
  });

  console.log(`Found ${verified.length} verified early access requests.\n`);

  let created = 0;
  let sent = 0;

  for (const req of verified) {
    const existing = await prisma.inviteCode.findFirst({
      where: { email: req.email, used: false },
    });

    let code: string;

    if (existing) {
      if (existing.inviteSentAt) {
        console.log(`  ${req.email} — already sent (code ${existing.code})`);
        continue;
      }
      console.log(`  ${req.email} — has code ${existing.code}, not yet sent`);
      code = existing.code;
    } else {
      code = generateCode();
      await prisma.inviteCode.create({ data: { code, email: req.email } });
      created++;
      console.log(`  ${req.email} — created code ${code}`);
    }

    if (shouldSend) {
      try {
        await sendEarlyAccessInviteEmail({
          toEmail: req.email,
          userName: req.name,
          inviteCode: code,
        });
        await prisma.inviteCode.update({
          where: { code },
          data: { inviteSentAt: new Date() },
        });
        sent++;
        console.log(`  ${req.email} — ✅ email sent`);
      } catch (err) {
        console.error(`  ${req.email} — ❌ failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(`\nDone. Created ${created} new codes.${shouldSend ? ` Sent ${sent} emails.` : " Run with --send to actually send."}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
