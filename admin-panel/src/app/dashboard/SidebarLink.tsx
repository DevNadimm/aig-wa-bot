"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";

interface SubItem {
  name: string;
  href: string;
}

interface SidebarLinkProps {
  href: string;
  name: string;
  icon: React.ReactNode;
  subItems?: SubItem[];
}

export function SidebarLink({ href, name, icon, subItems }: SidebarLinkProps) {
  const pathname = usePathname();

  // For parent, check if pathname starts with href, except for dashboard root
  const isActive = href === '/dashboard' 
    ? pathname === '/dashboard' 
    : pathname.startsWith(href);

  const [isOpen, setIsOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  if (subItems && subItems.length > 0) {
    const parentButtonClasses = isOpen
      ? (isActive 
          ? "bg-zinc-800/70 text-zinc-100 font-medium" 
          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100")
      : (isActive 
          ? "bg-white text-zinc-900 font-semibold" 
          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100");

    const parentIconClasses = isOpen
      ? (isActive ? "text-zinc-200" : "text-zinc-500 group-hover:text-zinc-300")
      : (isActive ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-300");

    const parentChevronClasses = isOpen
      ? (isActive ? "text-zinc-300 rotate-180" : "text-zinc-500 rotate-180")
      : (isActive ? "text-zinc-900" : "text-zinc-500");

    return (
      <li className="flex flex-col gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group ${parentButtonClasses}`}
        >
          <div className="flex items-center gap-3">
            <span className={`flex items-center justify-center transition-colors ${parentIconClasses}`}>
              {icon}
            </span>
            {name}
          </div>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${parentChevronClasses}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="relative ml-5 pl-3.5 my-1 space-y-1 border-l border-zinc-800/80">
            {subItems.map((sub) => {
              const bestMatch = [...subItems]
                .sort((a, b) => b.href.length - a.href.length)
                .find(s => pathname === s.href || pathname.startsWith(s.href + '/'));
              
              const isSubActive = bestMatch?.href === sub.href;
              
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  prefetch={true}
                  className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isSubActive
                      ? "bg-zinc-800 text-white shadow-sm font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 transition-all ${
                      isSubActive
                        ? "bg-indigo-400 ring-4 ring-indigo-500/20 shadow-[0_0_8px_rgba(129,140,248,0.6)]"
                        : "bg-zinc-600 group-hover:bg-zinc-400"
                    }`}
                  />
                  <span>{sub.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        prefetch={true}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
          isActive 
            ? "bg-white text-zinc-900 font-semibold" 
            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
        }`}
      >
        <span className={`flex items-center justify-center transition-colors ${
          isActive ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-300"
        }`}>
          {icon}
        </span>
        {name}
      </Link>
    </li>
  );
}
