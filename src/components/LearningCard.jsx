import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LearningCard({
  number,
  title,
  tag,
  description,
  href,
  icon: Icon,
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between p-6 sm:p-7 bg-white rounded-2xl border border-[#E6E2D9] hover:border-[#CEDDD2] shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 focus-accessible"
    >
      <div>
        {/* Header with sequence number and icon */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-semibold text-[#929087] tracking-wider px-2 py-0.5 bg-[#FAF9F5] border border-[#E6E2D9] rounded-md">
              {number}
            </span>
            {tag && (
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#466657] bg-[#E3EDE6]/60 px-2 py-0.5 rounded-md">
                {tag}
              </span>
            )}
          </div>

          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-[#FAF9F5] border border-[#E6E2D9] flex items-center justify-center text-[#203D35] group-hover:bg-[#E3EDE6] transition-colors duration-200">
              <Icon className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Card Title */}
        <h3 className="font-heading font-semibold text-xl text-[#30362F] group-hover:text-[#203D35] transition-colors duration-200 mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[#716F65] leading-relaxed mb-6">
          {description}
        </p>
      </div>

      {/* Directional affordance footer */}
      <div className="pt-2 border-t border-[#F2F0E9] flex items-center justify-between text-xs font-medium text-[#716F65]">
        <span className="group-hover:text-[#203D35] transition-colors duration-200">
          Open module
        </span>
        <span className="w-7 h-7 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] group-hover:bg-[#203D35] group-hover:border-[#203D35] group-hover:text-white flex items-center justify-center transition-all duration-200">
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
