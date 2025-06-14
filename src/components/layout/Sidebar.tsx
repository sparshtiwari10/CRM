import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  DollarSign,
  Settings,
  UserCog,
  ClipboardList,
  Menu,
  X,
  Wrench,
  Tv,
  FileText,
  Receipt,
} from "lucide-react";

// Navigation for administrators (full access)
const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "VC Inventory", href: "/vc-inventory", icon: Tv },
  { name: "Bills", href: "/bills", icon: FileText },
  { name: "Billing & Payments", href: "/billing", icon: CreditCard },
  { name: "Packages", href: "/packages", icon: Package },
  { name: "Requests", href: "/requests", icon: ClipboardList },
  { name: "Management", href: "/management", icon: Wrench },
  { name: "Employees", href: "/employees", icon: UserCog },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Navigation for employees (restricted access)
const employeeNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Billing & Payments", href: "/billing", icon: CreditCard },
  { name: "Requests", href: "/requests", icon: ClipboardList },
];

interface SidebarContentProps {
  onLinkClick?: () => void;
}

function SidebarContent({ onLinkClick }: SidebarContentProps) {
  const location = useLocation();
  const { isAdmin } = useAuth();

  // Choose navigation based on user role
  const navigation = isAdmin ? adminNavigation : employeeNavigation;

  return (
    <div className="flex h-full flex-col bg-background border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">AGV</span>
        </div>
      </div>

      {/* Role indicator */}
      <div className="px-4 py-2 border-b border-border bg-muted">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {isAdmin ? "Administrator" : "Employee Portal"}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onLinkClick}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
              )}
            >
              <Icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground group-hover:text-accent-foreground",
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          © 2024 AGV Cable
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps = {}) {
  return <SidebarContent onLinkClick={onLinkClick} />;
}
