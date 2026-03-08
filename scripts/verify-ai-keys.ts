import "dotenv/config";
import { Role } from "@prisma/client";
import { testProviderKey } from "../src/lib/ai/service";
import { decryptSecret } from "../src/lib/encryption";
import { sendAiKeyHealthAlertEmail } from "../src/lib/email";
import { prisma } from "../src/lib/prisma";

async function run(): Promise<void> {
  const keys = await prisma.aiProviderKey.findMany({
    where: { isActive: true },
    include: {
      workspace: {
        select: {
          users: {
            where: { role: { in: [Role.OWNER, Role.MANAGER] } },
            select: { email: true },
          },
        },
      },
    },
  });

  for (const key of keys) {
    const tested = await testProviderKey({
      provider: key.provider,
      apiKey: decryptSecret(key.encryptedKey),
    });

    await prisma.aiProviderKey.update({
      where: { id: key.id },
      data: {
        healthStatus: tested.success ? "OK" : "FAILED",
        lastVerifiedAt: new Date(),
        lastVerificationError: tested.success ? null : tested.message.slice(0, 500),
        isActive: tested.success ? true : false,
      },
    });

    if (!tested.success) {
      for (const owner of key.workspace.users) {
        await sendAiKeyHealthAlertEmail({
          workspaceId: key.workspaceId,
          toEmail: owner.email,
          provider: key.provider,
          detail: tested.message,
        }).catch(() => null);
      }
    }
  }

  console.log(`Checked ${keys.length} provider key(s).`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
