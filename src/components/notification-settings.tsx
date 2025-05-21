"use client";

import { useState, useEffect } from "react";
import { BellIcon, RefreshCwIcon, AlertCircleIcon, CheckCircleIcon, SaveIcon, SendIcon, AlertTriangleIcon } from "lucide-react";

interface NotificationSettings {
  discord_webhook_url: string;
  notify_on_success: boolean;
  notify_on_error: boolean;
  notify_on_warning: boolean;
  show_debug_widget: boolean;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    discord_webhook_url: "",
    notify_on_success: false,
    notify_on_error: true,
    notify_on_warning: false,
    show_debug_widget: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const response = await fetch("/api/notifications");
        if (!response.ok) {
          throw new Error("Failed to fetch notification settings");
        }
        const data = await response.json();
        setSettings(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
    
    // Set up refresh timer
    const interval = setInterval(() => {
      fetchSettings();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const isValidWebhookUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid (just means disabled)
    try {
      const webhookUrl = new URL(url);
      return webhookUrl.hostname === 'discord.com' && 
             webhookUrl.pathname.startsWith('/api/webhooks/') &&
             webhookUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };
  
  const handleWebhookChange = (value: string) => {
    setSettings(prev => ({
      ...prev,
      discord_webhook_url: value
    }));
    // Clear test results when URL changes
    if (testResult) setTestResult(null);
  };
  
  const handleToggleChange = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // If changing the debug widget setting, dispatch an event immediately for real-time updates
    if (key === "show_debug_widget") {
      const event = new CustomEvent('notification-settings-changed', {
        detail: { 
          settings: {
            show_debug_widget: value
          }
        }
      });
      window.dispatchEvent(event);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate webhook URL format if not empty
    if (settings.discord_webhook_url && !isValidWebhookUrl(settings.discord_webhook_url)) {
      setError("Invalid Discord webhook URL format. It should start with https://discord.com/api/webhooks/");
      return;
    }
    
    try {
      setSaving(true);
      setSuccess(null);
      setError(null);
      setTestResult(null);
      
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save notification settings");
      }
      
      setSuccess("Notification settings saved successfully");
      
      // Dispatch event for other components to react to settings changes
      const event = new CustomEvent('notification-settings-changed', {
        detail: { settings }
      });
      window.dispatchEvent(event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    // Validate webhook URL format before sending test
    if (!isValidWebhookUrl(settings.discord_webhook_url)) {
      setTestResult({
        success: false,
        message: "Invalid Discord webhook URL format. It should start with https://discord.com/api/webhooks/"
      });
      return;
    }
    
    try {
      setTesting(true);
      setTestResult(null);
      setSuccess(null);
      setError(null);
      
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setTestResult({
          success: false,
          message: data.error || "Failed to send test notification"
        });
      } else {
        setTestResult({
          success: true,
          message: data.message || "Test notification sent successfully!"
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "An unknown error occurred"
      });
    } finally {
      setTesting(false);
    }
  };
  
  // Check if there's a validation error with the webhook URL
  const webhookUrlError = settings.discord_webhook_url && !isValidWebhookUrl(settings.discord_webhook_url)
    ? "Invalid webhook URL format. Must be a Discord webhook URL." 
    : null;
  
  const handleTestType = async (type: string) => {
    try {
      setTesting(true);
      setTestResult(null);
      setSuccess(null);
      setError(null);
      
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setTestResult({
          success: false,
          message: data.error || "Failed to send test notification"
        });
      } else {
        setTestResult({
          success: true,
          message: data.message || "Test notification sent successfully!"
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "An unknown error occurred"
      });
    } finally {
      setTesting(false);
    }
  };
  
  return (
    <div className="glass-card h-full flex flex-col">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center mb-1">
          <h2 className="text-xl font-semibold flex items-center">
            <BellIcon size={20} className="mr-2 text-primary" />
            Notification Settings
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure Discord webhook notifications for SeerrBridge events
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <RefreshCwIcon size={36} className="text-primary/60 animate-spin mb-3" />
            <p className="text-muted-foreground">Loading notification settings...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <AlertCircleIcon size={36} className="text-destructive mb-3" />
            <p className="text-destructive font-medium mb-2">{error}</p>
            <button
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md transition-all hover:bg-primary/90"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 p-5 overflow-y-auto space-y-6">
              <div className="group">
                <label 
                  htmlFor="webhook" 
                  className="text-sm font-medium mb-1.5 block group-hover:text-primary transition-colors"
                >
                  Discord Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="webhook"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={settings.discord_webhook_url}
                    onChange={(e) => handleWebhookChange(e.target.value)}
                    className={`glass-input w-full px-3 py-2 rounded-md focus:outline-none ${
                      webhookUrlError ? "border-destructive/50" : ""
                    }`}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-md transition-colors flex items-center"
                    onClick={handleTestWebhook}
                    disabled={testing || !settings.discord_webhook_url || webhookUrlError !== null}
                    title={webhookUrlError ? "Please enter a valid Discord webhook URL first" : "Test your webhook"}
                  >
                    {testing ? (
                      <RefreshCwIcon size={16} className="animate-spin" />
                    ) : (
                      <SendIcon size={16} />
                    )}
                    <span className="ml-2">Test</span>
                  </button>
                </div>
                {webhookUrlError && (
                  <p className="text-xs text-destructive mt-1">
                    {webhookUrlError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  Provide a Discord webhook URL to receive notifications
                </p>
                
                {testResult && (
                  <div className={`mt-2 px-3 py-2 rounded-md flex items-center text-sm ${
                    testResult.success 
                      ? "bg-success/10 text-success border border-success/20" 
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}>
                    {testResult.success ? (
                      <CheckCircleIcon size={16} className="mr-2 flex-shrink-0" />
                    ) : (
                      <AlertCircleIcon size={16} className="mr-2 flex-shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Notification Preferences
                </label>
                
                <div className="space-y-3">
                  <ToggleOption 
                    title="Success Notifications" 
                    description="Receive notifications for successful operations"
                    isEnabled={settings.notify_on_success}
                    onToggle={() => handleToggleChange("notify_on_success", !settings.notify_on_success)}
                    colorClass="bg-success/10 border-success/20 hover:bg-success/20"
                  />
                  
                  <ToggleOption 
                    title="Error Notifications" 
                    description="Receive notifications for errors and failures"
                    isEnabled={settings.notify_on_error}
                    onToggle={() => handleToggleChange("notify_on_error", !settings.notify_on_error)}
                    colorClass="bg-destructive/10 border-destructive/20 hover:bg-destructive/20"
                  />
                  
                  <ToggleOption 
                    title="Warning Notifications" 
                    description="Receive notifications for warnings"
                    isEnabled={settings.notify_on_warning}
                    onToggle={() => handleToggleChange("notify_on_warning", !settings.notify_on_warning)}
                    colorClass="bg-warning/10 border-warning/20 hover:bg-warning/20"
                  />
                  
                  <ToggleOption 
                    title="Debug Widget" 
                    description="Show notification debug widget in the UI"
                    isEnabled={settings.show_debug_widget}
                    onToggle={() => handleToggleChange("show_debug_widget", !settings.show_debug_widget)}
                    colorClass="bg-secondary/10 border-secondary/20 hover:bg-secondary/20"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="text-sm font-medium mb-3 block">
                  Test Notifications
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 bg-success/20 hover:bg-success/30 text-success rounded-md transition-colors flex items-center"
                    onClick={() => handleTestType("success")}
                    disabled={testing || !settings.discord_webhook_url || webhookUrlError !== null || !settings.notify_on_success}
                    title={!settings.notify_on_success ? "Enable success notifications first" : "Send a test success notification"}
                  >
                    {testing ? (
                      <RefreshCwIcon size={16} className="animate-spin mr-2" />
                    ) : (
                      <CheckCircleIcon size={16} className="mr-2" />
                    )}
                    <span>Test Success</span>
                  </button>

                  <button
                    type="button"
                    className="px-3 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-md transition-colors flex items-center"
                    onClick={() => handleTestType("error")}
                    disabled={testing || !settings.discord_webhook_url || webhookUrlError !== null || !settings.notify_on_error}
                    title={!settings.notify_on_error ? "Enable error notifications first" : "Send a test error notification"}
                  >
                    {testing ? (
                      <RefreshCwIcon size={16} className="animate-spin mr-2" />
                    ) : (
                      <AlertCircleIcon size={16} className="mr-2" />
                    )}
                    <span>Test Error</span>
                  </button>

                  <button
                    type="button"
                    className="px-3 py-2 bg-warning/20 hover:bg-warning/30 text-warning rounded-md transition-colors flex items-center"
                    onClick={() => handleTestType("warning")}
                    disabled={testing || !settings.discord_webhook_url || webhookUrlError !== null || !settings.notify_on_warning}
                    title={!settings.notify_on_warning ? "Enable warning notifications first" : "Send a test warning notification"}
                  >
                    {testing ? (
                      <RefreshCwIcon size={16} className="animate-spin mr-2" />
                    ) : (
                      <AlertTriangleIcon size={16} className="mr-2" />
                    )}
                    <span>Test Warning</span>
                  </button>
                </div>
              </div>
            </div>
            
            {success && (
              <div className="px-5 py-3 flex items-center space-x-2 border-t border-success/20 bg-success/5 text-success">
                <CheckCircleIcon size={16} />
                <span>{success}</span>
              </div>
            )}
            
            <div className="p-4 border-t border-border/50 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors flex items-center"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCwIcon size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon size={16} className="mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface ToggleOptionProps {
  title: string;
  description: string;
  isEnabled: boolean;
  onToggle: () => void;
  colorClass?: string;
}

function ToggleOption({ title, description, isEnabled, onToggle, colorClass = "" }: ToggleOptionProps) {
  return (
    <div 
      className={`glass-card flex items-center justify-between px-4 py-3 
                 transition-colors duration-200 cursor-pointer border ${colorClass}`}
      onClick={onToggle}
    >
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <div 
        className={`relative inline-flex h-6 w-11 items-center rounded-full 
                  transition-colors focus-visible:outline-none
                  ${isEnabled ? 'bg-primary' : 'bg-muted'}`}
        role="switch"
        aria-checked={isEnabled}
      >
        <span 
          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg 
                    ring-0 transition-transform 
                    ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
    </div>
  );
} 