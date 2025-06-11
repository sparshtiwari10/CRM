import { Bell, Search, Settings, User, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FirebaseStatus } from "@/components/common/FirebaseStatus";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-background border-b border-border h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Title only */}
      <div className="flex items-center flex-1">
        {/* Page Title */}
        {title && (
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              {title}
            </h1>
          </div>
        )}
      </div>

      {/* Right side - Notifications and User Menu */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Firebase Status */}
        <FirebaseStatus />

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative h-8 w-8 sm:h-9 sm:w-9"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center bg-red-500">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start p-3">
              <div className="font-medium text-sm">Overdue Payment Alert</div>
              <div className="text-xs text-muted-foreground mt-1">
                Michael Brown has an overdue payment of ₹799
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start p-3">
              <div className="font-medium text-sm">New Customer Added</div>
              <div className="text-xs text-muted-foreground mt-1">
                Sarah Wilson registered for Premium package
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start p-3">
              <div className="font-medium text-sm">Payment Received</div>
              <div className="text-xs text-muted-foreground mt-1">
                John Doe paid ₹599 for January billing
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar || ""} alt={user?.name || ""} />
                <AvatarFallback className="bg-blue-600 text-white">
                  {user?.name ? getUserInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">
                  {user?.name || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "user@example.com"}
                </p>
                <div className="flex items-center mt-1">
                  <Badge
                    variant={isAdmin ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {isAdmin ? "Administrator" : "Employee"}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
