"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useToast, ToastContext, ToastType } from "@/components/ui/use-toast"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([]);
  
  const addToast = (toast: Omit<ToastType, "id">) => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { id, ...toast }]);
    
    // Auto-dismiss toast after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  };
  
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };
  
  const updateToast = (id: string, toast: Partial<ToastType>) => {
    setToasts((prev) => 
      prev.map((t) => (t.id === id ? { ...t, ...toast } : t))
    );
  };
  
  const contextValue = React.useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      updateToast,
    }),
    [toasts]
  );
  
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </ToastViewport>
    </ToastContext.Provider>
  );
}

interface ToastProps extends Omit<ToastType, 'variant'>, VariantProps<typeof toastVariants> {
  onClose: () => void;
}

function Toast({
  id,
  title,
  description,
  variant,
  action,
  onClose,
}: ToastProps) {
  return (
    <div className={cn(toastVariants({ variant }))}>
      <div className="grid gap-1">
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      {action && <div>{action}</div>}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    </div>
  );
}

function ToastViewport({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {children}
    </div>
  );
} 