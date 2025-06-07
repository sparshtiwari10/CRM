import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CustomerService } from "@/services/customerService";
import { Customer } from "@/types";

interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export function CustomerDataImport({
  onImportComplete,
}: {
  onImportComplete?: () => void;
}) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importResults, setImportResults] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadSampleCSV = () => {
    const sampleData = [
      [
        "name",
        "phoneNumber",
        "address",
        "vcNumber",
        "currentPackage",
        "collectorName",
        "billingStatus",
        "portalBill",
        "isActive",
      ],
      [
        "John Smith",
        "+91 98765 43210",
        "123 Main Street, City",
        "",
        "Gold",
        "Collector A",
        "Paid",
        "599",
        "true",
      ],
      [
        "Sarah Johnson",
        "+91 98765 43211",
        "456 Oak Avenue, City",
        "",
        "Silver",
        "Collector B",
        "Pending",
        "299",
        "true",
      ],
    ];

    const csvContent = sampleData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "customer-import-sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Sample Downloaded",
      description: "Sample CSV file downloaded successfully",
    });
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

    return lines.slice(1).map((line, index) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: any = { rowNumber: index + 2 }; // +2 because we skip header and arrays are 0-indexed

      headers.forEach((header, i) => {
        row[header] = values[i] || "";
      });

      return row;
    });
  };

  const validateCustomerData = (
    data: any,
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Required fields
    if (!data.name?.trim()) errors.push("Name is required");
    if (!data.phoneNumber?.trim()) errors.push("Phone number is required");
    if (!data.address?.trim()) errors.push("Address is required");
    if (!data.vcNumber?.trim()) errors.push("VC Number is required");
    if (!data.collectorName?.trim()) errors.push("Collector name is required");

    // Validate phone number format (basic)
    if (
      data.phoneNumber &&
      !/^[\+]?[\d\s\-\(\)]{10,}$/.test(data.phoneNumber)
    ) {
      errors.push("Invalid phone number format");
    }

    // Validate billing status
    const validStatuses = ["Paid", "Pending", "Overdue"];
    if (data.billingStatus && !validStatuses.includes(data.billingStatus)) {
      errors.push(
        `Invalid billing status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    // Validate portal bill
    if (data.portalBill && isNaN(Number(data.portalBill))) {
      errors.push("Portal bill must be a valid number");
    }

    return { isValid: errors.length === 0, errors };
  };

  const convertToCustomer = (data: any): Omit<Customer, "id"> => {
    return {
      name: data.name?.trim() || "",
      phoneNumber: data.phoneNumber?.trim() || "",
      address: data.address?.trim() || "",
      vcNumber: data.vcNumber?.trim() || "",
      currentPackage: data.currentPackage?.trim() || "Basic",
      collectorName: data.collectorName?.trim() || "",
      billingStatus: (data.billingStatus?.trim() as any) || "Pending",
      portalBill: Number(data.portalBill) || 0,
      isActive: data.isActive?.toLowerCase() === "true",
      email: data.email?.trim() || "",
      joinDate: new Date().toISOString().split("T")[0],
      lastPaymentDate:
        data.lastPaymentDate || new Date().toISOString().split("T")[0],
      activationDate: new Date().toISOString().split("T")[0],
    };
  };

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous results
    setImportResults(null);
    setProgress(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        throw new Error("No data found in CSV file");
      }

      const progressData: ImportProgress = {
        total: data.length,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
      };

      setProgress(progressData);

      const results = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // Validate data
        const validation = validateCustomerData(row);

        if (!validation.isValid) {
          progressData.failed++;
          progressData.errors.push(
            `Row ${row.rowNumber}: ${validation.errors.join(", ")}`,
          );
          results.push({
            row: row.rowNumber,
            data: row,
            status: "failed",
            errors: validation.errors,
          });
        } else {
          try {
            // Convert and save customer
            const customerData = convertToCustomer(row);
            const savedCustomer =
              await CustomerService.addCustomer(customerData);

            progressData.successful++;
            results.push({
              row: row.rowNumber,
              data: row,
              status: "success",
              customer: savedCustomer,
            });
          } catch (error: any) {
            progressData.failed++;
            progressData.errors.push(`Row ${row.rowNumber}: ${error.message}`);
            results.push({
              row: row.rowNumber,
              data: row,
              status: "failed",
              errors: [error.message],
            });
          }
        }

        progressData.processed++;
        setProgress({ ...progressData });

        // Small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setImportResults(results);

      if (progressData.successful > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${progressData.successful} out of ${progressData.total} customers`,
        });

        // Call callback to refresh parent component
        onImportComplete?.();
      }
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Import Customer Data</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={downloadSampleCSV}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Sample CSV</span>
            </Button>

            <div className="flex-1">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                disabled={isImporting}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV Format Required:</strong> name, phoneNumber, address,
              vcNumber, currentPackage, collectorName, billingStatus,
              portalBill, isActive
            </AlertDescription>
          </Alert>
        </div>

        {/* Progress Section */}
        {progress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Import Progress</span>
              <span className="text-sm text-gray-500">
                {progress.processed} / {progress.total}
              </span>
            </div>

            <Progress
              value={(progress.processed / progress.total) * 100}
              className="h-2"
            />

            <div className="flex gap-4 text-sm">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Success: {progress.successful}</span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span>Failed: {progress.failed}</span>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {importResults && (
          <div className="space-y-3">
            <h4 className="font-medium">Import Results</h4>

            {progress && progress.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <details>
                    <summary className="cursor-pointer font-medium">
                      {progress.errors.length} errors occurred during import
                    </summary>
                    <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                      {progress.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {progress.errors.length > 10 && (
                        <li>
                          ... and {progress.errors.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="text-green-700 border-green-300"
                >
                  {importResults.filter((r) => r.status === "success").length}{" "}
                  Successful
                </Badge>
                <Badge
                  variant="outline"
                  className="text-red-700 border-red-300"
                >
                  {importResults.filter((r) => r.status === "failed").length}{" "}
                  Failed
                </Badge>
              </div>

              {progress && progress.successful > 0 && onImportComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Page</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
