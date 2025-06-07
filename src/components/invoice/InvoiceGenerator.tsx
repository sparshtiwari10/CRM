import { useState, useEffect } from "react";
import { Search, Download, Calendar, FileText, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Customer } from "@/types";
import { CustomerService } from "@/services/customerService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface InvoiceGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InvoiceData {
  customer: Customer;
  month: string;
  year: string;
  amount: number;
  dueDate: string;
  invoiceNumber: string;
}

export function InvoiceGenerator({
  open,
  onOpenChange,
}: InvoiceGeneratorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Load customers on component mount
  useEffect(() => {
    const loadCustomers = async () => {
      setIsLoading(true);
      try {
        const customerData = await CustomerService.getAllCustomers();
        setCustomers(customerData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load customers. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadCustomers();
      // Set default year to current year
      setSelectedYear(new Date().getFullYear().toString());
    }
  }, [open, toast]);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCustomers([]);
      return;
    }

    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.vcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber.includes(searchTerm),
    );

    setFilteredCustomers(filtered.slice(0, 10)); // Limit to 10 results
  }, [searchTerm, customers]);

  const getPackagePrice = (packageName: string): number => {
    const packagePrices: { [key: string]: number } = {
      Basic: 29.99,
      "Premium HD": 59.99,
      "Sports Package": 79.99,
      "Family Bundle": 49.99,
    };
    return packagePrices[packageName] || 0;
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.name);
    setFilteredCustomers([]);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchTerm("");
    setSelectedMonth("");
  };

  const generateInvoiceNumber = (
    customer: Customer,
    month: string,
    year: string,
  ): string => {
    const monthNum = String(
      new Date(`${month} 1, ${year}`).getMonth() + 1,
    ).padStart(2, "0");
    return `INV-${year}${monthNum}-${customer.vcNumber.replace("VC", "")}`;
  };

  const calculateDueDate = (month: string, year: string): string => {
    const date = new Date(`${month} 1, ${year}`);
    date.setMonth(date.getMonth() + 1);
    date.setDate(15); // Due on 15th of next month
    return date.toISOString().split("T")[0];
  };

  const handleGenerateInvoice = async () => {
    if (!selectedCustomer || !selectedMonth || !selectedYear) {
      toast({
        title: "Missing Information",
        description:
          "Please select a customer, month, and year to generate an invoice.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Simulate invoice generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const invoiceData: InvoiceData = {
        customer: selectedCustomer,
        month: selectedMonth,
        year: selectedYear,
        amount: getPackagePrice(selectedCustomer.currentPackage),
        dueDate: calculateDueDate(selectedMonth, selectedYear),
        invoiceNumber: generateInvoiceNumber(
          selectedCustomer,
          selectedMonth,
          selectedYear,
        ),
      };

      // In a real app, this would generate and download a PDF
      const invoiceText = `
CABLE TV OPERATOR - INVOICE

Invoice #: ${invoiceData.invoiceNumber}
Date: ${new Date().toLocaleDateString()}

Customer Information:
Name: ${invoiceData.customer.name}
VC Number: ${invoiceData.customer.vcNumber}
Address: ${invoiceData.customer.address}
Phone: ${invoiceData.customer.phoneNumber}

Service Period: ${selectedMonth} ${selectedYear}
Package: ${invoiceData.customer.currentPackage}
Amount: $${invoiceData.amount.toFixed(2)}
Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}

Collector: ${invoiceData.customer.collectorName}

Thank you for your business!
      `;

      // Create and download the invoice as a text file
      const blob = new Blob([invoiceText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceData.invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Invoice Generated",
        description: `Invoice ${invoiceData.invoiceNumber} has been generated and downloaded.`,
      });

      onOpenChange(false);
      handleClearSelection();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) =>
    (currentYear - i).toString(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Generate Invoice</span>
          </DialogTitle>
          <DialogDescription>
            Search for a customer and select the billing period to generate an
            invoice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Customer</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, address, VC number, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {selectedCustomer && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={handleClearSelection}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Search Results */}
            {filteredCustomers.length > 0 && !selectedCustomer && (
              <Card className="max-h-60 overflow-y-auto">
                <CardContent className="p-2">
                  <div className="space-y-1">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">
                              {customer.vcNumber} • {customer.currentPackage}
                            </div>
                            <div className="text-xs text-gray-400">
                              {customer.address}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              customer.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800",
                            )}
                          >
                            {customer.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Customer Display */}
            {selectedCustomer && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-lg">
                        {selectedCustomer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedCustomer.vcNumber} •{" "}
                        {selectedCustomer.currentPackage}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedCustomer.address}
                      </div>
                      <div className="text-sm font-medium text-green-600 mt-1">
                        Package Rate: $
                        {getPackagePrice(
                          selectedCustomer.currentPackage,
                        ).toFixed(2)}
                        /month
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        selectedCustomer.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800",
                      )}
                    >
                      {selectedCustomer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Billing Period Selection */}
          {selectedCustomer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Billing Month
                </label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Billing Year
                </label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Invoice Preview */}
          {selectedCustomer && selectedMonth && selectedYear && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Invoice Preview
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <span className="font-mono">
                      {generateInvoiceNumber(
                        selectedCustomer,
                        selectedMonth,
                        selectedYear,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Period:</span>
                    <span>
                      {selectedMonth} {selectedYear}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Package:</span>
                    <span>{selectedCustomer.currentPackage}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Amount:</span>
                    <span>
                      $
                      {getPackagePrice(selectedCustomer.currentPackage).toFixed(
                        2,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due Date:</span>
                    <span>
                      {new Date(
                        calculateDueDate(selectedMonth, selectedYear),
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateInvoice}
              disabled={
                !selectedCustomer ||
                !selectedMonth ||
                !selectedYear ||
                isGenerating
              }
            >
              {isGenerating ? (
                <>
                  <Calendar className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
