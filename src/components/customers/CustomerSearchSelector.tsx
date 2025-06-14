import React, { useState, useEffect, useMemo } from "react";
import { Search, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Customer } from "@/types";

interface CustomerSearchSelectorProps {
  customers: Customer[];
  selectedCustomerId: string;
  onCustomerSelect: (customerId: string, customer: Customer) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerSearchSelector({
  customers,
  selectedCustomerId,
  onCustomerSelect,
  placeholder = "Search customers...",
  disabled = false,
}: CustomerSearchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Filter customers based on search term (Name, Address, VC Number)
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;

    const term = searchTerm.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.address?.toLowerCase().includes(term) ||
        customer.vcNumber?.toLowerCase().includes(term) ||
        customer.phoneNumber.includes(term) ||
        customer.collectorName?.toLowerCase().includes(term),
    );
  }, [customers, searchTerm]);

  const handleSelect = (customer: Customer) => {
    onCustomerSelect(customer.id, customer);
    setOpen(false);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCustomer ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-medium">{selectedCustomer.name}</span>
              <span className="text-sm text-muted-foreground">
                {selectedCustomer.vcNumber && `• ${selectedCustomer.vcNumber}`}
                {selectedCustomer.currentOS ? (
                  <span className="text-red-600 font-medium">
                    • ₹{selectedCustomer.currentOS.toLocaleString()} due
                  </span>
                ) : null}
              </span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command>
          <CommandInput
            placeholder="Search by name, address, or VC number..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => handleSelect(customer)}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{customer.name}</span>
                      {customer.vcNumber && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {customer.vcNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {customer.address && (
                        <span className="block truncate">
                          {customer.address}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span>{customer.phoneNumber}</span>
                        {customer.collectorName && (
                          <span>• {customer.collectorName}</span>
                        )}
                        {customer.currentOS && customer.currentOS > 0 && (
                          <span className="text-red-600 font-medium">
                            • ₹{customer.currentOS.toLocaleString()} due
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      selectedCustomerId === customer.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
