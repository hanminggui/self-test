import React, { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Custom max-height class on mobile (default: max-h-[85dvh]) */
  maxHeight?: string;
  /** Whether to show the top drag handle pill on mobile (default: true) */
  showDragHandle?: boolean;
  /** Whether to show the top close (X) button (default: true) */
  showCloseButton?: boolean;
  /** Extra header action element (optional) */
  headerAction?: React.ReactNode;
  /** Custom footer (optional, e.g. pinned buttons) */
  footer?: React.ReactNode;
  /** Desktop modal width constraint class (default: sm:max-w-md) */
  desktopMaxWidth?: string;
  /** Custom additional class names for the sheet dialog */
  className?: string;
  /** Accessibility label */
  ariaLabel?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = "max-h-[85dvh]",
  showDragHandle = true,
  showCloseButton = true,
  headerAction,
  footer,
  desktopMaxWidth = "sm:max-w-md",
  className = "",
  ariaLabel,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  // Keyboard Escape listener & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Touch gesture handlers for drag-to-dismiss on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only allow drag-to-dismiss if initiating on or near header/drag-handle
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartY.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    // Only allow downward drag
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartY.current) return;
    const touchEndTime = Date.now();
    const duration = touchEndTime - touchStartTime.current;
    const currentY = e.changedTouches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    // Fast flick down or pulled down more than 75px triggers close
    const velocity = deltaY / (duration || 1);
    if (deltaY > 75 || (velocity > 0.4 && deltaY > 30)) {
      setDragOffset(deltaY);
      onClose();
    } else {
      // Spring back
      setDragOffset(0);
    }

    touchStartY.current = 0;
    setIsDragging(false);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : ariaLabel || "Modal Dialog"}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* 1. Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-stone-950/60 dark:bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Sheet Dialog Container */}
      <div
        ref={sheetRef}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={`relative w-full ${desktopMaxWidth} z-10 flex flex-col 
          bg-[#FFFDF8] dark:bg-[#0E0E16] text-stone-900 dark:text-white
          rounded-t-[28px] sm:rounded-3xl
          border-t-[2.5px] border-x-[2.5px] sm:border-[2.5px] border-stone-900 dark:border-white/20
          shadow-[0_-6px_25px_rgba(28,25,23,0.18)] sm:shadow-[0_8px_0_#1c1917] dark:sm:shadow-[4px_4px_0px_#CCFF00]
          overflow-hidden animate-bottom-sheet sm:animate-in sm:zoom-in-95 sm:fade-in duration-200
          pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0
          ${className}`}
      >
        {/* Top Drag Handle Bar (Touch Drag Target) */}
        {showDragHandle && (
          <div
            className="w-full pt-3 pb-1 cursor-grab active:cursor-grabbing sm:hidden flex justify-center touch-none select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-white/20 hover:bg-stone-400 dark:hover:bg-white/30 transition-colors" />
          </div>
        )}

        {/* Header Bar */}
        {(title || showCloseButton || headerAction) && (
          <div
            className="px-5 sm:px-6 pt-3 sm:pt-6 pb-3 flex items-start justify-between gap-3 border-b-2 border-stone-900/10 dark:border-white/10 shrink-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="min-w-0 flex-1">
              {title && (
                <div className="text-base sm:text-lg font-black tracking-tight text-stone-950 dark:text-white truncate">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-xs text-stone-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {subtitle}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerAction}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-11 h-11 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/20 border border-stone-300 dark:border-white/15 text-stone-700 dark:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Body (Scrollable with max height) */}
        <div className={`p-5 sm:p-6 overflow-y-auto overscroll-contain ${maxHeight}`}>
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="p-4 sm:p-5 border-t-2 border-stone-900/10 dark:border-white/10 bg-amber-50/50 dark:bg-white/[0.02] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
