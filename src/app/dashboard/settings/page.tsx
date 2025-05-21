"use client";

import { Suspense, useState } from "react";
import { 
  SettingsIcon,
  KeyIcon,
  LogOutIcon,
  ArrowLeftIcon,
  ScrollTextIcon,
  SlidersHorizontalIcon
} from "lucide-react";
import Link from "next/link";
import { EnvConfig } from "@/components/env-config";
import { NotificationSettings } from "@/components/notification-settings";
import { LogConfigurator } from "@/components/log-configurator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link 
          href="/dashboard" 
          className="flex items-center text-primary hover:underline"
        >
          <ArrowLeftIcon size={16} className="mr-2" />
          Back to Dashboard
        </Link>
      </div>
      
      <div className="flex items-center mb-8">
        <SettingsIcon size={28} className="mr-3 text-primary" />
        <h1 className="text-3xl font-bold">SeerrBridge Settings</h1>
      </div>
      
      <div className="mb-6">
        <p className="text-muted-foreground">
          Configure environment variables, notifications, and log display settings for your SeerrBridge service
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="general" className="flex items-center">
            <SlidersHorizontalIcon size={16} className="mr-2" />
            General Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <KeyIcon size={16} className="mr-2" />
            Notification Settings
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center">
            <ScrollTextIcon size={16} className="mr-2" />
            Log Configurator
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Suspense fallback={<div className="glass-card p-8 text-center min-h-[500px] flex items-center justify-center">Loading environment configuration...</div>}>
            <EnvConfig />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Suspense fallback={<div className="glass-card p-8 text-center min-h-[500px] flex items-center justify-center">Loading notification settings...</div>}>
            <NotificationSettings />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="logs">
          <Suspense fallback={<div className="glass-card p-8 text-center min-h-[500px] flex items-center justify-center">Loading log configurator...</div>}>
            <LogConfigurator />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}