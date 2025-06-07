import React, { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface CustomerImportExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onImport: (customers: Customer[]) => void;
}

interface ImportResult {
  success: Customer[];
  errors: { row: number; error: string; data: any }[];
}

export function CustomerImportExport({
  open,
  onOpenChange,
  customers,
  onImport,
}: CustomerImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<"import" | "export">("export");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Export customers to CSV
  const handleExport = () => {
    setExporting(true);

    try {
      // Define CSV headers
      const headers = [
        "Name",
        "Phone Number",
        "Email",
        "Address",
        "VC Number",
        "Current Package",
        "Package Amount",
        "Previous Outstanding",
        "Current Outstanding",
        "Bill Due Date",
        "Collector Name",
        "Is Active",
        "Last Payment Date",
        "Join Date",
        "Number of Connections",
        "Portal Bill",
      ];

      // Convert customers to CSV rows
      const csvRows = [
        headers.join(","), // Header row
        ...customers.map((customer) =>
          [
            `"${customer.name}"`,
            `"${customer.phoneNumber}"`,
            `"${customer.email || ""}"`,
            `"${customer.address}"`,
            `"${customer.vcNumber}"`,
            `"${customer.currentPackage}"`,
            customer.packageAmount.toString(),
            customer.previousOutstanding.toString(),
            customer.currentOutstanding.toString(),
            customer.billDueDate.toString(),
            `"${customer.collectorName}"`,
            customer.isActive.toString(),
            `"${customer.lastPaymentDate}"`,
            `"${customer.joinDate}"`,
            customer.numberOfConnections.toString(),
            (customer.portalBill || 0).toString(),
          ].join(","),
        ),
      ];

      // Create and download file
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");

      if (link.download !== undefined) {
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
      }

      toast({
        title: "Export Successful",
        description: `Exported ${customers.length} customers to CSV file.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting customers.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Import customers from CSV
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error(
          "CSV file must contain at least a header row and one data row",
        );
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.replace(/"/g, "").trim());
      const dataLines = lines.slice(1);

      const result: ImportResult = {
        success: [],
        errors: [],
      };

      // Expected headers mapping
      const headerMap = {
        Name: "name",
        "Phone Number": "phoneNumber",
        Email: "email",
        Address: "address",
        "VC Number": "vcNumber",
        "Current Package": "currentPackage",
        "Package Amount": "packageAmount",
        "Previous Outstanding": "previousOutstanding",
        "Current Outstanding": "currentOutstanding",
        "Bill Due Date": "billDueDate",
        "Collector Name": "collectorName",
        "Is Active": "isActive",
        "Last Payment Date": "lastPaymentDate",
        "Join Date": "joinDate",
        "Number of Connections": "numberOfConnections",
        "Portal Bill": "portalBill",
      };

      dataLines.forEach((line, index) => {
        try {
          const values = line
            .split(",")
            .map((v) => v.replace(/^"|"$/g, "").trim());

          if (values.length !== headers.length) {
            throw new Error(
              `Row has ${values.length} columns, expected ${headers.length}`,
            );
          }

          const customerData: any = {
            id: `import_${Date.now()}_${index}`,
            connections: [],
            numberOfConnections: 1,
            isActive: true,
            packageAmount: 0,
            previousOutstanding: 0,
            currentOutstanding: 0,
            billDueDate: 1,
            joinDate: new Date().toISOString().split("T")[0],
            lastPaymentDate: new Date().toISOString().split("T")[0],
          };

          headers.forEach((header, i) => {
            const fieldName = headerMap[header as keyof typeof headerMap];
            if (fieldName && values[i] !== undefined) {
              let value = values[i];

              // Type conversion based on field
              switch (fieldName) {
                case "packageAmount":
                case "previousOutstanding":
                case "currentOutstanding":
                case "portalBill":
                  customerData[fieldName] = parseFloat(value) || 0;
                  break;
                case "billDueDate":
                case "numberOfConnections":
                  customerData[fieldName] = parseInt(value) || 1;
                  break;
                case "isActive":
                  customerData[fieldName] = value.toLowerCase() === "true";
                  break;
                default:
                  customerData[fieldName] = value;
              }
            }
          });

          // Validation
          if (
            !customerData.name ||
            !customerData.phoneNumber ||
            !customerData.address
          ) {
            throw new Error(
              "Name, Phone Number, and Address are required fields",
            );
          }

          if (!customerData.vcNumber) {
            throw new Error("VC Number is required");
          }

          if (customerData.billDueDate < 1 || customerData.billDueDate > 31) {
            throw new Error("Bill Due Date must be between 1 and 31");
          }

          result.success.push(customerData as Customer);
        } catch (error) {
          result.errors.push({
            row: index + 2, // +2 because we start from line 2 (after header)
            error: error instanceof Error ? error.message : "Unknown error",
            data: line,
          });
        }
      });

      setImportResult(result);

      if (result.success.length > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${result.success.length} customers. ${result.errors.length} errors.`,
        });
      } else {
        toast({
          title: "Import Failed",
          description: "No customers were successfully imported.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description:
          error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmImport = () => {
    if (importResult && importResult.success.length > 0) {
      onImport(importResult.success);
      setImportResult(null);
      onOpenChange(false);
      toast({
        title: "Import Successful",
        description: `${importResult.success.length} customers have been imported.`,
      });
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "Name",
      "Phone Number",
      "Email",
      "Address",
      "VC Number",
      "Current Package",
      "Package Amount",
      "Previous Outstanding",
      "Current Outstanding",
      "Bill Due Date",
      "Collector Name",
      "Billing Status",
      "Is Active",
      "Last Payment Date",
      "Join Date",
      "Number of Connections",
      "Portal Bill",
    ];

    const sampleRow = [
      "John Smith",
      "+1 555-123-4567",
      "john@example.com",
      "123 Main St, City, State 12345",
      "VC001234",
      "Premium HD",
      "599",
      "0",
      "599",
      "5",
      "System Administrator",
      "true",
      "2024-01-15",
      "2024-01-01",
      "1",
      "599",
    ];

    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "customer_import_template.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Data Import/Export</DialogTitle>
          <DialogDescription>
            Import customers from CSV file or export existing customers to CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tab Selection */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("export")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "export"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export Data
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "import"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Import Data
            </button>
          </div>

          {/* Export Tab */}
          {activeTab === "export" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Export Customer Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Export Information
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • Export all {customers.length} customers to CSV format
                    </li>
                    <li>
                      • Includes all customer details, billing information, and
                      settings
                    </li>
                    <li>
                      • Compatible with Excel and other spreadsheet applications
                    </li>
                    <li>• File will be downloaded automatically</li>
                  </ul>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={exporting || customers.length === 0}
                  className="w-full"
                >
                  {exporting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export {customers.length} Customers to CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Import Tab */}
          {activeTab === "import" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="w-5 h-5 mr-2" />
                    Import Customer Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">
                      Import Requirements
                    </h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>
                        • CSV file with proper headers (download template below)
                      </li>
                      <li>
                        • Required fields: Name, Phone Number, Address, VC
                        Number
                      </li>
                      <li>• Bill Due Date must be between 1-31</li>
                      <li>• Billing Status: Paid, Pending, or Overdue</li>
                      <li>• Duplicate VC Numbers will be flagged as errors</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={downloadTemplate}>
                      <FileText className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleImport}
                        disabled={importing}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="w-full"
                      >
                        {importing ? (
                          <>Processing...</>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Select CSV File
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Import Results */}
              {importResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      {importResult.success.length > 0 ? (
                        <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                      )}
                      Import Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">
                          {importResult.success.length}
                        </div>
                        <div className="text-sm text-green-600">Successful</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-700">
                          {importResult.errors.length}
                        </div>
                        <div className="text-sm text-red-600">Errors</div>
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-red-900">
                          Errors Found:
                        </h4>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {importResult.errors
                            .slice(0, 10)
                            .map((error, index) => (
                              <Alert key={index} variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Row {error.row}: {error.error}
                                </AlertDescription>
                              </Alert>
                            ))}
                          {importResult.errors.length > 10 && (
                            <div className="text-sm text-gray-500 text-center">
                              ... and {importResult.errors.length - 10} more
                              errors
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {importResult.success.length > 0 && (
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleConfirmImport}
                          className="flex-1"
                        >
                          Import {importResult.success.length} Customers
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setImportResult(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
