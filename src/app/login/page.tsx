import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getAuth } from "@/lib/auth";

export default async function LoginPage() {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }

  return (
    <main className="container-shell fade-in">
      <div className="mx-auto max-w-md surface p-7">
        <p className="kicker mb-2">Sign in</p>
        <h1 className="mb-1 text-3xl font-semibold">Welcome back</h1>
        <p className="mb-6 text-sm text-slate-600">
          Enter your work email and verify with a one-time code from Stytch.
        </p>

        <LoginForm />

        <p className="mt-5 text-sm text-slate-600">
          Need a workspace?{" "}
          <Link className="text-teal-700 underline" href="/register">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
