import { useState, useEffect, createContext, useContext, ReactNode } from "react";

export type ToastType = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
  action?: ReactNode;
};

export type ToastContextType = {
  toasts: ToastType[];
  addToast: (toast: Omit<ToastType, "id">) => void;
  removeToast: (id: string) => void;
  updateToast: (id: string, toast: Partial<ToastType>) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    const toasts: ToastType[] = [];
    
    const addToast = (toast: Omit<ToastType, "id">) => {
      console.warn("Toast provider not found, toast not shown:", toast);
    };
    
    const removeToast = (id: string) => {
      console.warn("Toast provider not found, cannot remove toast:", id);
    };
    
    const updateToast = (id: string, toast: Partial<ToastType>) => {
      console.warn("Toast provider not found, cannot update toast:", id, toast);
    };
    
    return {
      toasts,
      addToast,
      removeToast,
      updateToast,
    };
  }
  
  return context;
}

export function toast(props: Omit<ToastType, "id">) {
  const { addToast } = useToast();
  addToast(props);
} 