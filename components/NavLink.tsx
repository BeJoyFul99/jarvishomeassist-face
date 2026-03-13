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
  activeClassName = "bg-primary/10 text-primary",
  end = false,
}: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = end ? pathname === href : pathname?.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 transition-colors",
        className,
        isActive && activeClassName,
      )}
    >
      {children}
    </Link>
  );
};

NavLink.displayName = "NavLink";
