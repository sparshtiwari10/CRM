import { VCInventoryService } from "@/services/vcInventoryService";
import { AreaService } from "@/services/areaService";
import { packageService } from "@/services/packageService";

interface CSVRow {
  name: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  area: string;
  vcNumber: string;
  packageName: string;
  status?: string;
  [key: string]: any;
}

interface ValidationResult {
  isValid: boolean;
  rowNumber: number;
  errors: string[];
  warnings: string[];
  data: CSVRow;
}

interface ImportValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  results: ValidationResult[];
  globalErrors: string[];
  readyToImport: boolean;
}

export class CSVImportValidator {
  private static validAreas: string[] = [];
  private static validPackages: Map<string, any> = new Map();
  private static vcInventory: Map<string, any> = new Map();

  /**
   * Initialize validator with current system data
   */
  static async initialize(): Promise<void> {
    try {
      console.log("🔄 Initializing CSV import validator...");

      const [areas, packages, vcItems] = await Promise.all([
        AreaService.getAreaNames().catch(() => []),
        packageService.getAllPackages().catch(() => []),
        VCInventoryService.getAllVCItems().catch(() => []),
      ]);

      this.validAreas = areas;
      this.validPackages = new Map(packages.map((pkg) => [pkg.name, pkg]));
      this.vcInventory = new Map(vcItems.map((vc) => [vc.vcNumber, vc]));

      console.log(`✅ Validator initialized:`);
      console.log(`  - ${this.validAreas.length} areas loaded`);
      console.log(`  - ${this.validPackages.size} packages loaded`);
      console.log(`  - ${this.vcInventory.size} VC numbers loaded`);
    } catch (error) {
      console.error("❌ Failed to initialize CSV validator:", error);
      throw new Error("Failed to initialize validator");
    }
  }

  /**
   * Validate a complete CSV import
   */
  static async validateCSVImport(
    csvData: CSVRow[],
  ): Promise<ImportValidationSummary> {
    await this.initialize();

    const results: ValidationResult[] = [];
    const globalErrors: string[] = [];

    // Check for duplicate phone numbers in the CSV
    const phoneNumbers = new Set<string>();
    const vcNumbers = new Set<string>();

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 1;

      // Check for duplicates within CSV
      if (phoneNumbers.has(row.phoneNumber)) {
        globalErrors.push(
          `Duplicate phone number ${row.phoneNumber} found in CSV (row ${rowNumber})`,
        );
      } else {
        phoneNumbers.add(row.phoneNumber);
      }

      if (vcNumbers.has(row.vcNumber)) {
        globalErrors.push(
          `Duplicate VC number ${row.vcNumber} found in CSV (row ${rowNumber})`,
        );
      } else {
        vcNumbers.add(row.vcNumber);
      }

      // Validate individual row
      const validation = await this.validateRow(row, rowNumber);
      results.push(validation);
    }

    const validRows = results.filter((r) => r.isValid).length;
    const invalidRows = results.length - validRows;
    const readyToImport = globalErrors.length === 0 && invalidRows === 0;

    return {
      totalRows: csvData.length,
      validRows,
      invalidRows,
      results,
      globalErrors,
      readyToImport,
    };
  }

  /**
   * Validate a single CSV row
   */
  static async validateRow(
    row: CSVRow,
    rowNumber: number,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!row.name || row.name.trim() === "") {
      errors.push("Customer name is required");
    }

    if (!row.phoneNumber || row.phoneNumber.trim() === "") {
      errors.push("Phone number is required");
    } else {
      // Basic phone number format validation
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(row.phoneNumber.replace(/\s|-/g, ""))) {
        errors.push("Invalid phone number format (should be 10 digits)");
      }
    }

    // Area validation
    if (!row.area || row.area.trim() === "") {
      errors.push("Area is required");
    } else if (!this.validAreas.includes(row.area)) {
      errors.push(
        `Invalid area "${row.area}". Valid areas: ${this.validAreas.join(", ")}`,
      );
    }

    // VC Number validation
    if (!row.vcNumber || row.vcNumber.trim() === "") {
      errors.push("VC number is required");
    } else {
      const vcExists = this.vcInventory.has(row.vcNumber);
      if (!vcExists) {
        errors.push(`VC number "${row.vcNumber}" does not exist in inventory`);
      } else {
        const vcData = this.vcInventory.get(row.vcNumber);
        if (vcData.status !== "available") {
          if (vcData.status === "active" && vcData.customerId) {
            errors.push(
              `VC number "${row.vcNumber}" is already assigned to customer: ${vcData.customerName}`,
            );
          } else {
            warnings.push(
              `VC number "${row.vcNumber}" has status: ${vcData.status}`,
            );
          }
        }
      }
    }

    // Package validation
    if (!row.packageName || row.packageName.trim() === "") {
      errors.push("Package name is required");
    } else if (!this.validPackages.has(row.packageName)) {
      const availablePackages = Array.from(this.validPackages.keys()).join(
        ", ",
      );
      errors.push(
        `Invalid package "${row.packageName}". Valid packages: ${availablePackages}`,
      );
    }

    // Email validation (optional)
    if (row.email && row.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        warnings.push("Invalid email format");
      }
    }

    // Status validation (optional)
    if (row.status) {
      const validStatuses = ["active", "inactive", "demo"];
      if (!validStatuses.includes(row.status.toLowerCase())) {
        warnings.push(
          `Invalid status "${row.status}". Will default to "active"`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      rowNumber,
      errors,
      warnings,
      data: row,
    };
  }

  /**
   * Get detailed validation report
   */
  static generateValidationReport(summary: ImportValidationSummary): string[] {
    const report: string[] = [];

    report.push("=".repeat(60));
    report.push("CSV IMPORT VALIDATION REPORT");
    report.push("=".repeat(60));
    report.push("");

    // Summary
    report.push("SUMMARY:");
    report.push(`Total Rows: ${summary.totalRows}`);
    report.push(`Valid Rows: ${summary.validRows}`);
    report.push(`Invalid Rows: ${summary.invalidRows}`);
    report.push(
      `Ready to Import: ${summary.readyToImport ? "YES ✅" : "NO ❌"}`,
    );
    report.push("");

    // Global errors
    if (summary.globalErrors.length > 0) {
      report.push("GLOBAL ERRORS:");
      summary.globalErrors.forEach((error) => {
        report.push(`  ❌ ${error}`);
      });
      report.push("");
    }

    // Row-by-row details
    if (summary.invalidRows > 0) {
      report.push("ROW VALIDATION DETAILS:");
      summary.results.forEach((result) => {
        if (!result.isValid || result.warnings.length > 0) {
          report.push(`Row ${result.rowNumber}: ${result.data.name}`);

          result.errors.forEach((error) => {
            report.push(`  ❌ ${error}`);
          });

          result.warnings.forEach((warning) => {
            report.push(`  ⚠️  ${warning}`);
          });

          report.push("");
        }
      });
    }

    // System status
    report.push("SYSTEM STATUS:");
    report.push(`  Areas Available: ${this.validAreas.length}`);
    report.push(`  Packages Available: ${this.validPackages.size}`);
    report.push(`  VC Numbers in Inventory: ${this.vcInventory.size}`);

    return report;
  }

  /**
   * Get quick validation summary for UI
   */
  static getQuickSummary(summary: ImportValidationSummary): {
    status: "success" | "warning" | "error";
    message: string;
    details: string[];
  } {
    if (summary.readyToImport) {
      return {
        status: "success",
        message: `All ${summary.totalRows} rows are valid and ready to import`,
        details: [
          `${summary.validRows} valid customers`,
          "All VC numbers available",
          "All areas and packages exist",
        ],
      };
    }

    if (summary.globalErrors.length > 0) {
      return {
        status: "error",
        message: "Critical validation errors found",
        details: summary.globalErrors,
      };
    }

    const errorRows = summary.results.filter((r) => !r.isValid).length;
    const warningRows = summary.results.filter(
      (r) => r.warnings.length > 0,
    ).length;

    return {
      status: "warning",
      message: `${errorRows} rows have errors, ${warningRows} have warnings`,
      details: [
        `${summary.validRows} rows are valid`,
        `${errorRows} rows need fixing`,
        "Check detailed report below",
      ],
    };
  }

  /**
   * Pre-validate before showing import dialog
   */
  static async quickValidate(
    csvData: CSVRow[],
  ): Promise<{ canProceed: boolean; message: string }> {
    try {
      await this.initialize();

      // Quick checks
      if (csvData.length === 0) {
        return { canProceed: false, message: "CSV file is empty" };
      }

      if (csvData.length > 1000) {
        return {
          canProceed: false,
          message: "CSV file too large (max 1000 rows)",
        };
      }

      // Check required columns
      const requiredColumns = [
        "name",
        "phoneNumber",
        "area",
        "vcNumber",
        "packageName",
      ];
      const firstRow = csvData[0];
      const missingColumns = requiredColumns.filter(
        (col) => !(col in firstRow),
      );

      if (missingColumns.length > 0) {
        return {
          canProceed: false,
          message: `Missing required columns: ${missingColumns.join(", ")}`,
        };
      }

      return { canProceed: true, message: "CSV structure is valid" };
    } catch (error) {
      return {
        canProceed: false,
        message: "Failed to validate CSV: " + (error as Error).message,
      };
    }
  }
}
