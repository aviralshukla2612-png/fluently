"use client";

import { CONVERSATION_SCENARIOS } from "@/data/conversation/scenarios.js";
import { X, Check, Compass } from "lucide-react";

export default function ScenarioSelectorModal({
  isOpen = false,
  currentScenarioId = "free",
  onSelectScenario = () => {},
  onClose = () => {},
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scenario-modal-title"
    >
      <div className="bg-white border border-[#E6E2D9] rounded-3xl max-w-[620px] w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F2F0E9] pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#466657]" aria-hidden="true" />
            <h3 id="scenario-modal-title" className="font-heading font-bold text-lg text-[#30362F]">
              Choose Conversation Scenario
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#716F65] hover:text-[#30362F] rounded-lg transition-colors focus-accessible"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
          {CONVERSATION_SCENARIOS.map((scen) => {
            const isSelected = scen.id === currentScenarioId;

            return (
              <button
                key={scen.id}
                type="button"
                onClick={() => {
                  onSelectScenario(scen.id);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all focus-accessible flex items-start justify-between gap-3 ${
                  isSelected
                    ? "bg-[#E3EDE6]/60 border-[#203D35] shadow-xs"
                    : "bg-[#FAF9F5] border-[#E6E2D9] hover:bg-white hover:border-[#CEDDD2]"
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-sm text-[#30362F]">
                      {scen.name}
                    </span>
                    <span className="text-[10px] font-medium text-[#466657] bg-[#E3EDE6] px-2 py-0.5 rounded-full">
                      {scen.difficultyRecommendation}
                    </span>
                  </div>
                  <p className="text-xs text-[#716F65] mt-1 leading-relaxed">
                    {scen.description}
                  </p>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-[#203D35] shrink-0 mt-1" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F2F0E9] text-xs text-[#716F65]">
          <span>Changing scenario starts a fresh practice topic.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#FAF9F5] border border-[#E6E2D9] text-xs font-medium text-[#30362F] hover:bg-white transition-colors focus-accessible"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
