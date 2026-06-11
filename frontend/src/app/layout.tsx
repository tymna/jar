import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// The everyday font — see DESIGN.md. Not a variable font, so weights are
// explicit. Exposed as a CSS var that globals.css wires into Tailwind.
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "Jar",
  description: "Shared crypto jars",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceMono.variable}>
      <body>
        <Providers>
          {/* App lives in a centered, app-width column even on desktop. */}
          <div className="mx-auto w-full max-w-lg">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
