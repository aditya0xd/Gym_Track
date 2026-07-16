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
    <div className="min-h-dvh bg-background text-foreground p-6 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link href="/owner/profile" className="mr-4 text-primary hover:text-primary/80 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold flex-1">Help &amp; Support</h1>
      </div>

      {/* Sections */}
      <section className="space-y-6">
        {/* Getting Started */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center mb-2">
            <Info className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-medium">Getting Started</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            New to GymTrack? Watch our quick onboarding video or read the step&#8209;by&#8209;step guide to set up
            your gym, create membership plans, and start accepting members.
          </p>
          <div className="inline-flex items-center gap-1 mt-2 text-primary hover:underline cursor-pointer">
            Go to Video Tutorial <ExternalLink className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Quick Links */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <h2 className="text-lg font-medium mb-3">Quick Links</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/owner/members"
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted border border-border hover:border-primary transition-colors"
            >
              <Users className="h-5 w-5 text-primary" />
              <span className="text-xs text-foreground/80 text-center">Members</span>
            </Link>
            <Link
              href="/owner/plans"
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted border border-border hover:border-primary transition-colors"
            >
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-xs text-foreground/80 text-center">Plans</span>
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center mb-3">
            <HelpCircle className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-medium">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-lg bg-muted border border-border p-3 open:border-primary/40"
              >
                <summary className="text-sm font-medium cursor-pointer list-none flex items-center justify-between text-foreground">
                  {item.q}
                  <span className="text-primary ml-2 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-2">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            If you don&apos;t see your question, feel free to contact us below.
          </p>
        </div>

        {/* Contact Support */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center mb-2">
            <MessageSquare className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-medium">Contact Support</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Need personalized assistance? Our team aims to reply within 24 hours.
          </p>
          <div className="space-y-2">
            <Link
              href="mailto:adityayadav168@gmail.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors w-full justify-center"
            >
              <Mail className="h-4 w-4" />
              Email Support
            </Link>
            <Link
              href="tel:8953317722"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm font-medium hover:border-primary transition-colors w-full justify-center"
            >
              <MessageSquare className="h-4 w-4" />
              Call: 8953317722
            </Link>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center mt-8 mb-2">
        GymTrack v1.0 &middot; Made for gym owners, by gym owners
      </p>
    </div>
  );
}