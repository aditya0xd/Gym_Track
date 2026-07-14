"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, IndianRupee, ChevronDown, ChevronUp, Check } from "lucide-react";

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [showExtraDurations, setShowExtraDurations] = useState(false);

  const [gymName, setGymName] = useState("");
  const [pricing, setPricing] = useState({
    monthly: "",
    threeMonths: "",
    sixMonths: "",
    twelveMonths: "",
  });

  const handleNext = () => {
    if (step === 1 && gymName.trim()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!pricing.monthly) return;

    setLoading(true);
    const start = Date.now();

    try {
      const res = await fetch("/api/owner/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymName: gymName.trim(),
          pricing: {
            monthly: parseInt(pricing.monthly.replace(/,/g, "")),
            threeMonths: pricing.threeMonths ? parseInt(pricing.threeMonths.replace(/,/g, "")) : undefined,
            sixMonths: pricing.sixMonths ? parseInt(pricing.sixMonths.replace(/,/g, "")) : undefined,
            twelveMonths: pricing.twelveMonths ? parseInt(pricing.twelveMonths.replace(/,/g, "")) : undefined,
          },
        }),
      });

      const elapsed = Date.now() - start;
      if (elapsed < 600) {
        await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
      }

      if (res.ok) {
        setStep(3);
        setTimeout(() => {
          router.push("/owner/dashboard");
          router.refresh();
        }, 1500);
      } else {
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    // Outer card: fills full screen height on mobile, capped to max-w-md on larger screens.
    // No overflow-hidden here — the inner slides container handles horizontal clipping.
    <div
      className="w-full max-w-md mx-auto flex flex-col bg-[#292929] rounded-[32px] text-white shadow-2xl relative"
      style={{ minHeight: "100dvh", maxHeight: "100dvh" }}
    >
      {/* Progress Indicator — pinned at top, never scrolls */}
      {step < 3 && (
        <div className="w-full flex gap-2 pt-6 pb-4 px-8 flex-shrink-0">
          <div className="h-1 flex-1 bg-[#87c038] rounded-full transition-all duration-300" />
          <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step >= 2 ? "bg-[#87c038]" : "bg-white/20"}`} />
        </div>
      )}

      {/* Slides container — clips horizontal overflow for the slide animation */}
      <div className="relative flex-1 overflow-hidden">

        {/* Step 1 */}
        <div
          className={`absolute inset-0 flex flex-col items-center px-6 pt-4 pb-8 transition-all duration-500 ease-out
            ${step === 1 ? "translate-x-0 opacity-100" : "-translate-x-[120%] opacity-0 pointer-events-none"}`}
        >
          <div className="w-16 h-16 bg-[#e6f0d8] rounded-full flex items-center justify-center mb-6">
            <Store className="w-8 h-8 text-[#2c5208]" />
          </div>

          <h1 className="text-2xl font-semibold mb-3 text-center">What should we call your gym?</h1>
          <p className="text-gray-400 text-center mb-8 text-sm px-4">
            This is how members and staff will see it across GymTrack.
          </p>

          <div className="w-full mb-8">
            <label className="block text-sm text-gray-400 mb-2 font-medium">Gym name</label>
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="e.g. Iron Pulse Fitness"
              className="w-full bg-transparent border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#87c038] transition-colors duration-200"
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
            />
          </div>

          <button
            onClick={handleNext}
            disabled={!gymName.trim()}
            className="w-full bg-[#87c038] text-black font-semibold rounded-xl py-4 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            Let&apos;s go
          </button>
        </div>

        {/* Step 2 — split into scrollable content + pinned CTA */}
        <div
          className={`absolute inset-0 flex flex-col transition-all duration-500 ease-out
            ${step === 2 ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0 pointer-events-none"}`}
        >
          {/* Scrollable content: grows as extra durations expand */}
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#e6f0d8] rounded-full flex items-center justify-center mb-6">
                <IndianRupee className="w-8 h-8 text-[#2c5208]" />
              </div>

              <h1 className="text-2xl font-semibold mb-3 text-center">Set your membership pricing</h1>
              <p className="text-gray-400 text-center mb-8 text-sm px-4">
                Set a monthly price to start. You can add other durations any time from settings.
              </p>

              <div className="w-full space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-medium">Monthly price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="text"
                      value={pricing.monthly}
                      onChange={(e) => setPricing({...pricing, monthly: e.target.value})}
                      placeholder="1,500"
                      className="w-full bg-transparent border border-gray-600 rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#87c038] transition-colors duration-200"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setShowExtraDurations(!showExtraDurations)}
                  className="text-[#649c1a] text-sm font-medium flex items-center justify-center w-full py-2"
                >
                  {showExtraDurations ? "Hide extra durations" : "Add more durations"}
                  {showExtraDurations ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </button>

                <div className={`space-y-4 overflow-hidden transition-all duration-300 ${showExtraDurations ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-medium">3 months</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="text"
                        value={pricing.threeMonths}
                        onChange={(e) => setPricing({...pricing, threeMonths: e.target.value})}
                        placeholder="4,200"
                        className="w-full bg-transparent border border-gray-600 rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#87c038] transition-colors duration-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-medium">6 months</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="text"
                        value={pricing.sixMonths}
                        onChange={(e) => setPricing({...pricing, sixMonths: e.target.value})}
                        placeholder="8,000"
                        className="w-full bg-transparent border border-gray-600 rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#87c038] transition-colors duration-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-medium">12 months</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="text"
                        value={pricing.twelveMonths}
                        onChange={(e) => setPricing({...pricing, twelveMonths: e.target.value})}
                        placeholder="15,000"
                        className="w-full bg-transparent border border-gray-600 rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#87c038] transition-colors duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA — pinned at the bottom, always visible regardless of scroll position */}
          <div className="flex-shrink-0 px-6 pb-8 pt-2 bg-[#292929]">
            <button
              onClick={handleSubmit}
              disabled={!pricing.monthly || loading}
              className="w-full bg-[#87c038] text-black font-semibold rounded-xl py-4 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center h-[56px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                "Set up my gym"
              )}
            </button>
          </div>
        </div>

        {/* Step 3 - Success */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-out
            ${step === 3 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
        >
          <div className="w-20 h-20 bg-[#87c038] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(135,192,56,0.3)]">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
        </div>

      </div>
    </div>
  );
}
