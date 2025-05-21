import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { RefreshProvider } from "@/lib/refresh-context";
import { TraktImageCacheProvider } from "@/lib/trakt-image-cache";
import NotificationInitializer from "@/components/notification-initializer";
import { NotificationDebug } from "@/components/notification-debug";
import { ToastProvider } from "@/components/ui/toast";

const outfit = Outfit({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit"
});

export const metadata: Metadata = {
  title: "BridgeBoard - SeerrBridge Dashboard",
  description: "Monitor and manage your SeerrBridge service with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} relative min-h-screen`} suppressHydrationWarning>
        {/* Background patterns and effects */}
        <div className="fixed inset-0 -z-10 dot-pattern opacity-15" />
        
        {/* Top gradient */}
        <div className="fixed top-0 left-0 right-0 h-[40vh] -z-10 bg-gradient-to-b from-purple-600/20 via-purple-500/10 to-transparent" />
        
        {/* Bottom gradient */}
        <div className="fixed bottom-0 left-0 right-0 h-[40vh] -z-10 bg-gradient-to-t from-purple-800/20 via-indigo-900/10 to-transparent" />
        
        {/* Ambient light effect */}
        <div className="fixed top-[15%] right-[15%] w-[30vw] h-[30vw] -z-10 rounded-full bg-purple-500/5 blur-[100px]" />
        <div className="fixed bottom-[20%] left-[10%] w-[25vw] h-[25vw] -z-10 rounded-full bg-indigo-600/5 blur-[120px]" />
        
        {/* Subtle animated particles */}
        <div className="fixed inset-0 -z-10 opacity-30 mix-blend-soft-light overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-purple-300 animate-pulse-soft" style={{ animationDelay: "0s" }} />
          <div className="absolute top-3/4 left-1/2 w-1 h-1 rounded-full bg-purple-400 animate-pulse-soft" style={{ animationDelay: "0.5s" }} />
          <div className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-purple-500 animate-pulse-soft" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-1/4 right-1/3 w-1 h-1 rounded-full bg-indigo-400 animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-2/3 left-1/3 w-1 h-1 rounded-full bg-indigo-500 animate-pulse-soft" style={{ animationDelay: "2s" }} />
        </div>
        
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <RefreshProvider>
            <TraktImageCacheProvider>
              <ToastProvider>
                <NotificationInitializer />
                <NotificationDebug />
                {children}
              </ToastProvider>
            </TraktImageCacheProvider>
          </RefreshProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 