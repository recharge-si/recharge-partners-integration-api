import type { Metadata } from "next";
import { Orbitron, Montserrat } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-orbitron",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Recharge sources",
  description: "Standardized partner export sources, synced one-way to Shopify.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${montserrat.variable} h-full`}>
      <body className="min-h-full bg-black text-neutral-300 antialiased">
        {/* Ambient background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="animate-blob absolute -left-24 top-[-6rem] h-96 w-96 rounded-full bg-[#01a0be]/20 blur-3xl" />
          <div className="animate-blob animation-delay-2000 absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="animate-blob animation-delay-4000 absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="animate-blob animation-delay-6000 absolute bottom-20 right-1/4 h-72 w-72 rounded-full bg-cyan-400/10 blur-2xl" />
        </div>

        {/* Content layer */}
        <div className="relative z-10 flex min-h-full flex-col">
          <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-black/60 backdrop-blur-md">
            <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3.5">
                <span className="flex h-14 items-center justify-center rounded-xl bg-white px-3 py-1.5 ring-1 ring-white/10">
                  <Image
                    src="/recharge-logo.png"
                    alt="Recharge"
                    width={1040}
                    height={696}
                    priority
                    className="h-10 w-auto"
                  />
                </span>
                <span className="font-orbitron text-2xl font-bold tracking-wide text-white sm:text-3xl">
                  Recharge sources
                </span>
              </Link>
              <span className="hidden items-center gap-1 rounded-full border border-[#01a0be]/25 bg-[#01a0be]/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-widest text-[#01a0be] sm:inline-flex">
                Sources
              </span>
            </div>
          </nav>

          <main className="relative bg-transparent py-6 lg:py-8">
            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
