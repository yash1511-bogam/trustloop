import { redirect } from "next/navigation";

type SearchParamValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamValue>;

function toUrlSearchParams(input: SearchParamsRecord): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  return params;
}

export async function redirectToOAuthCallbackIfPresent<T extends SearchParamsRecord>(
  searchParams: Promise<T>,
): Promise<T> {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";
  if (!token) {
    return params;
  }

  const query = toUrlSearchParams(params);
  redirect(`/api/auth/oauth/callback?${query.toString()}`);
}
