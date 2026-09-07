import type { Metadata } from "next";
import "./globals.css";
import { DemoStateProvider } from "@/context/DemoStateContext";

export const metadata: Metadata = {
  title: "MINDSource — AI Cloud Resource Intelligence",
  description:
    "MINDSource decision layer for AI compute — simulated demo environment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DemoStateProvider>{children}</DemoStateProvider>
      </body>
    </html>
  );
}
