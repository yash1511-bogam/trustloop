import { redirect } from "next/navigation";

export default async function InviteCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/register?invite_code=${encodeURIComponent(code)}`);
}
