import type { Metadata } from "next";
import { Sniglet, Space_Mono } from "next/font/google";
import "./globals.css";
import JarBackdrop from "@/components/JarBackdrop";
import { Providers } from "./providers";

// The everyday font — see DESIGN.md. Not a variable font, so weights are
// explicit. Exposed as a CSS var that globals.css wires into Tailwind.
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

// Display font — jar names, headings, hero numbers. Never body text.
// Trying Sniglet as a less-blobby alternative to Modak (see DESIGN.md
// "Typography" runners-up). Keeps the --font-modak var so globals.css
// doesn't need to change while we audition fonts.
const display = Sniglet({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-modak",
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
    <html lang="en" className={`${spaceMono.variable} ${display.variable}`}>
      <body>
        {/* Chunky poster backdrop: giant tone-on-tone display words with
            sticker doodles — see JarBackdrop.tsx and globals.css. */}
        <JarBackdrop />
        <Providers>
          {/* App lives in a centered, app-width column even on desktop. */}
          <div className="mx-auto w-full max-w-xl">{children}</div>
        </Providers>
        {/* Paper grain over the whole app; pointer-events: none. */}
        <div aria-hidden className="jar-grain" />
      </body>
    </html>
  );
}
