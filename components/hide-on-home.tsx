"use client";

import { usePathname } from "next/navigation";

// Hides global chrome (the nav header) on the homepage, where the redesigned
// terminal provides its own left-rail navigation and the live ticker tape sits
// at the very top. Server children are still rendered; we just don't show them
// on "/". Every other route keeps the standard header.
export default function HideOnHome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <>{children}</>;
}
