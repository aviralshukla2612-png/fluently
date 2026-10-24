import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function ModulePage({
  eyebrow,
  title,
  description,
  badge,
  children,
}) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5 max-w-[1020px] mx-auto">
      {/* Module Header */}
      <section className="flex flex-col gap-2 border-b border-[#E6E2D9] pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#716F65] hover:text-[#203D35] px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] transition-colors focus-accessible shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Overview</span>
            </Link>
          </div>

          {badge && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#466657] bg-[#E3EDE6] px-2.5 py-0.5 rounded-full border border-[#CEDDD2]">
              {badge}
            </span>
          )}
        </div>

        <div>
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#466657] mb-0.5">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading font-bold text-xl sm:text-2xl text-[#30362F] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-[#716F65] mt-0.5 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </section>

      {/* Module Content Grid or Showcase */}
      <div className="w-full">{children}</div>
    </div>
  );
}
