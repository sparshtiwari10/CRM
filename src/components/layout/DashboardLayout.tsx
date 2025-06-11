import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
        {/* TopBar with integrated mobile menu */}
        <header className="bg-background border-b border-border h-16 flex items-center justify-between px-4 lg:px-6">
          {/* Left side - Mobile Menu + Title */}
          <div className="flex items-center flex-1">
            {/* Mobile Sidebar Toggle */}
            <div className="lg:hidden mr-3">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open sidebar"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <Sidebar onLinkClick={() => setIsMobileMenuOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>

            {/* Page Title */}
            {title && (
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                  {title}
                </h1>
              </div>
            )}
          </div>

          {/* Right side - TopBar content */}
          <TopBar />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
