// Minimal classnames joiner — avoids a dependency for a trivial need.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
