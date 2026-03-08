import "dotenv/config";
import { processPastDueBillingAutomation } from "../src/lib/billing";
import { prisma } from "../src/lib/prisma";

async function run(): Promise<void> {
  const result = await processPastDueBillingAutomation();
  console.log("Billing grace automation complete", result);
}

run()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
