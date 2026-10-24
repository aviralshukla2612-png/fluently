"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  AudioLines,
  Languages,
  BookOpen,
  BookMarked,
  ChartNoAxesColumnIncreasing,
  MessageSquare,
  GraduationCap,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: House },
  { label: "Mock Tests", href: "/mock-tests", icon: GraduationCap },
  { label: "Dictation", href: "/dictation", icon: AudioLines },
  { label: "Say It", href: "/say-it", icon: Languages },
  { label: "Conversation", href: "/conversation", icon: MessageSquare },
  { label: "Grammar", href: "/grammar", icon: BookOpen },
  { label: "Vocabulary", href: "/vocabulary", icon: BookMarked },
  { label: "Progress", href: "/progress", icon: ChartNoAxesColumnIncreasing },
];

export default function Navbar({ className = "" }) {
  const pathname = usePathname();

  const isItemActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Main Navigation"
      className={`inline-flex items-center justify-start sm:justify-center max-w-full ${className}`}
    >
      <ul className="inline-flex items-center gap-0.5 sm:gap-1 bg-white border border-[#E6E2D9] rounded-full p-1 sm:p-1.5 shadow-pill min-h-[44px] overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs md:text-[13px] transition-colors duration-200 whitespace-nowrap focus-accessible touch-manipulation ${
                  active
                    ? "bg-[#E3EDE6] text-[#203D35] font-semibold shadow-xs"
                    : "text-[#716F65] font-medium hover:text-[#30362F] hover:bg-[#FAF9F5]"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    active ? "text-[#203D35]" : "text-[#716F65]"
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
