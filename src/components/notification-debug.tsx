"use client";

import { useState, useEffect } from "react";
import { BugIcon, RefreshCwIcon, XIcon } from "lucide-react";

interface NotificationDebugState {
  config: {
    logTypes: number;
    logDisplays: number;
    notificationTypes: number;
  };
  background: {
    lastRun: string | null;
    status: "success" | "error" | "idle";
    notifications: number;
  };
  webhookStatus: "configured" | "not_configured";
}

export function NotificationDebug() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<NotificationDebugState>({
    config: {
      logTypes: 0,
      logDisplays: 0,
      notificationTypes: 0
    },
    background: {
      lastRun: null,
      status: "idle",
      notifications: 0
    },
    webhookStatus: "not_configured"
  });
  const [loading, setLoading] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [showWidget, setShowWidget] = useState(false);

  // Check if in development mode
  useEffect(() => {
    setIsDevMode(process.env.NODE_ENV === 'development');
    
    // Check if debug widget is enabled
    const checkDebugWidgetEnabled = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (response.ok) {
          const data = await response.json();
          // Only show widget if the setting is explicitly true
          setShowWidget(data.show_debug_widget === true);
        }
      } catch (error) {
        console.error("Error checking debug widget settings:", error);
        // Default to not showing if there's an error
        setShowWidget(false);
      }
    };
    
    checkDebugWidgetEnabled();

    // Listen for settings changes
    const handleSettingsChange = (event: CustomEvent) => {
      if (event.detail?.settings?.show_debug_widget !== undefined) {
        // Only show widget if the setting is explicitly true
        setShowWidget(event.detail.settings.show_debug_widget === true);
      }
    };

    // Add event listener for settings changes
    window.addEventListener('notification-settings-changed', handleSettingsChange as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('notification-settings-changed', handleSettingsChange as EventListener);
    };
  }, []);

  // Load debug info
  const loadDebugInfo = async () => {
    try {
      setLoading(true);
      
      // Load log configurator settings
      const configResponse = await fetch("/api/logs/config");
      if (configResponse.ok) {
        const configData = await configResponse.json();
        
        // Load notification settings
        const notificationResponse = await fetch("/api/notifications");
        if (notificationResponse.ok) {
          const notificationData = await notificationResponse.json();
          
          setState({
            config: {
              logTypes: configData.logTypes?.length || 0,
              logDisplays: configData.logDisplays?.length || 0,
              notificationTypes: (
                (notificationData.notify_on_success ? 1 : 0) +
                (notificationData.notify_on_error ? 1 : 0) +
                (notificationData.notify_on_warning ? 1 : 0)
              ),
            },
            background: {
              ...state.background,
            },
            webhookStatus: notificationData.discord_webhook_url ? "configured" : "not_configured"
          });
          
          // Update widget visibility setting - only show if explicitly true
          setShowWidget(notificationData.show_debug_widget === true);
        }
      }
    } catch (error) {
      console.error("Error loading debug info:", error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger background processing
  const triggerBackgroundProcess = async () => {
    try {
      setLoading(true);
      setState(prev => ({
        ...prev,
        background: {
          ...prev.background,
          status: "idle"
        }
      }));
      
      const response = await fetch("/api/notifications/background");
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          background: {
            lastRun: new Date().toISOString(),
            status: "success",
            notifications: data.processed?.configuredNotifications || 0
          }
        }));
      } else {
        setState(prev => ({
          ...prev,
          background: {
            lastRun: new Date().toISOString(),
            status: "error",
            notifications: 0
          }
        }));
      }
    } catch (error) {
      console.error("Error triggering background process:", error);
      setState(prev => ({
        ...prev,
        background: {
          lastRun: new Date().toISOString(),
          status: "error",
          notifications: 0
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Only render if explicitly enabled (regardless of dev mode)
  if (!showWidget) return null;

  return (
    <>
      {/* Debug Button */}
      <button 
        className="fixed bottom-4 right-4 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90 transition-all"
        onClick={() => {
          setIsOpen(true);
          loadDebugInfo();
        }}
        title="Notification Debug"
      >
        <BugIcon size={20} />
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg shadow-xl overflow-hidden bg-background border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center">
                <BugIcon size={16} className="mr-2" />
                Notification Debug
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-muted/20"
              >
                <XIcon size={18} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Log Configuration</h3>
                <div className="bg-muted/10 rounded-md p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Log Types:</span>
                    <span className="font-mono">{state.config.logTypes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Display Rules:</span>
                    <span className="font-mono">{state.config.logDisplays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Notification Types:</span>
                    <span className="font-mono">{state.config.notificationTypes}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Webhook Status</h3>
                <div className="flex justify-between items-center bg-muted/10 rounded-md p-3">
                  <span>Discord Webhook:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    state.webhookStatus === "configured" 
                      ? "bg-success/20 text-success" 
                      : "bg-destructive/20 text-destructive"
                  }`}>
                    {state.webhookStatus === "configured" ? "Configured" : "Not Configured"}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Background Processing</h3>
                <div className="bg-muted/10 rounded-md p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Last Run:</span>
                    <span className="font-mono">
                      {state.background.lastRun 
                        ? new Date(state.background.lastRun).toLocaleTimeString() 
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      state.background.status === "success" 
                        ? "bg-success/20 text-success" 
                        : state.background.status === "error"
                        ? "bg-destructive/20 text-destructive"
                        : "bg-muted/20"
                    }`}>
                      {state.background.status === "success" 
                        ? "Success" 
                        : state.background.status === "error"
                        ? "Error"
                        : "Idle"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Notifications Sent:</span>
                    <span className="font-mono">{state.background.notifications}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex space-x-2">
              <button
                onClick={loadDebugInfo}
                className="flex-1 bg-secondary/10 hover:bg-secondary/20 text-secondary py-2 rounded-md flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <RefreshCwIcon size={16} className="animate-spin mr-2" />
                ) : (
                  <RefreshCwIcon size={16} className="mr-2" />
                )}
                Refresh
              </button>
              <button
                onClick={triggerBackgroundProcess}
                className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-md flex items-center justify-center"
                disabled={loading}
              >
                <RefreshCwIcon size={16} className="mr-2" />
                Trigger Process
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 