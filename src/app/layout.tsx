import type { Metadata } from "next";
import "./globals.css";
import { ThemeInitializer } from "@/components/ThemeControl";

export const metadata: Metadata = { title: "Winter Is Coming — Keep showing up", description: "A personal space to build momentum, one day at a time.", icons: { icon: "/icon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark" data-scroll-behavior="smooth"><body><ThemeInitializer/>{children}</body></html>;
}
