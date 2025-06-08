import { useState, useEffect, useContext } from "react";
import { Search, Save, Calendar, FileText, X, DollarSign } from "lucide-react";
import { AuthContext } from "@/contexts/AuthContext";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  isCustomAmount: boolean;
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
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { user } = useContext(AuthContext);

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

  const getPackagePrice = (customer: Customer): number => {
    // Check if customer has custom plan
    if (customer.customPlan) {
      return customer.customPlan.price;
    }

    // Check if customer has multiple connections
    if (customer.numberOfConnections > 1 && customer.connections.length > 0) {
      return customer.connections.reduce(
        (total, connection) => total + connection.planPrice,
        0,
      );
    }

    // Default package prices
    const packagePrices: { [key: string]: number } = {
      Basic: 29.99,
      "Premium HD": 59.99,
      "Sports Package": 79.99,
      "Family Bundle": 49.99,
    };
    return packagePrices[customer.currentPackage] || 0;
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.name);
    setFilteredCustomers([]);
    // Reset custom amount when selecting a new customer
    setIsCustomAmount(false);
    setCustomAmount(getPackagePrice(customer));
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchTerm("");
    setSelectedMonth("");
    setIsCustomAmount(false);
    setCustomAmount(0);
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

  const getInvoiceAmount = (): number => {
    if (isCustomAmount) {
      return customAmount;
    }
    return selectedCustomer ? getPackagePrice(selectedCustomer) : 0;
  };

  const handleGenerateInvoice = async () => {
    if (!selectedCustomer || !selectedMonth || !selectedYear || !user) {
      toast({
        title: "Missing Information",
        description:
          "Please select a customer, month, and year to generate an invoice.",
        variant: "destructive",
      });
      return;
    }

    const finalAmount = getInvoiceAmount();
    if (finalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Invoice amount must be greater than ₹0.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Simulate invoice generation processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const invoiceData: InvoiceData = {
        customer: selectedCustomer,
        month: selectedMonth,
        year: selectedYear,
        amount: finalAmount,
        dueDate: calculateDueDate(selectedMonth, selectedYear),
        invoiceNumber: generateInvoiceNumber(
          selectedCustomer,
          selectedMonth,
          selectedYear,
        ),
        isCustomAmount,
      };

      // Get all VC numbers for this customer (primary + secondary)
      const primaryVc =
        selectedCustomer.connections.find((conn) => conn.isPrimary)?.vcNumber ||
        selectedCustomer.vcNumber;
      const allVcNumbers = selectedCustomer.connections.map(
        (conn) => conn.vcNumber,
      );

      // Create billing record
      const billingRecord = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        packageName: selectedCustomer.customPlan
          ? `Custom: ${selectedCustomer.customPlan.name}`
          : selectedCustomer.currentPackage,
        amount: invoiceData.amount,
        dueDate: invoiceData.dueDate,
        invoiceNumber: invoiceData.invoiceNumber,
        generatedDate: new Date().toISOString().split("T")[0],
        generatedBy: user.name,
        employeeId: user.id,
        billingMonth: selectedMonth,
        billingYear: selectedYear,
        vcNumber: primaryVc, // Primary VC number handles billing
        allVcNumbers: allVcNumbers, // All VC numbers for this customer
        customAmount: isCustomAmount ? customAmount : undefined,
        savedInBillingRecords: true, // Ensure this is marked as saved
      };

      // Save the billing record
      await CustomerService.addBillingRecord(billingRecord);

      // Update customer's current outstanding by deducting the invoice amount
      const updatedCustomer = {
        ...selectedCustomer,
        currentOutstanding:
          selectedCustomer.currentOutstanding - invoiceData.amount,
      };

      // Save the updated customer data
      await CustomerService.updateCustomer(
        selectedCustomer.id,
        updatedCustomer,
      );

      toast({
        title: "Invoice Generated",
        description: `Invoice ${invoiceData.invoiceNumber} has been created for ₹${invoiceData.amount.toFixed(2)}. Customer's outstanding balance updated.`,
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

  const defaultAmount = selectedCustomer
    ? getPackagePrice(selectedCustomer)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Generate Invoice</span>
          </DialogTitle>
          <DialogDescription>
            Search for a customer and select the billing period to generate an
            invoice. You can also enter a custom amount if needed.
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
                              {customer.customPlan && (
                                <span className="text-blue-600">
                                  {" "}
                                  (Custom Plan)
                                </span>
                              )}
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
                        {selectedCustomer.customPlan && (
                          <span className="text-blue-600"> (Custom Plan)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedCustomer.address}
                      </div>
                      <div className="text-sm font-medium text-green-600 mt-1">
                        Default Rate: ��{defaultAmount.toFixed(2)}/month
                        {selectedCustomer.numberOfConnections > 1 && (
                          <span className="text-blue-600">
                            {" "}
                            ({selectedCustomer.numberOfConnections} connections)
                          </span>
                        )}
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

          {/* Billing Period and Amount Selection */}
          {selectedCustomer && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Billing Month
                  </label>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
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

              {/* Custom Amount Section */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <Label className="text-blue-800 font-medium">
                        Invoice Amount
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor="custom-amount"
                        className="text-sm text-blue-700"
                      >
                        Custom Amount
                      </Label>
                      <Switch
                        id="custom-amount"
                        checked={isCustomAmount}
                        onCheckedChange={(checked) => {
                          setIsCustomAmount(checked);
                          if (!checked) {
                            setCustomAmount(defaultAmount);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {isCustomAmount ? (
                    <div className="space-y-2">
                      <Label
                        htmlFor="amount-input"
                        className="text-sm text-blue-700"
                      >
                        Enter Custom Amount
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          ₹
                        </span>
                        <Input
                          id="amount-input"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={customAmount}
                          onChange={(e) =>
                            setCustomAmount(parseFloat(e.target.value) || 0)
                          }
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="text-xs text-blue-600">
                        Default amount: ₹{defaultAmount.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-800">
                        ₹{defaultAmount.toFixed(2)}
                      </div>
                      <div className="text-sm text-blue-600">
                        Using default package rate
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Invoice Preview */}
          {selectedCustomer && selectedMonth && selectedYear && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">
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
                    <span>
                      {selectedCustomer.customPlan
                        ? `Custom: ${selectedCustomer.customPlan.name}`
                        : selectedCustomer.currentPackage}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium text-lg">
                    <span>Amount:</span>
                    <span className="text-green-700">
                      ₹{getInvoiceAmount().toFixed(2)}
                      {isCustomAmount && (
                        <span className="text-xs text-orange-600 ml-1">
                          (Custom)
                        </span>
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
                isGenerating ||
                getInvoiceAmount() <= 0
              }
            >
              {isGenerating ? (
                <>
                  <Calendar className="mr-2 h-4 w-4 animate-spin" />
                  Creating Invoice...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Invoice - ₹{getInvoiceAmount().toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
