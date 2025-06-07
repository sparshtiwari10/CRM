import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  runCompleteFirebaseTests,
  downloadTestReport,
  type FirebaseTestResults,
} from "@/utils/firebaseTestUtils";
import {
  TestTube,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export function FirebaseTestPanel() {
  const [testResults, setTestResults] = useState<FirebaseTestResults | null>(
    null,
  );
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await runCompleteFirebaseTests();
      setTestResults(results);
    } catch (error) {
      console.error("Test execution failed:", error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleDownloadReport = () => {
    if (testResults) {
      downloadTestReport(testResults);
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "issues":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "critical":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <TestTube className="w-5 h-5 text-gray-600" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "bg-green-100 text-green-800 border-green-300";
      case "issues":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const TestSection = ({
    title,
    tests,
    icon,
  }: {
    title: string;
    tests: Record<string, boolean>;
    icon: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        {icon}
        <h4 className="font-medium text-gray-900">{title}</h4>
      </div>
      <div className="space-y-1">
        {Object.entries(tests).map(([testName, passed]) => (
          <div key={testName} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {testName
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())}
            </span>
            <Badge
              variant={passed ? "default" : "destructive"}
              className="text-xs"
            >
              {passed ? "✅ PASS" : "❌ FAIL"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TestTube className="w-5 h-5" />
          <span>Firebase Integration Tests</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            This panel tests Firebase integration including authentication,
            customer operations, billing records, and request management. Use
            with caution in production.
          </AlertDescription>
        </Alert>

        <div className="flex space-x-3">
          <Button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="flex-1"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Run Firebase Tests
              </>
            )}
          </Button>

          {testResults && (
            <Button
              variant="outline"
              onClick={handleDownloadReport}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>

        {testResults && (
          <div className="space-y-4">
            {/* Overall Health Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getHealthIcon(testResults.overallHealth)}
                <div>
                  <h3 className="font-medium">Overall System Health</h3>
                  <p className="text-sm text-gray-500">
                    Last tested: {testResults.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge className={getHealthColor(testResults.overallHealth)}>
                {testResults.overallHealth.toUpperCase()}
              </Badge>
            </div>

            {/* Test Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Authentication Tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TestSection
                    title=""
                    tests={testResults.authentication}
                    icon={<CheckCircle className="w-4 h-4 text-blue-600" />}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Customer Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <TestSection
                    title=""
                    tests={testResults.customerOperations}
                    icon={<CheckCircle className="w-4 h-4 text-green-600" />}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Billing Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <TestSection
                    title=""
                    tests={testResults.billingOperations}
                    icon={<CheckCircle className="w-4 h-4 text-purple-600" />}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Request Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <TestSection
                    title=""
                    tests={testResults.requestOperations}
                    icon={<CheckCircle className="w-4 h-4 text-orange-600" />}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Data Integrity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Data Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <TestSection
                  title=""
                  tests={testResults.dataIntegrity}
                  icon={<CheckCircle className="w-4 h-4 text-indigo-600" />}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-medium text-gray-900 mb-2">
                    Test Summary
                  </h3>
                  <p className="text-sm text-gray-600">
                    {Object.values(testResults.authentication).filter(Boolean)
                      .length +
                      Object.values(testResults.customerOperations).filter(
                        Boolean,
                      ).length +
                      Object.values(testResults.billingOperations).filter(
                        Boolean,
                      ).length +
                      Object.values(testResults.requestOperations).filter(
                        Boolean,
                      ).length +
                      Object.values(testResults.dataIntegrity).filter(Boolean)
                        .length}
                    /
                    {Object.values(testResults.authentication).length +
                      Object.values(testResults.customerOperations).length +
                      Object.values(testResults.billingOperations).length +
                      Object.values(testResults.requestOperations).length +
                      Object.values(testResults.dataIntegrity).length}{" "}
                    tests passed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
