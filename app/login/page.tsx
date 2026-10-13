import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="text-2xl font-semibold text-maroon">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        First time? Choose “First time here?” and set a password for the email a captain added.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
