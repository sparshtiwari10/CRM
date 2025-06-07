import { useState } from "react";
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
} from "lucide-react";

// Navigation for administrators (full access)
const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Billing & Payments", href: "/billing", icon: CreditCard },
  { name: "Packages", href: "/packages", icon: Package },
  { name: "Requests", href: "/requests", icon: ClipboardList },
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
    <div className="flex h-full flex-col bg-gray-50 border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">CableTV</span>
        </div>
      </div>

      {/* Role indicator */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-100">
        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
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
                  : "text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-sm",
              )}
            >
              <Icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-white"
                    : "text-gray-400 group-hover:text-blue-600",
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500 text-center">
          © 2024 CableTV Operator
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent onLinkClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <div className="h-full">
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}
