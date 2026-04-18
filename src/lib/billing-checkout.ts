import type { CountryCode } from "dodopayments/resources/misc";
import { PlanTier } from "@/lib/billing-plan";
import { BillingInterval, dodoProductIdForPlan } from "@/lib/dodo";

type BuildBillingCheckoutInput = {
  actorUserId: string;
  couponCode: string | null;
  customerEmail: string;
  customerName: string | null;
  customerPhone?: string;
  dodoCustomerId?: string | null;
  interval: BillingInterval;
  plan: PlanTier;
  returnUrl?: string;
  workspaceId: string;
  billingCountry?: string;
  billingZip?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
};

export function buildBillingCheckoutPayload(input: BuildBillingCheckoutInput) {
  return {
    product_cart: [
      {
        product_id: dodoProductIdForPlan(input.plan, input.interval),
        quantity: 1,
      },
    ],
    customer: input.dodoCustomerId
      ? {
          customer_id: input.dodoCustomerId,
        }
      : {
          email: input.customerEmail,
          name: input.customerName?.trim() || input.customerEmail,
          ...(input.customerPhone ? { phone_number: input.customerPhone } : {}),
        },
    ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
    ...(input.billingCountry ? {
      billing_address: {
        country: input.billingCountry as CountryCode,
        ...(input.billingZip ? { zipcode: input.billingZip } : {}),
        ...(input.billingStreet ? { street: input.billingStreet } : {}),
        ...(input.billingCity ? { city: input.billingCity } : {}),
        ...(input.billingState ? { state: input.billingState } : {}),
      },
    } : {}),
    minimal_address: true,
    discount_code: input.couponCode ?? undefined,
    customization: {
      force_language: "en",
      show_order_details: false,
      theme: "dark" as const,
      theme_config: {
        font_size: "sm" as const,
        font_weight: "medium" as const,
        radius: "8px",
        pay_button_text: "Complete purchase",
        dark: {
          bg_primary: "#0a0b0d",
          bg_secondary: "#101113",
          text_primary: "#ecedf1",
          text_secondary: "#8a8b95",
          text_placeholder: "#5a5b63",
          text_error: "#e84242",
          text_success: "#16a34a",
          border_primary: "#232428",
          border_secondary: "#17181c",
          button_primary: "#d4622b",
          button_primary_hover: "#be5524",
          button_text_primary: "#ffffff",
          button_secondary: "#17181c",
          button_secondary_hover: "#232428",
          button_text_secondary: "#ffffff",
          input_focus_border: "#d4622b",
        },
        light: {
          bg_primary: "#0a0b0d",
          bg_secondary: "#101113",
          text_primary: "#ecedf1",
          text_secondary: "#8a8b95",
          text_placeholder: "#5a5b63",
          text_error: "#e84242",
          text_success: "#16a34a",
          border_primary: "#232428",
          border_secondary: "#17181c",
          button_primary: "#d4622b",
          button_primary_hover: "#be5524",
          button_text_primary: "#ffffff",
          button_secondary: "#17181c",
          button_secondary_hover: "#232428",
          button_text_secondary: "#ffffff",
          input_focus_border: "#d4622b",
        },
      },
    },
    feature_flags: {
      allow_currency_selection: true,
      allow_customer_editing_email: false,
      allow_customer_editing_name: true,
      allow_discount_code: true,
      allow_phone_number_collection: true,
      allow_tax_id: true,
      redirect_immediately: true,
    },
    metadata: {
      actorUserId: input.actorUserId,
      interval: input.interval,
      plan: input.plan,
      workspaceId: input.workspaceId,
    },
    show_saved_payment_methods: true,
  };
}
