import * as React from "react"
import { cn } from "cn"

export interface SelectProps extends React.ComponentProps<"select"> {
  sizeVariant?: "default" | "sm"
}

const CHEVRON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`

function Select({
  className,
  sizeVariant = "default",
  children,
  style,
  ...props
}: SelectProps) {
  const isSm = sizeVariant === "sm"

  return (
    <select
      data-slot="select"
      className={cn(
        "appearance-none w-full min-w-0 rounded-lg border border-zinc-800 bg-[#0c0c0e] dark:bg-input/30 text-zinc-100 transition-colors outline-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 bg-no-repeat [&>option]:bg-[#111113] [&>option]:text-zinc-100",
        isSm ? "h-8 pl-2.5 pr-7 text-xs" : "h-10 pl-3 pr-10 text-sm",
        className
      )}
      style={{
        backgroundImage: CHEVRON_SVG,
        backgroundPosition: isSm ? "right 6px center" : "right 12px center",
        backgroundSize: isSm ? "14px" : "16px",
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
}

export { Select }
