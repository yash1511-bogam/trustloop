import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getAuth } from "@/lib/auth";

export default async function RegisterPage() {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }

  return (
    <main className="container-shell fade-in">
      <div className="mx-auto max-w-md surface p-7">
        <p className="kicker mb-2">New workspace</p>
        <h1 className="mb-1 text-3xl font-semibold">Create TrustLoop account</h1>
        <p className="mb-6 text-sm text-slate-600">
          Start with your work email and verify ownership with a one-time code.
        </p>

        <RegisterForm />

        <p className="mt-5 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="text-teal-700 underline" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
