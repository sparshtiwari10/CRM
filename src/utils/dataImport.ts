import { firestoreService } from "@/services/firestoreService";
import { authService } from "@/services/authService";

export interface ImportCustomerData {
  name: string;
  phone: string;
  address: string;
  package: string;
  vc_no: string;
  collector_name: string;
  prev_os?: number;
  date?: string;
  bill_amount?: number;
  collected_cash?: number;
  collected_online?: number;
  discount?: number;
  current_os?: number;
  remark?: string;
  status?: "active" | "inactive";
  email?: string;
  billing_status?: "Paid" | "Pending" | "Overdue";
  last_payment_date?: string;
  join_date?: string;
}

export class DataImporter {
  /**
   * Import customers from JSON data
   */
  static async importFromJson(
    jsonData: ImportCustomerData[],
  ): Promise<{ success: number; errors: string[] }> {
    if (!authService.isAdmin()) {
      throw new Error("Only administrators can import data");
    }

    const errors: string[] = [];
    let successCount = 0;

    try {
      // Validate data format
      const validatedData = this.validateAndCleanData(jsonData);

      if (validatedData.length === 0) {
        throw new Error("No valid customer data found");
      }

      // Import to Firestore
      await firestoreService.importCustomersFromJson(validatedData);
      successCount = validatedData.length;

      console.log(`✅ Successfully imported ${successCount} customers`);
    } catch (error) {
      console.error("❌ Import failed:", error);
      errors.push(error.message || "Import failed");
    }

    return { success: successCount, errors };
  }

  /**
   * Parse CSV string to JSON
   */
  static parseCsvToJson(csvString: string): ImportCustomerData[] {
    const lines = csvString.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const customers: ImportCustomerData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1}: Column count mismatch, skipping`);
        continue;
      }

      const customer: any = {};
      headers.forEach((header, index) => {
        customer[this.normalizeHeaderName(header)] =
          values[index]?.trim() || "";
      });

      customers.push(customer);
    }

    return customers;
  }

  /**
   * Import customers from CSV string
   */
  static async importFromCsv(
    csvString: string,
  ): Promise<{ success: number; errors: string[] }> {
    try {
      const jsonData = this.parseCsvToJson(csvString);
      return await this.importFromJson(jsonData);
    } catch (error) {
      console.error("❌ CSV import failed:", error);
      return { success: 0, errors: [error.message || "CSV import failed"] };
    }
  }

  /**
   * Import customers from uploaded file
   */
  static async importFromFile(
    file: File,
  ): Promise<{ success: number; errors: string[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;

          if (file.type === "application/json" || file.name.endsWith(".json")) {
            const jsonData = JSON.parse(content);
            const result = await this.importFromJson(jsonData);
            resolve(result);
          } else if (file.type === "text/csv" || file.name.endsWith(".csv")) {
            const result = await this.importFromCsv(content);
            resolve(result);
          } else {
            reject(
              new Error(
                "Unsupported file format. Please use JSON or CSV files.",
              ),
            );
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate and clean customer data
   */
  private static validateAndCleanData(
    data: ImportCustomerData[],
  ): ImportCustomerData[] {
    const cleanedData: ImportCustomerData[] = [];

    for (const customer of data) {
      // Required fields validation
      if (
        !customer.name ||
        !customer.phone ||
        !customer.address ||
        !customer.vc_no
      ) {
        console.warn(
          `Skipping customer with missing required fields:`,
          customer,
        );
        continue;
      }

      // Clean and validate data
      const cleanedCustomer: ImportCustomerData = {
        name: customer.name.trim(),
        phone: this.cleanPhoneNumber(customer.phone),
        address: customer.address.trim(),
        package: customer.package?.trim() || "Basic",
        vc_no: customer.vc_no.trim(),
        collector_name: customer.collector_name?.trim() || "Default Collector",
        prev_os: this.parseNumber(customer.prev_os) || 0,
        date: customer.date || new Date().toISOString().split("T")[0],
        bill_amount: this.parseNumber(customer.bill_amount) || 0,
        collected_cash: this.parseNumber(customer.collected_cash) || 0,
        collected_online: this.parseNumber(customer.collected_online) || 0,
        discount: this.parseNumber(customer.discount) || 0,
        current_os: this.parseNumber(customer.current_os) || 0,
        remark: customer.remark?.trim() || "",
        status: customer.status === "inactive" ? "inactive" : "active",
        email: customer.email?.trim() || undefined,
        billing_status: this.validateBillingStatus(customer.billing_status),
        last_payment_date:
          customer.last_payment_date || new Date().toISOString().split("T")[0],
        join_date: customer.join_date || new Date().toISOString().split("T")[0],
      };

      cleanedData.push(cleanedCustomer);
    }

    return cleanedData;
  }

  /**
   * Parse CSV line handling quoted values
   */
  private static parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map((val) => val.replace(/"/g, ""));
  }

  /**
   * Normalize header names to match expected field names
   */
  private static normalizeHeaderName(header: string): string {
    const mapping: { [key: string]: string } = {
      "customer name": "name",
      customer_name: "name",
      "phone number": "phone",
      phone_number: "phone",
      mobile: "phone",
      "vc number": "vc_no",
      vc_number: "vc_no",
      vcnumber: "vc_no",
      collector: "collector_name",
      employee: "collector_name",
      "previous os": "prev_os",
      previous_os: "prev_os",
      "bill amount": "bill_amount",
      amount: "bill_amount",
      "cash collected": "collected_cash",
      "online collected": "collected_online",
      "current os": "current_os",
      current_os: "current_os",
      remarks: "remark",
      comment: "remark",
      "email address": "email",
      "join date": "join_date",
      "joining date": "join_date",
      "last payment": "last_payment_date",
      "payment date": "last_payment_date",
    };

    const normalized = header.toLowerCase().trim();
    return mapping[normalized] || normalized.replace(/\s+/g, "_");
  }

  /**
   * Clean phone number format
   */
  private static cleanPhoneNumber(phone: string): string {
    if (!phone) return "";

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, "");

    // If it doesn't start with +91 and has 10 digits, add +91
    if (!cleaned.startsWith("+91") && cleaned.length === 10) {
      return `+91 ${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Parse number from string
   */
  private static parseNumber(value: any): number | undefined {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const num = parseFloat(value.replace(/[^\d.-]/g, ""));
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  }

  /**
   * Validate billing status
   */
  private static validateBillingStatus(
    status: any,
  ): "Paid" | "Pending" | "Overdue" {
    if (typeof status === "string") {
      const normalized = status.toLowerCase().trim();
      if (normalized === "paid") return "Paid";
      if (normalized === "overdue") return "Overdue";
    }
    return "Pending";
  }

  /**
   * Generate sample CSV template
   */
  static generateSampleCsv(): string {
    const headers = [
      "name",
      "phone",
      "address",
      "package",
      "vc_no",
      "collector_name",
      "prev_os",
      "bill_amount",
      "collected_cash",
      "collected_online",
      "discount",
      "current_os",
      "remark",
      "status",
      "email",
      "billing_status",
      "last_payment_date",
      "join_date",
    ];

    const sampleData = [
      "John Smith",
      "+91 98765 43210",
      "123 Main Street, Mumbai, Maharashtra 400001",
      "Premium HD",
      "VC001234",
      "John Collector",
      "0",
      "599",
      "599",
      "0",
      "0",
      "0",
      "Regular customer",
      "active",
      "john.smith@email.com",
      "Paid",
      "2024-01-15",
      "2023-06-15",
    ];

    return (
      headers.join(",") + "\n" + sampleData.map((val) => `"${val}"`).join(",")
    );
  }

  /**
   * Generate sample JSON template
   */
  static generateSampleJson(): string {
    const sampleData = [
      {
        name: "John Smith",
        phone: "+91 98765 43210",
        address: "123 Main Street, Mumbai, Maharashtra 400001",
        package: "Premium HD",
        vc_no: "VC001234",
        collector_name: "John Collector",
        prev_os: 0,
        bill_amount: 599,
        collected_cash: 599,
        collected_online: 0,
        discount: 0,
        current_os: 0,
        remark: "Regular customer",
        status: "active",
        email: "john.smith@email.com",
        billing_status: "Paid",
        last_payment_date: "2024-01-15",
        join_date: "2023-06-15",
      },
      {
        name: "Priya Sharma",
        phone: "+91 87654 32109",
        address: "456 Garden Road, Delhi, Delhi 110001",
        package: "Basic",
        vc_no: "VC001235",
        collector_name: "Sarah Collector",
        prev_os: 0,
        bill_amount: 299,
        collected_cash: 0,
        collected_online: 0,
        discount: 0,
        current_os: 299,
        remark: "New customer",
        status: "active",
        email: "priya.sharma@email.com",
        billing_status: "Pending",
        last_payment_date: "2023-12-20",
        join_date: "2023-03-10",
      },
    ];

    return JSON.stringify(sampleData, null, 2);
  }
}
