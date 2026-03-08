const CUSTOMER_NAME_ALLOWED_PATTERN = /[^\p{L}\p{N}\p{M}\p{Zs}._,'&()\-+/]/gu;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeCustomerName(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = collapseWhitespace(value.replace(CUSTOMER_NAME_ALLOWED_PATTERN, ""));
  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, 120);
}

export function sanitizeEmail(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = collapseWhitespace(value).toLowerCase();
  return cleaned || null;
}

export function sanitizeSingleLine(value: string | null | undefined, max = 180): string | null {
  if (!value) {
    return null;
  }

  const cleaned = collapseWhitespace(value);
  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, max);
}

export function sanitizeLongText(value: string | null | undefined, max = 5000): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/\u0000/g, "").trim();
  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, max);
}
