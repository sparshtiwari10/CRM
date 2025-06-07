import { CustomerService } from "@/services/customerService";
import { AuthService } from "@/services/authService";
import { Customer } from "@/types";

// Demo customers data
const demoCustomers: Omit<Customer, "id">[] = [
  {
    name: "John Smith",
    phoneNumber: "+1 (555) 123-4567",
    address: "123 Main St, Anytown, NY 12345",
    currentPackage: "Premium HD",
    billingStatus: "Paid",
    lastPaymentDate: "2024-01-15",
    email: "john.smith@email.com",
    joinDate: "2023-06-15",
    vcNumber: "VC001234",
    collectorName: "John Collector",
    portalBill: 59.99,
    isActive: true,
    activationDate: "2023-06-15",
  },
  {
    name: "Sarah Johnson",
    phoneNumber: "+1 (555) 234-5678",
    address: "456 Oak Ave, Springfield, CA 90210",
    currentPackage: "Basic",
    billingStatus: "Pending",
    lastPaymentDate: "2023-12-20",
    email: "sarah.j@email.com",
    joinDate: "2023-03-10",
    vcNumber: "VC001235",
    collectorName: "John Collector",
    portalBill: 29.99,
    isActive: true,
    activationDate: "2023-03-10",
  },
  {
    name: "Michael Brown",
    phoneNumber: "+1 (555) 345-6789",
    address: "789 Pine Rd, Riverside, TX 75001",
    currentPackage: "Sports Package",
    billingStatus: "Overdue",
    lastPaymentDate: "2023-11-25",
    email: "mbrown@email.com",
    joinDate: "2022-12-05",
    vcNumber: "VC001236",
    collectorName: "Sarah Collector",
    portalBill: 79.99,
    isActive: false,
    activationDate: "2022-12-05",
    deactivationDate: "2024-01-05",
  },
  {
    name: "Emily Davis",
    phoneNumber: "+1 (555) 456-7890",
    address: "321 Elm St, Lakewood, FL 33801",
    currentPackage: "Premium HD",
    billingStatus: "Paid",
    lastPaymentDate: "2024-01-18",
    email: "emily.davis@email.com",
    joinDate: "2023-08-22",
    vcNumber: "VC001237",
    collectorName: "Sarah Collector",
    portalBill: 59.99,
    isActive: true,
    activationDate: "2023-08-22",
  },
  {
    name: "David Wilson",
    phoneNumber: "+1 (555) 567-8901",
    address: "654 Maple Dr, Hillview, WA 98001",
    currentPackage: "Family Bundle",
    billingStatus: "Paid",
    lastPaymentDate: "2024-01-12",
    email: "dwilson@email.com",
    joinDate: "2023-04-30",
    vcNumber: "VC001238",
    collectorName: "John Collector",
    portalBill: 49.99,
    isActive: true,
    activationDate: "2023-04-30",
  },
  {
    name: "Lisa Anderson",
    phoneNumber: "+1 (555) 678-9012",
    address: "987 Cedar Ln, Greenfield, OR 97001",
    currentPackage: "Basic",
    billingStatus: "Pending",
    lastPaymentDate: "2023-12-28",
    email: "lisa.anderson@email.com",
    joinDate: "2023-07-14",
    vcNumber: "VC001239",
    collectorName: "Sarah Collector",
    portalBill: 29.99,
    isActive: true,
    activationDate: "2023-07-14",
  },
];

export class DataSeeder {
  static async seedAll(): Promise<void> {
    try {
      console.log("Starting data seeding...");

      // Seed users first
      await AuthService.seedDemoUsers();
      console.log("✅ Demo users seeded");

      // Seed customers
      await this.seedCustomers();
      console.log("✅ Demo customers seeded");

      console.log("🎉 All demo data seeded successfully!");
    } catch (error) {
      console.error("Error seeding data:", error);
      throw error;
    }
  }

  static async seedCustomers(): Promise<void> {
    try {
      // Check if customers already exist
      const existingCustomers = await CustomerService.getAllCustomers();

      if (existingCustomers.length === 0) {
        console.log("Seeding demo customers...");

        for (const customer of demoCustomers) {
          await CustomerService.addCustomer(customer);
        }

        console.log(`Added ${demoCustomers.length} demo customers`);
      } else {
        console.log(
          `Found ${existingCustomers.length} existing customers, skipping seed`,
        );
      }
    } catch (error) {
      console.error("Error seeding customers:", error);
      throw error;
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      console.log("⚠️ Clearing all data...");

      // Get all customers and delete them
      const customers = await CustomerService.getAllCustomers();
      for (const customer of customers) {
        await CustomerService.deleteCustomer(customer.id);
      }

      console.log("🗑️ All data cleared");
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }
}
