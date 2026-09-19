import * as React from "react";
import { cn } from "./utils";
import { Loader2, AlertCircle, X } from "lucide-react";

// ============================================================================
// 1. Button Component
// ============================================================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
          // Variant classes
          {
            "bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800 shadow-sm":
              variant === "primary",
            "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-700/60":
              variant === "secondary",
            "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm":
              variant === "danger",
            "border border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white active:bg-zinc-700":
              variant === "outline",
            "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100 active:bg-zinc-800":
              variant === "ghost",
          },
          // Size classes with touch-friendly min-heights
          {
            "min-h-[36px] sm:min-h-[32px] px-3 text-xs gap-1.5": size === "sm",
            "min-h-[44px] px-4 py-2 text-sm gap-2": size === "md",
            "min-h-[48px] px-6 py-3 text-base gap-2.5": size === "lg",
          },
          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

// ============================================================================
// 2. Input Component
// ============================================================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus-visible:border-red-500",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

// ============================================================================
// 3. Select Component
// ============================================================================
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
          error && "border-red-500 focus-visible:border-red-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";

// ============================================================================
// 4. Checkbox Component
// ============================================================================
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          "h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500 focus:ring-offset-zinc-950 disabled:opacity-50 cursor-pointer",
          className,
        )}
        {...props}
      />
    );
  },
);
Checkbox.displayName = "Checkbox";

// ============================================================================
// 5. Radio Group Component
// ============================================================================
export interface RadioGroupOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioGroupOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex items-center gap-2 cursor-pointer text-sm text-zinc-200",
            opt.disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={opt.disabled}
            onChange={() => onChange?.(opt.value)}
            className="h-4 w-4 border-zinc-700 bg-zinc-950 text-violet-600 focus:ring-violet-500 focus:ring-offset-zinc-950 disabled:opacity-50"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
};

// ============================================================================
// 6. Dialog Component
// ============================================================================
export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  // Escape key listener & focus management
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent background scrolling on mobile & desktop
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={cn(
          "relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 my-auto max-h-[92vh] overflow-y-auto flex flex-col",
          className,
        )}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-3 shrink-0">
          <h3 id={titleId} className="text-base sm:text-lg font-bold text-zinc-100 truncate">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="flex items-center justify-center h-9 w-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 text-zinc-200">{children}</div>
      </div>
    </div>
  );
};

// ============================================================================
// 7. Drawer Component
// ============================================================================
export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  position?: "left" | "right";
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = "right",
  className,
}) => {
  const titleId = React.useId();

  // Escape key & overflow lock
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "fixed inset-y-0 w-full sm:w-96 max-w-full bg-zinc-950 border-zinc-800 p-4 sm:p-6 flex flex-col shadow-2xl transition-transform duration-300",
          position === "right" ? "right-0 border-l animate-in slide-in-from-right" : "left-0 border-r animate-in slide-in-from-left",
          className,
        )}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-800 gap-3">
          <h3 id={titleId} className="text-lg font-bold text-zinc-50 truncate">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="flex items-center justify-center h-9 w-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// ============================================================================
// 8. Card Component
// ============================================================================
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// ============================================================================
// 9. Table Components
// ============================================================================
export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className="w-full overflow-x-auto">
    <table
      className={cn(
        "w-full text-left border-collapse text-sm text-zinc-100",
        className,
      )}
      {...props}
    >
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ className, ...props }) => (
  <thead
    className={cn(
      "border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 font-medium",
      className,
    )}
    {...props}
  />
);

export const TableBody: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ className, ...props }) => (
  <tbody className={cn("divide-y divide-zinc-800/60", className)} {...props} />
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...props
}) => (
  <tr
    className={cn("hover:bg-zinc-900/30 transition-colors", className)}
    {...props}
  />
);

export const TableCell: React.FC<
  React.TdHTMLAttributes<HTMLTableCellElement>
> = ({ className, ...props }) => (
  <td className={cn("p-4 align-middle", className)} {...props} />
);

export const TableHead: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement>
> = ({ className, ...props }) => (
  <th
    className={cn("p-4 align-middle font-semibold text-zinc-300", className)}
    {...props}
  />
);

// ============================================================================
// 10. Badge Component
// ============================================================================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "secondary";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "info",
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          "bg-green-500/10 text-green-400 border border-green-500/20":
            variant === "success",
          "bg-amber-500/10 text-amber-400 border border-amber-500/20":
            variant === "warning",
          "bg-red-500/10 text-red-400 border border-red-500/20":
            variant === "danger",
          "bg-violet-500/10 text-violet-400 border border-violet-500/20":
            variant === "info",
          "bg-zinc-800 text-zinc-300 border border-zinc-700":
            variant === "secondary",
        },
        className,
      )}
      {...props}
    />
  );
};

// ============================================================================
// 11. Tabs Components
// ============================================================================
export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div className={cn("flex border-b border-zinc-800 gap-6", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "pb-3 text-sm font-medium transition-colors border-b-2 border-transparent hover:text-zinc-100",
            activeTab === tab.id
              ? "border-violet-500 text-zinc-100"
              : "text-zinc-400",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// 12. Tooltip Component
// ============================================================================
export interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 text-xs rounded bg-zinc-900 border border-zinc-800 text-zinc-200 whitespace-nowrap shadow-md">
        {content}
      </div>
    </div>
  );
};

// ============================================================================
// 13. Toast Component (Notification container mockup)
// ============================================================================
export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  onClose,
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-lg shadow-lg border text-sm max-w-sm animate-in fade-in slide-in-from-bottom-5",
        {
          "bg-green-950/80 border-green-800 text-green-200": type === "success",
          "bg-red-950/80 border-red-800 text-red-200": type === "error",
          "bg-zinc-900/90 border-zinc-800 text-zinc-100": type === "info",
        },
      )}
    >
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// 14. Form Field Component
// ============================================================================
export interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  children,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      {children}
      {error && (
        <span className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 15. Empty State Component
// ============================================================================
export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-zinc-800 rounded-lg">
      <AlertCircle className="h-8 w-8 text-zinc-500 mb-3" />
      <h3 className="text-md font-semibold text-zinc-200 mb-1">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-xs mb-4">{description}</p>
      {action}
    </div>
  );
};

// ============================================================================
// 16. Loading State Component
// ============================================================================
export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Loader2 className="h-8 w-8 text-violet-500 animate-spin mb-3" />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
};

// ============================================================================
// 17. Error State Component
// ============================================================================
export interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  retry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-red-500/20 bg-red-500/5 rounded-lg max-w-md mx-auto">
      <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
      <h3 className="text-md font-semibold text-red-400 mb-1">{title}</h3>
      <p className="text-sm text-zinc-300 mb-4">{message}</p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  );
};

// ============================================================================
// 18. Live Status Badge
// ============================================================================
export interface LiveStatusBadgeProps {
  status: "SCHEDULED" | "PREPARING" | "LIVE" | "PAUSED" | "ENDING" | "ENDED" | "CANCELLED" | string;
  className?: string;
}

export const LiveStatusBadge: React.FC<LiveStatusBadgeProps> = ({
  status,
  className,
}) => {
  const normalized = status?.toUpperCase() || "PREPARING";

  if (normalized === "LIVE") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30",
          className,
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        LIVE ON AIR
      </span>
    );
  }

  if (normalized === "PAUSED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30",
          className,
        )}
      >
        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
        PAUSED
      </span>
    );
  }

  if (normalized === "PREPARING" || normalized === "SCHEDULED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30",
          className,
        )}
      >
        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
        {normalized}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700",
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
      {normalized}
    </span>
  );
};

// ============================================================================
// 19. Tier Badge
// ============================================================================
export interface TierBadgeProps {
  isPriority: boolean;
  tierName?: string;
  priceCents?: number;
  colorSlot?: string;
  className?: string;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  isPriority,
  tierName,
  priceCents,
  colorSlot,
  className,
}) => {
  if (!isPriority) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700",
          className,
        )}
      >
        Free Line
      </span>
    );
  }

  // Tier color lookup
  const colorStyles: Record<string, string> = {
    TIER_COLOR_1: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    TIER_COLOR_2: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    TIER_COLOR_3: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    TIER_COLOR_4: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    TIER_COLOR_5: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    TIER_COLOR_6: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    TIER_COLOR_7: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    TIER_COLOR_8: "bg-lime-500/15 text-lime-300 border-lime-500/30",
    TIER_COLOR_9: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    TIER_COLOR_10: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };

  const activeColor =
    (colorSlot && colorStyles[colorSlot]) ||
    "bg-amber-500/15 text-amber-300 border-amber-500/30";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border",
        activeColor,
        className,
      )}
    >
      <span>💎 {tierName || "Priority"}</span>
      {priceCents !== undefined && (
        <span className="opacity-75 font-mono text-[11px]">
          ${(priceCents / 100).toFixed(2)}
        </span>
      )}
    </span>
  );
};

// ============================================================================
// 20. Progress Bar
// ============================================================================
export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  markerPosition?: number; // 0 to 100, e.g. 2-min mark
  markerLabel?: string;
  className?: string;
  barClassName?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  markerPosition,
  markerLabel,
  className,
  barClassName,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("relative w-full", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn(
            "h-full bg-amber-500 transition-all duration-150 rounded-full",
            barClassName,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {markerPosition !== undefined && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-green-400 z-10 -mt-0.5 -mb-0.5"
          style={{ left: `${markerPosition}%` }}
          title={markerLabel || "2-minute qualification mark"}
        />
      )}
    </div>
  );
};

