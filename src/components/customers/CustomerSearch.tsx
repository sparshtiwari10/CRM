import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface CustomerSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    package: string;
    billingStatus: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

export function CustomerSearch({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
}: CustomerSearchProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== "",
  ).length;
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, phone, address, or VC number..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge className="ml-2 h-5 w-5 p-0 text-xs bg-blue-600">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="h-auto p-1 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Package
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex space-x-2">
                      <Select
                        value={filters.billingStatus}
                        onValueChange={(value) =>
                          onFilterChange("billingStatus", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      {filters.billingStatus && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFilterChange("billingStatus", "")}
                          className="px-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {filters.package && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFilterChange("package", "")}
                        className="px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Billing Status
                  </label>
                  <Select
                    value={filters.billingStatus}
                    onValueChange={(value) =>
                      onFilterChange("billingStatus", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>
          {filters.package && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>Package: {filters.package}</span>
              <button
                onClick={() => onFilterChange("package", "")}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.billingStatus && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>Status: {filters.billingStatus}</span>
              <button
                onClick={() => onFilterChange("billingStatus", "")}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
