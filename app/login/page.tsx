"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/shell/Wordmark";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { SimulationBadge } from "@/components/ui/SimulationBadge";
import { ENVIRONMENT_LABEL } from "@/lib/mock-data";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // No validation, no auth — any input navigates to the console.
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/overview");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-start">
          <Wordmark className="mb-1" />
        </div>

        <div className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h1 className="text-md font-semibold text-text-primary">Sign in</h1>
            <p className="mt-1 text-xs text-text-secondary">
              Connect infrastructure and optimize AI compute workloads.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" variant="primary" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
            <span className="text-2xs text-text-muted">
              Environment: {ENVIRONMENT_LABEL}
            </span>
            <SimulationBadge label="DEMO" />
          </div>
        </div>

        <p className="mt-4 text-center text-2xs text-text-muted">
          No authentication is performed. This is a simulated demo environment —
          any credentials proceed to the console.
        </p>
      </div>
    </div>
  );
}
