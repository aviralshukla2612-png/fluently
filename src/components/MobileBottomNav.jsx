"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Languages,
  AudioLines,
  MessageSquare,
  ChartNoAxesColumnIncreasing,
  GraduationCap,
} from "lucide-react";

const MOBILE_NAV_ITEMS = [
  { label: "Home", href: "/", icon: House },
  { label: "Say It", href: "/say-it", icon: Languages },
  { label: "Dictation", href: "/dictation", icon: AudioLines },
  { label: "Conversation", href: "/conversation", icon: MessageSquare },
  { label: "Tests", href: "/mock-tests", icon: GraduationCap },
  { label: "Progress", href: "/progress", icon: ChartNoAxesColumnIncreasing },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isItemActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E6E2D9] px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <ul className="flex items-center justify-around gap-1 max-w-md mx-auto">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 text-center touch-manipulation min-h-[46px] ${
                  active
                    ? "text-[#203D35] font-semibold"
                    : "text-[#716F65] hover:text-[#30362F] font-medium"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 ${
                    active
                      ? "bg-[#E3EDE6] text-[#203D35] scale-105 shadow-xs"
                      : "text-[#716F65]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 leading-tight truncate w-full">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
