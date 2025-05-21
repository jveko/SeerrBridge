"use client";

import { SailboatIcon } from "lucide-react";
import Link from "next/link";
import { NotificationDebug } from "@/components/notification-debug";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Hero Section with Enhanced Gradient Background */}
      <header className="animated-gradient py-16 md:py-20 px-4 md:px-8 flex flex-col items-center justify-center text-center text-white shadow-lg relative">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex items-center mb-4">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md mr-4">
            <SailboatIcon size={42} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">BridgeBoard</h1>
        </div>
        <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90 font-light">
          Monitor and manage your SeerrBridge service with a beautiful dashboard
        </p>
      </header>
      {children}
      <NotificationDebug />
    </>
  );
} 