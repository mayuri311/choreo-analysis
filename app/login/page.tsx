import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="text-2xl font-semibold text-maroon">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Only emails on the team invite list can sign in.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
