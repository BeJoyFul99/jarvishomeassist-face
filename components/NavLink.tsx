"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  end?: boolean;
}

export const NavLink = ({ 
  href, 
  children, 
  className,
  activeClassName = "bg-primary/10 text-primary border-r-2 border-primary",
  end = false
}: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = end ? pathname === href : pathname?.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary/50",
        className,
        isActive && activeClassName
      )}
    >
      {children}
    </Link>
  );
};

NavLink.displayName = "NavLink";
