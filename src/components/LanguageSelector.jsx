import { Globe, ArrowRight } from "lucide-react";

export default function LanguageSelector({ className = "" }) {
  return (
    <div
      role="region"
      aria-label="Language configuration: Learning English from English"
      className={`inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E6E2D9] rounded-full text-xs text-[#716F65] shadow-xs select-none ${className}`}
    >
      <Globe
        className="w-3.5 h-3.5 text-[#716F65] shrink-0"
        aria-hidden="true"
      />
      <span className="font-semibold tracking-wider text-[#30362F]">EN</span>
      <ArrowRight
        className="w-3 h-3 text-[#929087] shrink-0 stroke-[1.75]"
        aria-hidden="true"
      />
      <span className="font-semibold tracking-wider text-[#30362F]">EN</span>
      <span className="sr-only">(English to English practice mode)</span>
    </div>
  );
}
