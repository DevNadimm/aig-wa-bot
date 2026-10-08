import { ReactNode } from "react";
import { SecurityLockIcon } from "hugeicons-react";

interface FeatureLockProps {
  isLocked: boolean;
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function FeatureLock({ 
  isLocked, 
  children, 
  title = "Feature Locked", 
  description = "This feature is currently locked. Upgrade your plan or contact admin to unlock.",
  className = ""
}: FeatureLockProps) {
  if (!isLocked) return <>{children}</>;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blurred & Darkened Content */}
      <div className="pointer-events-none select-none blur-[2px] opacity-60 transition-all duration-500">
        {children}
      </div>

      {/* Lock Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4 shadow-2xl">
          <SecurityLockIcon className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-100">{title}</h3>
        <p className="text-zinc-400 mt-2 max-w-sm text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}
