/**
 * A standalone toast notification manager that doesn't rely on React hooks
 * This can be safely called from anywhere in the application
 */

type ToastVariant = "default" | "destructive";

interface ToastOptions {
  title: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

class ToastManager {
  private static instance: ToastManager;
  private container: HTMLDivElement | null = null;
  private toastCount = 0;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  private createContainer(): HTMLDivElement {
    if (typeof document === 'undefined') return null as any; // SSR check
    
    if (this.container) return this.container;
    
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '1rem';
    container.style.right = '1rem';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '0.5rem';
    container.style.zIndex = '9999';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
    
    this.container = container;
    return container;
  }

  public show(options: ToastOptions): void {
    if (typeof document === 'undefined') return; // SSR check
    
    const container = this.createContainer();
    const toastId = `toast-${Date.now()}-${this.toastCount++}`;
    const duration = options.duration || 5000;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.style.backgroundColor = options.variant === 'destructive' ? 'rgba(220, 38, 38, 0.9)' : 'rgba(0, 0, 0, 0.8)';
    toast.style.color = 'white';
    toast.style.padding = '1rem';
    toast.style.borderRadius = '0.375rem';
    toast.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    toast.style.maxWidth = '24rem';
    toast.style.width = '100%';
    toast.style.pointerEvents = 'auto';
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(1rem)';
    
    // Toast title
    const title = document.createElement('div');
    title.style.fontWeight = 'bold';
    title.style.fontSize = '0.875rem';
    title.style.marginBottom = '0.25rem';
    title.textContent = options.title;
    toast.appendChild(title);
    
    // Toast description
    const description = document.createElement('div');
    description.style.fontSize = '0.875rem';
    description.style.opacity = '0.9';
    description.textContent = options.description;
    toast.appendChild(description);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '0.5rem';
    closeButton.style.right = '0.5rem';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '1.25rem';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => this.removeToast(toastId);
    toast.appendChild(closeButton);
    
    // Position the toast relatively for the close button
    toast.style.position = 'relative';
    
    // Add toast to container
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
      this.removeToast(toastId);
    }, duration);
  }

  private removeToast(id: string): void {
    if (typeof document === 'undefined') return; // SSR check
    
    const toast = document.getElementById(id);
    if (!toast) return;
    
    // Fade out animation
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(1rem)';
    
    // Remove from DOM after animation
    setTimeout(() => {
      toast?.remove();
    }, 300);
  }
}

// Export a singleton instance
export const toastManager = ToastManager.getInstance();

// Convenient function to show a toast
export function showToast(options: ToastOptions): void {
  toastManager.show(options);
} 