"use client";

import { ArrowLeft, Info, MessageSquare, HelpCircle, Mail, ExternalLink, Users, CreditCard, Settings } from "lucide-react";
import Link from "next/link";

export default function OwnerHelpPage() {
  const faqs = [
    {
      q: "How do I add a new member?",
      a: "Go to Members → Add Member, fill in their details and assign a membership plan. They'll show up in your dashboard instantly.",
    },
    {
      q: "Can I edit a membership plan later?",
      a: "Yes. Head to Membership Plans, select the plan you want to update, and edit pricing, duration, or benefits. Existing members keep their original terms unless you reassign them.",
    },
    {
      q: "What payment providers are supported?",
      a: "We currently support Razorpay and UPI for accepting payments from members, with more providers coming soon.",
    },
    {
      q: "How do I track member attendance?",
      a: "Enable check-ins from Settings → Attendance. Members can check in via QR code or you can mark attendance manually from the dashboard.",
    },
    {
      q: "Can I export member data?",
      a: "Yes, go to Members → Export to download a CSV of your member list, including plan details and payment history.",
    },
  ];

  return (
    <div className="min-h-dvh bg-[#292929] text-white p-6 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link href="/owner/profile" className="mr-4 text-[#d4ff00] hover:text-[#b0e000] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold flex-1">Help &amp; Support</h1>
      </div>

      {/* Sections */}
      <section className="space-y-6">
        {/* Getting Started */}
        <div className="p-4 bg-[#1e1e1e] rounded-xl border border-[#3a3a3a]">
          <div className="flex items-center mb-2">
            <Info className="h-5 w-5 text-[#d4ff00] mr-2" />
            <h2 className="text-lg font-medium">Getting Started</h2>
          </div>
          <p className="text-sm text-gray-400">
            New to GymTrack? Watch our quick onboarding video or read the step&#8209;by&#8209;step guide to set up
            your gym, create membership plans, and start accepting members.
          </p>
          <Link href="/owner/onboarding" className="inline-flex items-center gap-1 mt-2 text-[#87c038] hover:underline">
            Go to Onboarding <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Quick Links */}
        <div className="p-4 bg-[#1e1e1e] rounded-xl border border-[#3a3a3a]">
          <h2 className="text-lg font-medium mb-3">Quick Links</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/owner/members"
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[#292929] border border-[#3a3a3a] hover:border-[#d4ff00] transition-colors"
            >
              <Users className="h-5 w-5 text-[#d4ff00]" />
              <span className="text-xs text-gray-300 text-center">Members</span>
            </Link>
            <Link
              href="/owner/plans"
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[#292929] border border-[#3a3a3a] hover:border-[#d4ff00] transition-colors"
            >
              <CreditCard className="h-5 w-5 text-[#d4ff00]" />
              <span className="text-xs text-gray-300 text-center">Plans</span>
            </Link>
            <Link
              href="/owner/settings"
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[#292929] border border-[#3a3a3a] hover:border-[#d4ff00] transition-colors"
            >
              <Settings className="h-5 w-5 text-[#d4ff00]" />
              <span className="text-xs text-gray-300 text-center">Settings</span>
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="p-4 bg-[#1e1e1e] rounded-xl border border-[#3a3a3a]">
          <div className="flex items-center mb-3">
            <HelpCircle className="h-5 w-5 text-[#d4ff00] mr-2" />
            <h2 className="text-lg font-medium">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-lg bg-[#292929] border border-[#3a3a3a] p-3 open:border-[#d4ff00]/40"
              >
                <summary className="text-sm font-medium cursor-pointer list-none flex items-center justify-between">
                  {item.q}
                  <span className="text-[#d4ff00] ml-2 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-gray-400 mt-2">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-400">
            If you don&apos;t see your question, feel free to contact us below.
          </p>
        </div>

        {/* Contact Support */}
        <div className="p-4 bg-[#1e1e1e] rounded-xl border border-[#3a3a3a]">
          <div className="flex items-center mb-2">
            <MessageSquare className="h-5 w-5 text-[#d4ff00] mr-2" />
            <h2 className="text-lg font-medium">Contact Support</h2>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Need personalized assistance? Our team aims to reply within 24 hours.
          </p>
          <Link
            href="mailto:adityayadav168@gmail.com"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4ff00] text-[#1e1e1e] text-sm font-medium hover:bg-[#b0e000] transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email Support
          </Link>
        </div>
      </section>

      {/* Footer note */}
      <p className="text-xs text-gray-500 text-center mt-8 mb-2">
        GymTrack v1.0 &middot; Made for gym owners, by gym owners
      </p>
    </div>
  );
}