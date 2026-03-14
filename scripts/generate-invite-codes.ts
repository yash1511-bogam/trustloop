/**
 * Generate invite codes for verified early access users who don't have one yet.
 *
 * Usage:
 *   pnpm tsx scripts/generate-invite-codes.ts              # generate codes only
 *   pnpm tsx scripts/generate-invite-codes.ts --send       # generate codes AND send emails
 */
import "dotenv/config";
import { randomBytes } from "crypto";
import { prisma } from "../src/lib/prisma";
import { sendEarlyAccessInviteEmail } from "../src/lib/email";

function generateCode(): string {
  return randomBytes(6).toString("hex").toUpperCase(); // 12-char hex code
}

async function main() {
  const shouldSend = process.argv.includes("--send");

  const verified = await prisma.earlyAccessRequest.findMany({
    where: { emailVerified: true },
  });

  console.log(`Found ${verified.length} verified early access requests.`);

  let created = 0;
  let sent = 0;

  for (const req of verified) {
    // Check if this email already has an unused invite code
    const existing = await prisma.inviteCode.findFirst({
      where: { email: req.email, used: false },
    });

    let code: string;

    if (existing) {
      console.log(`  ${req.email} — already has code ${existing.code}`);
      code = existing.code;
    } else {
      code = generateCode();
      await prisma.inviteCode.create({
        data: { code, email: req.email },
      });
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
        sent++;
        console.log(`  ${req.email} — email sent`);
      } catch (err) {
        console.error(`  ${req.email} — email failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(`\nDone. Created ${created} new codes.${shouldSend ? ` Sent ${sent} emails.` : " Run with --send to email them."}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
