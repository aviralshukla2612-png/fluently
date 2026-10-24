"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModulePage from "@/components/ModulePage.jsx";
import ExamCard from "@/components/exams/ExamCard.jsx";
import { useAuth } from "@/lib/auth/useAuth.js";
import {
  Award,
  ShieldCheck,
  Clock,
  HelpCircle,
  FileCheck2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  History,
} from "lucide-react";

export default function MockTestsLandingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingExamId, setPurchasingExamId] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/exams");
        const data = await res.json();
        if (data.success && Array.isArray(data.exams)) {
          setExams(data.exams);
        }
      } catch (err) {
        console.error("Failed to load exams:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const handlePurchase = async (exam) => {
    setCheckoutError("");
    setCheckoutSuccess(null);

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent("/mock-tests")}`);
      return;
    }

    setPurchasingExamId(exam.id);

    try {
      // 1. Create Order on Server
      const res = await fetch("/api/exams/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam.id }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.success) {
        setCheckoutError(orderData.error || "Unable to initialize purchase.");
        setPurchasingExamId(null);
        return;
      }

      if (orderData.alreadyOwned) {
        setCheckoutSuccess({
          message: "You already own this exam entitlement! You can begin immediately.",
          examId: exam.id,
        });
        setPurchasingExamId(null);
        return;
      }

      // 2. Razorpay Checkout Flow (Live or Sandbox Test Mode)
      if (orderData.isTestMode || typeof window.Razorpay === "undefined") {
        // Direct sandbox verification in test mode
        const verifyRes = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderData.orderId,
            razorpay_order_id: orderData.providerOrderId,
            razorpay_payment_id: `pay_test_${Date.now()}`,
            razorpay_signature: "test_signature",
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          setCheckoutSuccess({
            message: "Sandbox test payment verified successfully! Your examination is unlocked.",
            examId: exam.id,
          });
        } else {
          setCheckoutError(verifyData.error || "Sandbox payment verification failed.");
        }
      } else {
        // Load official Razorpay Standard Checkout
        const rzp = new window.Razorpay({
          key: orderData.keyId,
          amount: orderData.amountPaise,
          currency: orderData.currency,
          name: "Fluently",
          description: `IELTS Academic Mock Exam Purchase (₹199)`,
          order_id: orderData.providerOrderId,
          handler: async (response) => {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: orderData.orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const vData = await verifyRes.json();
            if (vData.success) {
              router.push(`/mock-tests/${exam.id}/instructions`);
            } else {
              setCheckoutError(vData.error || "Payment verification failed.");
            }
          },
          prefill: {
            name: user?.displayName || "",
            email: user?.email || "",
          },
          theme: {
            color: "#203D35",
          },
        });
        rzp.open();
      }
    } catch (err) {
      setCheckoutError(err.message || "An unexpected checkout error occurred.");
    } finally {
      setPurchasingExamId(null);
    }
  };

  return (
    <ModulePage
      eyebrow="Assessment • Practice • Certified Rubrics"
      title="IELTS-Style Mock Examination"
      description="Practice full-length academic exam simulations under authentic timed conditions. Receive objective listening/reading scoring, AI-evaluated writing and speaking band estimates, and comprehensive error breakdowns."
      badge="Exam Engine"
    >
      <div className="flex flex-col gap-10 max-w-[1020px] mx-auto pb-12">
        {/* Top Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-[#E6E2D9] rounded-2xl shadow-card">
          <div className="flex items-center gap-2.5 text-xs text-[#716F65]">
            <ShieldCheck className="w-4 h-4 text-[#327653]" />
            <span>Strict server-side timers • Instant objective grading • Indian Rupee checkout (₹199)</span>
          </div>

          <Link
            href="/mock-tests/history"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FAF9F5] border border-[#E6E2D9] text-[#30362F] hover:bg-[#E3EDE6] transition-colors focus-accessible shadow-xs shrink-0 self-start sm:self-auto"
          >
            <History className="w-3.5 h-3.5 text-[#466657]" />
            <span>Previous Attempts & Reports</span>
          </Link>
        </div>

        {/* Checkout Alerts */}
        {checkoutError && (
          <div className="p-4 bg-[#F8E8E5] border border-[#A5413B]/30 rounded-2xl text-xs text-[#A5413B] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{checkoutError}</span>
          </div>
        )}

        {checkoutSuccess && (
          <div className="p-4 bg-[#E3EDE6] border border-[#327653]/30 rounded-2xl text-xs text-[#203D35] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#327653] shrink-0" />
              <span className="font-medium">{checkoutSuccess.message}</span>
            </div>
            <Link
              href={`/mock-tests/${checkoutSuccess.examId}/instructions`}
              className="px-4 py-1.5 rounded-full bg-[#203D35] text-white text-xs font-semibold hover:bg-[#294C42] shrink-0"
            >
              Start Exam Now
            </Link>
          </div>
        )}

        {/* Exam Cards Grid */}
        {isLoading ? (
          <div className="p-16 text-center text-sm text-[#716F65] bg-white border border-[#E6E2D9] rounded-3xl">
            Loading examination options...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {exams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onPurchase={handlePurchase}
                isPurchasing={purchasingExamId === exam.id}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}

        {/* Transparency & AI Disclaimer Banner */}
        <div className="p-6 bg-[#FAF9F5] border border-[#E6E2D9] rounded-3xl flex flex-col sm:flex-row items-start gap-4 text-xs text-[#716F65] leading-relaxed">
          <AlertCircle className="w-5 h-5 text-[#8C6D1F] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5">
            <h4 className="font-heading font-bold text-sm text-[#30362F]">
              Assessment & Independent Practice Disclosure
            </h4>
            <p>
              <strong>Fluently IELTS-Style Mock Test</strong> is an independent practice assessment service developed by Fluently. It is not affiliated with, endorsed by, or certified by IELTS Partners (British Council, IDP: IELTS Australia, or Cambridge University Press & Assessment).
            </p>
            <p>
              Section scores, Writing band estimates, and Speaking feedback are generated using automated algorithms and official criteria rubrics for self-evaluation and preparation purposes only. They do not constitute an official IELTS Test Report Form (TRF).
            </p>
          </div>
        </div>

        {/* Section Structure Overview Table */}
        <div className="bg-white border border-[#E6E2D9] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#466657]">
              Format & Duration
            </span>
            <h3 className="font-heading font-bold text-xl sm:text-2xl text-[#30362F] mt-1">
              Examination Structure Breakdown
            </h3>
            <p className="text-xs text-[#716F65] mt-1">
              Follows the official four-component Academic sequence with realistic pacing and instructions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#E6E2D9] text-[#716F65] font-semibold">
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Assessment Methodology</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F0E9] text-[#30362F]">
                <tr>
                  <td className="py-3 px-4 font-semibold">Listening</td>
                  <td className="py-3 px-4">4 Parts • 40 Questions</td>
                  <td className="py-3 px-4">35 Minutes</td>
                  <td className="py-3 px-4 text-[#466657]">Deterministic Objective Grading</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Reading</td>
                  <td className="py-3 px-4">3 Academic Passages • 40 Questions</td>
                  <td className="py-3 px-4">60 Minutes</td>
                  <td className="py-3 px-4 text-[#466657]">Deterministic Objective Grading</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Writing</td>
                  <td className="py-3 px-4">Task 1 (150 words) + Task 2 (250 words)</td>
                  <td className="py-3 px-4">60 Minutes</td>
                  <td className="py-3 px-4 text-[#466657]">AI Criteria Rubric Evaluation</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold">Speaking</td>
                  <td className="py-3 px-4">Part 1, Part 2 (Cue Card), Part 3 (Discussion)</td>
                  <td className="py-3 px-4">11–15 Minutes</td>
                  <td className="py-3 px-4 text-[#466657]">Speech Analytics & AI Rubric</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="bg-white border border-[#E6E2D9] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#203D35]" />
            <h3 className="font-heading font-bold text-xl text-[#30362F]">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-[#716F65] leading-relaxed">
            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl flex flex-col gap-1.5">
              <strong className="text-sm text-[#30362F]">How is the overall band calculated?</strong>
              <p>
                The overall band is the arithmetic mean of the four individual section scores rounded according to the official IELTS rounding rule (ending in .25 rounds up to .5, ending in .75 rounds up to .0).
              </p>
            </div>

            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl flex flex-col gap-1.5">
              <strong className="text-sm text-[#30362F]">Can I pause or leave during the exam?</strong>
              <p>
                In full mock mode, the examination runs against a continuous server-side countdown clock to replicate genuine testing pressure. Responses are autosaved in real-time.
              </p>
            </div>

            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl flex flex-col gap-1.5">
              <strong className="text-sm text-[#30362F]">What payment methods are supported?</strong>
              <p>
                We accept UPI, Google Pay, PhonePe, Paytm, RuPay, Visa, Mastercard, and Net Banking via Razorpay Indian Rupee checkout (₹199 inclusive).
              </p>
            </div>

            <div className="p-4 bg-[#FAF9F5] border border-[#E6E2D9] rounded-2xl flex flex-col gap-1.5">
              <strong className="text-sm text-[#30362F]">How quickly do I get my score report?</strong>
              <p>
                Objective sections (Listening & Reading) are evaluated instantly. AI-assisted Writing and Speaking evaluations are generated within seconds upon final submission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModulePage>
  );
}
