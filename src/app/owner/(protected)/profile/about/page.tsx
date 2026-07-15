"use client";

import { ArrowLeft, Heart, Shield, Zap, Users, Target } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0c] text-white p-6 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link href="/owner/profile" className="mr-4 text-[#d4ff00] hover:text-[#b0e000] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold flex-1">About GymTrack Pro</h1>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="rounded-[1.5rem] bg-[#16161a] p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d4ff00]/10 text-[#d4ff00]">
              <Target className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">GymTrack Pro</h2>
          <p className="text-sm text-zinc-400">Version 1.0.0</p>
          <p className="text-sm text-zinc-300 mt-4">
            Made for gym owners, by gym owners. Simplify your gym management with our powerful yet intuitive platform.
          </p>
        </div>

        {/* Features */}
        <div className="rounded-[1.5rem] bg-[#16161a] p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#d4ff00] mb-4">
            Key Features
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Member Management</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Easily manage your gym members with comprehensive profiles and tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Payment Tracking</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Track payments, manage dues, and monitor payment history effortlessly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d4ff00]/10 text-[#d4ff00]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Secure & Private</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Your data is protected with enterprise-grade security and privacy measures.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mission */}
        <div className="rounded-[1.5rem] bg-[#16161a] p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#d4ff00] mb-4">
            Our Mission
          </h3>
          <p className="text-sm text-zinc-300 leading-relaxed">
            We believe gym owners should spend less time on paperwork and more time helping their members achieve their fitness goals. GymTrack Pro is designed to streamline operations, reduce administrative burden, and provide the tools you need to grow your gym business.
          </p>
        </div>

        {/* Contact */}
        <div className="rounded-[1.5rem] bg-[#16161a] p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#d4ff00] mb-4">
            Get in Touch
          </h3>
          <div className="space-y-3 text-sm text-zinc-300">
            <p>Need help or have suggestions?</p>
            <Link
              href="/owner/profile/help"
              className="flex items-center gap-2 text-[#d4ff00] hover:text-[#b0e000] transition-colors"
            >
              <Heart className="h-4 w-4" />
              Visit our Help & Support page
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-500 py-4">
          <p>© 2024 GymTrack Pro. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
