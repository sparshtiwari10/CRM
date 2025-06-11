import React, { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Customer } from "@/types";
import { AreaService } from "@/services/areaService";
import { packageService } from "@/services/packageService";

interface CustomerImportExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onImport: (customers: Customer[]) => Promise<void>;
  isLoading?: boolean;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function CustomerImportExport({
  open,
  onOpenChange,
  customers,
  onImport,
  isLoading = false,
}: CustomerImportExportProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = () => {
    try {
      const headers = [
        "Customer Name",
        "Phone Number",
        "Email",
        "Address",
        "VC Number",
        "Package",
        "Package Amount",
        "Area Name",
        "Join Date",
        "Bill Due Date",
        "Status",
        "Previous Outstanding",
        "Current Outstanding",
        "Number of Connections",
      ];

      const csvContent = [
        headers.join(","),
        ...customers.map((customer) =>
          [
            `"${customer.name}"`,
            `"${customer.phoneNumber}"`,
            `"${customer.email || ""}"`,
            `"${customer.address}"`,
            `"${customer.vcNumber}"`,
            `"${customer.currentPackage}"`,
            customer.packageAmount || 0,
            `"${customer.collectorName}"`,
            customer.joinDate || "",
            customer.billDueDate || 1,
            customer.status || "active",
            customer.previousOutstanding || 0,
            customer.currentOutstanding || 0,
            customer.numberOfConnections || 1,
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `customers_export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${customers.length} customers to CSV file.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export customers data.",
        variant: "destructive",
      });
    }
  };

  const generateTemplate = () => {
    const headers = [
      "Customer Name",
      "Phone Number",
      "Email",
      "Address",
      "VC Number",
      "Package",
      "Package Amount",
      "Area Name",
      "Join Date",
      "Bill Due Date",
      "Status",
      "Previous Outstanding",
      "Current Outstanding",
      "Number of Connections",
    ];

    const sampleData = [
      "John Doe",
      "9876543210",
      "john@example.com",
      "123 Main Street, City",
      "VC001",
      "Basic Package",
      "299",
      "Area 1",
      "2024-01-01",
      "1",
      "active",
      "0",
      "0",
      "1",
    ];

    const csvContent = [headers.join(","), sampleData.join(",")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", "customer_import_template.csv");
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template Downloaded",
      description: "Customer import template downloaded successfully.",
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        return;
      }

      setImportFile(file);
      setImportResult(null);
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
    const rows = lines.slice(1);

    return rows.map((row) => {
      const values = row.split(",").map((v) => v.replace(/"/g, "").trim());
      const rowData: any = {};

      headers.forEach((header, index) => {
        rowData[header] = values[index] || "";
      });

      return rowData;
    });
  };

  const mapImportData = (data: any[]): Customer[] => {
    const fieldMapping: Record<string, string> = {
      "Customer Name": "name",
      "Phone Number": "phoneNumber",
      Email: "email",
      Address: "address",
      "VC Number": "vcNumber",
      Package: "currentPackage",
      "Package Amount": "packageAmount",
      "Area Name": "collectorName",
      "Join Date": "joinDate",
      "Bill Due Date": "billDueDate",
      Status: "status",
      "Previous Outstanding": "previousOutstanding",
      "Current Outstanding": "currentOutstanding",
      "Number of Connections": "numberOfConnections",
    };

    return data.map((row, index) => {
      const customer: Partial<Customer> = {
        id: `import-${Date.now()}-${index}`,
      };

      Object.entries(fieldMapping).forEach(([csvField, customerField]) => {
        const value = row[csvField];

        if (value !== undefined && value !== "") {
          switch (customerField) {
            case "packageAmount":
            case "previousOutstanding":
            case "currentOutstanding":
              customer[customerField as keyof Customer] =
                parseFloat(value) || 0;
              break;
            case "billDueDate":
            case "numberOfConnections":
              customer[customerField as keyof Customer] = parseInt(value) || 1;
              break;
            case "status":
              customer[customerField as keyof Customer] = [
                "active",
                "inactive",
                "demo",
              ].includes(value)
                ? value
                : "active";
              break;
            default:
              customer[customerField as keyof Customer] = value;
          }
        }
      });

      // Set defaults for required fields
      customer.isActive = customer.status === "active";
      customer.billingStatus = "Pending";
      customer.lastPaymentDate = new Date().toISOString().split("T")[0];
      customer.portalBill = customer.packageAmount || 0;

      return customer as Customer;
    });
  };

  const validateImportData = async (
    customers: Customer[],
  ): Promise<ImportResult> => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Load managed areas and packages for validation
    let validAreas: string[] = [];
    let validPackages: string[] = [];

    try {
      validAreas = await AreaService.getAreaNames();
      const packages = await packageService.getAllPackages();
      validPackages = packages
        .filter((pkg) => pkg.isActive)
        .map((pkg) => pkg.name);
    } catch (error) {
      console.error("Failed to load validation data:", error);
      errors.push("Failed to load areas and packages for validation");
    }

    customers.forEach((customer, index) => {
      const rowNumber = index + 2; // +2 because CSV has header row and arrays are 0-indexed
      let hasErrors = false;

      // Validate required fields
      if (!customer.name?.trim()) {
        errors.push(`Row ${rowNumber}: Customer name is required`);
        hasErrors = true;
      }

      if (!customer.phoneNumber?.trim()) {
        errors.push(`Row ${rowNumber}: Phone number is required`);
        hasErrors = true;
      }

      if (!customer.address?.trim()) {
        errors.push(`Row ${rowNumber}: Address is required`);
        hasErrors = true;
      }

      if (!customer.vcNumber?.trim()) {
        errors.push(`Row ${rowNumber}: VC Number is required`);
        hasErrors = true;
      }

      if (!customer.collectorName?.trim()) {
        errors.push(`Row ${rowNumber}: Area Name is required`);
        hasErrors = true;
      } else if (
        validAreas.length > 0 &&
        !validAreas.includes(customer.collectorName)
      ) {
        errors.push(
          `Row ${rowNumber}: Area "${customer.collectorName}" does not exist in managed areas. Available areas: ${validAreas.join(", ")}`,
        );
        hasErrors = true;
      }

      if (!customer.currentPackage?.trim()) {
        errors.push(`Row ${rowNumber}: Package is required`);
        hasErrors = true;
      } else if (
        validPackages.length > 0 &&
        !validPackages.includes(customer.currentPackage)
      ) {
        errors.push(
          `Row ${rowNumber}: Package "${customer.currentPackage}" does not exist in active packages. Available packages: ${validPackages.join(", ")}`,
        );
        hasErrors = true;
      }

      // Validate email format if provided
      if (customer.email && customer.email.trim() !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customer.email)) {
          errors.push(`Row ${rowNumber}: Invalid email format`);
          hasErrors = true;
        }
      }

      // Validate phone number format
      if (
        customer.phoneNumber &&
        !/^\d{10}$/.test(customer.phoneNumber.replace(/\D/g, ""))
      ) {
        errors.push(`Row ${rowNumber}: Phone number should be 10 digits`);
        hasErrors = true;
      }

      if (hasErrors) {
        failed++;
      } else {
        success++;
      }
    });

    return { success, failed, errors };
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);

    try {
      const fileText = await importFile.text();
      const parsedData = parseCSV(fileText);

      if (parsedData.length === 0) {
        toast({
          title: "Import Failed",
          description: "No valid data found in the CSV file.",
          variant: "destructive",
        });
        return;
      }

      const mappedCustomers = mapImportData(parsedData);
      const validationResult = await validateImportData(mappedCustomers);

      setImportResult(validationResult);

      if (validationResult.success > 0) {
        // Filter out customers with errors for import
        const validCustomers = mappedCustomers.filter((_, index) => {
          const rowNumber = index + 2;
          return !validationResult.errors.some((error) =>
            error.startsWith(`Row ${rowNumber}:`),
          );
        });

        await onImport(validCustomers);

        toast({
          title: "Import Completed",
          description: `Successfully imported ${validationResult.success} customers.`,
        });

        if (validationResult.failed > 0) {
          toast({
            title: "Partial Import",
            description: `${validationResult.failed} customers failed validation. Check the results below.`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Import Failed",
          description:
            "All customers failed validation. Please check the data and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description:
          "Failed to process the CSV file. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import/Export Customers</DialogTitle>
          <DialogDescription>
            Import customers from CSV file or export current customers data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Export Customers</h3>
            <p className="text-sm text-muted-foreground">
              Export all current customers to a CSV file.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV ({customers.length} customers)
              </Button>
              <Button onClick={generateTemplate} variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Import Customers</h3>
            <p className="text-sm text-muted-foreground">
              Import customers from a CSV file. Download the template above for
              the correct format.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="mt-1"
                />
              </div>

              {importFile && (
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    Selected file: {importFile.name} (
                    {(importFile.size / 1024).toFixed(1)} KB)
                  </AlertDescription>
                </Alert>
              )}

              {importResult && (
                <Alert
                  variant={importResult.failed > 0 ? "destructive" : "default"}
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        Import Result: {importResult.success} successful,{" "}
                        {importResult.failed} failed
                      </div>
                      {importResult.errors.length > 0 && (
                        <div className="mt-2">
                          <details>
                            <summary className="cursor-pointer font-medium">
                              View Errors ({importResult.errors.length})
                            </summary>
                            <ul className="mt-2 space-y-1 text-sm">
                              {importResult.errors
                                .slice(0, 10)
                                .map((error, index) => (
                                  <li key={index}>• {error}</li>
                                ))}
                              {importResult.errors.length > 10 && (
                                <li>
                                  ... and {importResult.errors.length - 10} more
                                  errors
                                </li>
                              )}
                            </ul>
                          </details>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {importFile && !importResult && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import Customers"}
            </Button>
          )}
          {importResult && (
            <Button onClick={resetImport} variant="outline">
              Reset
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
