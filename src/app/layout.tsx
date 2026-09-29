import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Winter Arc — Keep showing up", description: "A personal space to build momentum, one day at a time.", icons: { icon: "/icon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
