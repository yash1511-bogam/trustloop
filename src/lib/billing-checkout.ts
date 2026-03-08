import { PlanTier } from "@/lib/billing-plan";
import { dodoProductIdForPlan } from "@/lib/dodo";

type BuildBillingCheckoutInput = {
  actorUserId: string;
  couponCode: string | null;
  customerEmail: string;
  customerName: string | null;
  dodoCustomerId?: string | null;
  plan: PlanTier;
  returnUrl?: string;
  workspaceId: string;
};

const checkoutTheme = {
  radius: "18px",
  font_size: "sm",
  font_weight: "medium",
  pay_button_text: "Complete purchase",
  dark: {
    bg_primary: "#060816",
    bg_secondary: "#0f172a",
    border_primary: "rgba(148, 163, 184, 0.28)",
    border_secondary: "rgba(148, 163, 184, 0.16)",
    button_primary: "#e2e8f0",
    button_primary_hover: "#f8fafc",
    button_secondary: "#0f172a",
    button_secondary_hover: "#111827",
    button_text_primary: "#020617",
    button_text_secondary: "#e2e8f0",
    input_focus_border: "#38bdf8",
    text_error: "#fca5a5",
    text_placeholder: "#94a3b8",
    text_primary: "#e5eefb",
    text_secondary: "#94a3b8",
    text_success: "#86efac",
  },
  light: {
    bg_primary: "#ffffff",
    bg_secondary: "#f8fafc",
    border_primary: "#cbd5e1",
    border_secondary: "#e2e8f0",
    button_primary: "#0f172a",
    button_primary_hover: "#020617",
    button_secondary: "#ffffff",
    button_secondary_hover: "#f8fafc",
    button_text_primary: "#f8fafc",
    button_text_secondary: "#0f172a",
    input_focus_border: "#0284c7",
    text_error: "#b91c1c",
    text_placeholder: "#64748b",
    text_primary: "#0f172a",
    text_secondary: "#475569",
    text_success: "#166534",
  },
} as const;

export function buildBillingCheckoutPayload(input: BuildBillingCheckoutInput) {
  return {
    product_cart: [
      {
        product_id: dodoProductIdForPlan(input.plan),
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
        },
    ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
    discount_code: input.couponCode ?? undefined,
    customization: {
      force_language: "en",
      show_order_details: false,
      theme: "dark" as const,
      theme_config: checkoutTheme,
    },
    feature_flags: {
      allow_currency_selection: true,
      allow_customer_editing_email: false,
      allow_customer_editing_name: true,
      allow_discount_code: false,
      allow_phone_number_collection: true,
      allow_tax_id: true,
      redirect_immediately: true,
    },
    metadata: {
      actorUserId: input.actorUserId,
      plan: input.plan,
      workspaceId: input.workspaceId,
    },
    show_saved_payment_methods: true,
  };
}
