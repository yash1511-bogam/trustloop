import { expect, test } from "@playwright/test";

test("registers, creates an incident, runs triage, and publishes a customer update", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByPlaceholder("Company name").fill("E2E Demo Workspace");
  await page.getByPlaceholder("Your name").fill("E2E Operator");
  await page.getByPlaceholder("Work email").fill(email);
  await page.getByRole("button", { name: "Send verification code" }).click();

  await expect(
    page.getByText("Verification code sent.", { exact: false }),
  ).toBeVisible();

  await page.locator("#code").fill("000000");
  await page
    .getByRole("button", { name: "Verify and create workspace" })
    .click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Command dashboard")).toBeVisible();

  await page
    .getByPlaceholder("e.g. API latency spike on inference endpoint")
    .fill("Inference gateway latency regression");
  await page
    .getByPlaceholder(
      "What failed, who was impacted, and what customer-visible risk exists?",
    )
    .fill(
      "Customers are seeing slow responses from the inference gateway and occasional 503s during peak load.",
    );
  await page.getByPlaceholder("e.g. Acme Corp").fill("Acme Robotics");
  await page.getByPlaceholder("support@acme.com").fill("ops@acme.example");
  await page.getByRole("button", { name: "Create incident" }).click();

  await page.waitForURL("**/incidents/**");
  await expect(page.getByRole("button", { name: "Run AI triage" })).toBeVisible();

  await page.getByRole("button", { name: "Run AI triage" }).click();
  await expect(page.getByText("AI triage completed.")).toBeVisible();

  const updateBox = page.getByPlaceholder(
    "Write or generate a customer-facing update before publishing.",
  );
  await updateBox.fill(
    "We are investigating elevated latency on the inference gateway. Mitigation is underway and we will share another update within 30 minutes.",
  );
  await page.getByRole("button", { name: "Publish to status page" }).click();

  await expect(
    page.getByText("Update published to status page."),
  ).toBeVisible();
  await expect(
    page.getByText("Published customer update", { exact: false }),
  ).toBeVisible();
});
