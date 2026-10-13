"use client";

import Link from"next/link";
import { usePathname } from"next/navigation";
import React, { useState, useEffect } from"react";

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
    return (
      <li className="flex flex-col gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
            isActive ? "bg-white text-zinc-900" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`flex items-center justify-center transition-colors ${
              isActive ? "text-zinc-900" : "text-zinc-500 group-hover:text-zinc-300"
            }`}>
              {icon}
            </span>
            {name}
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""} ${isActive ? "text-zinc-900" : "text-zinc-500"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <ul className="pl-9 pr-2 space-y-1 mt-1">
            {subItems.map((sub) => {
              const bestMatch = [...subItems]
                .sort((a, b) => b.href.length - a.href.length)
                .find(s => pathname === s.href || pathname.startsWith(s.href + '/'));
              
              const isSubActive = bestMatch?.href === sub.href;
              
              return (
                <li key={sub.href}>
                  <Link
                    href={sub.href}
                    prefetch={true}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      isSubActive
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30"
                    }`}
                  >
                    {sub.name}
                  </Link>
                </li>
              );
            })}
          </ul>
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
            ?"bg-white text-zinc-900" 
            :"text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
        }`}
      >
        <span className={`flex items-center justify-center transition-colors ${
          isActive ?"text-zinc-900" :"text-zinc-500 group-hover:text-zinc-300"
        }`}>
          {icon}
        </span>
        {name}
      </Link>
    </li>
  );
}
