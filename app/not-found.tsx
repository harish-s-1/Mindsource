import Link from "next/link";
import { Wordmark } from "@/components/shell/Wordmark";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <Wordmark showSubtitle={false} />
      <div>
        <div className="text-2xl font-semibold text-text-primary">404</div>
        <p className="mt-1 text-sm text-text-secondary">
          This page could not be found in the simulated console.
        </p>
      </div>
      <Link
        href="/overview"
        className="rounded-sm border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:bg-accent-hover"
      >
        Return to Overview
      </Link>
    </div>
  );
}
