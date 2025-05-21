import { StatsCards } from "@/components/stats-cards";
import { RecentLogs } from "@/components/recent-logs";
import { TVSubscriptions } from "@/components/tv-subscriptions";
import { Suspense } from "react";
import Link from "next/link";
import { SettingsIcon, BarChart3Icon } from "lucide-react";
import { NotificationHistory } from "@/components/notification-history";

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 pb-16 pt-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <BarChart3Icon size={28} className="mr-3 text-primary" />
          Dashboard
        </h1>
        
        <div className="flex items-center gap-3">
          <NotificationHistory />
          
          <Link 
            href="/dashboard/settings" 
            className="glass-button flex items-center px-4 py-2 shadow-sm"
          >
            <SettingsIcon size={16} className="mr-2" />
            Settings
          </Link>
        </div>
      </div>
      
      <Suspense fallback={<div className="glass-card p-8 text-center h-36">Loading stats...</div>}>
        <StatsCards />
      </Suspense>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Suspense fallback={<div className="glass-card p-8 text-center min-h-[500px] flex items-center justify-center">Loading logs...</div>}>
          <RecentLogs />
        </Suspense>
        
        <Suspense fallback={<div className="glass-card p-8 text-center min-h-[500px] flex items-center justify-center">Loading TV subscriptions...</div>}>
          <TVSubscriptions />
        </Suspense>
      </div>
    </div>
  );
} 