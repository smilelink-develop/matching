"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname.startsWith("/portal");

  if (isPortal) {
    return (
      <body className="min-h-full bg-[#EAF4FF] text-[#0F172A]">
        {children}
      </body>
    );
  }

  return (
    <body className="h-full flex bg-[#F8FAFC] text-[#0F172A]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </main>
    </body>
  );
}
