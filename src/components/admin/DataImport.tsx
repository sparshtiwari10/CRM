import { useState } from "react";
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DataImporter } from "@/utils/dataImport";
import { useAuth } from "@/contexts/AuthContext";

export function DataImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { isAdmin } = useAuth();
  const { toast } = useToast();

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Only administrators can import customer data.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleFileUpload = async (file: File) => {
    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const result = await DataImporter.importFromFile(file);

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);

      if (result.success > 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.success} customers.`,
          className: "bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
        });
      }

      if (result.errors.length > 0) {
        toast({
          title: "Import Completed with Errors",
          description: `${result.errors.length} errors occurred during import.`,
          variant: "destructive",
          className: "bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
        });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      setImportResult({
        success: 0,
        errors: [error.message || "Import failed"],
      });

      toast({
        title: "Import Failed",
        description: error.message || "Failed to import customer data.",
        variant: "destructive",
        className: "bottom-2 right-2 left-2 lg:left-auto lg:max-w-sm",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const downloadSampleCsv = () => {
    const csvContent = DataImporter.generateSampleCsv();
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadSampleJson = () => {
    const jsonContent = DataImporter.generateSampleJson();
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer_import_template.json";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import Customer Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isImporting ? (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-blue-500 animate-pulse" />
                <div>
                  <p className="text-lg font-medium">Importing data...</p>
                  <Progress
                    value={importProgress}
                    className="mt-2 max-w-sm mx-auto"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    {importProgress}% complete
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium">
                    Drop your file here or click to upload
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports CSV and JSON files with customer data
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isImporting}
                />
                <label htmlFor="file-upload">
                  <Button asChild disabled={isImporting}>
                    <span className="cursor-pointer">Select File</span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <div className="mt-6 space-y-3">
              {importResult.success > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully imported {importResult.success} customers.
                  </AlertDescription>
                </Alert>
              )}

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Import errors:</p>
                      <ul className="text-sm space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportResult(null)}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Results
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Download Templates</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Download sample templates to understand the required data format
              for importing customers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={downloadSampleCsv}
                className="h-auto p-4"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">CSV Template</div>
                    <div className="text-sm text-gray-500">
                      Excel compatible format
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={downloadSampleJson}
                className="h-auto p-4"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">JSON Template</div>
                    <div className="text-sm text-gray-500">
                      Structured data format
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Format Information */}
      <Card>
        <CardHeader>
          <CardTitle>Required Data Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-green-700 mb-2">
                Required Fields:
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• name - Customer full name</li>
                <li>• phone - Contact number</li>
                <li>• address - Full address</li>
                <li>• vc_no - VC number</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-700 mb-2">
                Optional Fields:
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• package - Service package</li>
                <li>• collector_name - Assigned collector</li>
                <li>• email - Email address</li>
                <li>• billing_status - Payment status</li>
                <li>• bill_amount - Monthly bill amount</li>
                <li>• status - active/inactive</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DataImportDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Customer Data</DialogTitle>
        </DialogHeader>
        <DataImport />
      </DialogContent>
    </Dialog>
  );
}
