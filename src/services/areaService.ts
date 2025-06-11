import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Area {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

export class AreaService {
  private static readonly COLLECTION_NAME = "areas";

  /**
   * Get all areas from Firebase
   */
  static async getAllAreas(): Promise<Area[]> {
    try {
      console.log("📍 Fetching areas from Firebase...");

      const areasRef = collection(db, this.COLLECTION_NAME);
      const areasSnapshot = await getDocs(areasRef);

      const areas: Area[] = [];
      areasSnapshot.forEach((doc) => {
        const data = doc.data();
        areas.push({
          id: doc.id,
          name: data.name,
          description: data.description || "",
          isActive: data.isActive ?? true,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
          created_by: data.created_by || "",
        });
      });

      // Sort by name
      areas.sort((a, b) => a.name.localeCompare(b.name));

      console.log(`✅ Successfully loaded ${areas.length} areas`);
      return areas;
    } catch (error) {
      console.error("❌ Failed to fetch areas:", error);

      // Return default areas if Firebase is not available
      return this.getDefaultAreas();
    }
  }

  /**
   * Get active areas only
   */
  static async getActiveAreas(): Promise<Area[]> {
    const areas = await this.getAllAreas();
    return areas.filter((area) => area.isActive);
  }

  /**
   * Get area by ID
   */
  static async getArea(areaId: string): Promise<Area> {
    try {
      const areaRef = doc(db, this.COLLECTION_NAME, areaId);
      const areaDoc = await getDoc(areaRef);

      if (areaDoc.exists()) {
        const data = areaDoc.data();
        return {
          id: areaDoc.id,
          name: data.name,
          description: data.description || "",
          isActive: data.isActive ?? true,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
          created_by: data.created_by || "",
        };
      } else {
        throw new Error("Area not found");
      }
    } catch (error) {
      console.error("❌ Failed to fetch area:", error);
      throw error;
    }
  }

  /**
   * Create a new area
   */
  static async createArea(
    areaData: Omit<Area, "id" | "created_at" | "updated_at">,
  ): Promise<string> {
    try {
      console.log("📍 Creating new area:", areaData.name);

      // Check if area name already exists
      const existingAreas = await this.getAllAreas();
      const nameExists = existingAreas.some(
        (area) => area.name.toLowerCase() === areaData.name.toLowerCase(),
      );

      if (nameExists) {
        throw new Error("An area with this name already exists");
      }

      const areasRef = collection(db, this.COLLECTION_NAME);
      const now = Timestamp.now();

      const newArea = {
        name: areaData.name.trim(),
        description: areaData.description || "",
        isActive: areaData.isActive ?? true,
        created_at: now,
        updated_at: now,
        created_by: areaData.created_by || "",
      };

      const docRef = await addDoc(areasRef, newArea);

      console.log("✅ Area created successfully with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("❌ Failed to create area:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create area",
      );
    }
  }

  /**
   * Update an existing area
   */
  static async updateArea(
    areaId: string,
    updates: Partial<Omit<Area, "id" | "created_at" | "updated_at">>,
  ): Promise<void> {
    try {
      console.log("📍 Updating area:", areaId);

      // If updating name, check for duplicates
      if (updates.name) {
        const existingAreas = await this.getAllAreas();
        const nameExists = existingAreas.some(
          (area) =>
            area.id !== areaId &&
            area.name.toLowerCase() === updates.name!.toLowerCase(),
        );

        if (nameExists) {
          throw new Error("An area with this name already exists");
        }
      }

      const areaRef = doc(db, this.COLLECTION_NAME, areaId);

      const updateData = {
        ...updates,
        updated_at: Timestamp.now(),
      };

      if (updates.name) {
        updateData.name = updates.name.trim();
      }

      await updateDoc(areaRef, updateData);

      console.log("✅ Area updated successfully");
    } catch (error) {
      console.error("❌ Failed to update area:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update area",
      );
    }
  }

  /**
   * Delete an area (soft delete by setting isActive to false)
   */
  static async deleteArea(areaId: string): Promise<void> {
    try {
      console.log("📍 Deleting area:", areaId);

      // Soft delete by setting isActive to false
      await this.updateArea(areaId, { isActive: false });

      console.log("✅ Area deleted successfully");
    } catch (error) {
      console.error("❌ Failed to delete area:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete area",
      );
    }
  }

  /**
   * Permanently delete an area
   */
  static async permanentlyDeleteArea(areaId: string): Promise<void> {
    try {
      console.log("📍 Permanently deleting area:", areaId);

      const areaRef = doc(db, this.COLLECTION_NAME, areaId);
      await deleteDoc(areaRef);

      console.log("✅ Area permanently deleted");
    } catch (error) {
      console.error("❌ Failed to permanently delete area:", error);
      throw new Error("Failed to permanently delete area");
    }
  }

  /**
   * Reactivate a deleted area
   */
  static async reactivateArea(areaId: string): Promise<void> {
    try {
      console.log("📍 Reactivating area:", areaId);

      await this.updateArea(areaId, { isActive: true });

      console.log("✅ Area reactivated successfully");
    } catch (error) {
      console.error("❌ Failed to reactivate area:", error);
      throw new Error("Failed to reactivate area");
    }
  }

  /**
   * Get areas with customer and employee usage statistics
   */
  static async getAreaUsageStats(): Promise<
    {
      area: Area;
      customerCount: number;
      employeeCount: number;
      isInUse: boolean;
    }[]
  > {
    try {
      const areas = await this.getAllAreas();

      // Get customers and employees data
      const { firestoreService } = await import("./firestoreService");
      const { authService } = await import("./authService");

      const [customers, employees] = await Promise.all([
        firestoreService.getAllCustomers(),
        authService.getAllEmployees(),
      ]);

      return areas.map((area) => {
        const customerCount = customers.filter(
          (c) => c.collectorName === area.name,
        ).length;
        const employeeCount = employees.filter(
          (e) =>
            e.collector_name === area.name ||
            (e.assigned_areas && e.assigned_areas.includes(area.name)),
        ).length;

        return {
          area,
          customerCount,
          employeeCount,
          isInUse: customerCount > 0 || employeeCount > 0,
        };
      });
    } catch (error) {
      console.error("❌ Failed to get area usage stats:", error);
      throw new Error("Failed to get area usage statistics");
    }
  }

  /**
   * Validate area can be deleted safely
   */
  static async validateAreaDeletion(areaId: string): Promise<{
    canDelete: boolean;
    reason?: string;
    affectedCustomers?: number;
    affectedEmployees?: number;
  }> {
    try {
      const area = await this.getArea(areaId);

      const { firestoreService } = await import("./firestoreService");
      const { authService } = await import("./authService");

      const [customers, employees] = await Promise.all([
        firestoreService.getAllCustomers(),
        authService.getAllEmployees(),
      ]);

      const affectedCustomers = customers.filter(
        (c) => c.collectorName === area.name,
      ).length;
      const affectedEmployees = employees.filter(
        (e) =>
          e.collector_name === area.name ||
          (e.assigned_areas && e.assigned_areas.includes(area.name)),
      ).length;

      if (affectedCustomers > 0 || affectedEmployees > 0) {
        return {
          canDelete: false,
          reason: `Area "${area.name}" is currently assigned to ${affectedCustomers} customer(s) and ${affectedEmployees} employee(s)`,
          affectedCustomers,
          affectedEmployees,
        };
      }

      return { canDelete: true };
    } catch (error) {
      return {
        canDelete: false,
        reason: "Failed to validate area deletion: " + (error as Error).message,
      };
    }
  }

  /**
   * Import areas from existing customer/employee data
   */
  static async importAreasFromExistingData(): Promise<string[]> {
    try {
      console.log("📍 Importing areas from existing data...");

      const { firestoreService } = await import("./firestoreService");
      const { authService } = await import("./authService");

      const [customers, employees] = await Promise.all([
        firestoreService.getAllCustomers(),
        authService.getAllEmployees(),
      ]);

      // Extract unique area names
      const customerAreas = customers
        .map((c) => c.collectorName)
        .filter(Boolean);

      const employeeAreas = employees
        .flatMap((e) => e.assigned_areas || [e.collector_name])
        .filter(Boolean);

      const uniqueAreas = [...new Set([...customerAreas, ...employeeAreas])];

      // Get existing areas to avoid duplicates
      const existingAreas = await this.getAllAreas();
      const existingNames = existingAreas.map((a) => a.name.toLowerCase());

      const importedAreas: string[] = [];

      for (const areaName of uniqueAreas) {
        if (!existingNames.includes(areaName.toLowerCase())) {
          try {
            await this.createArea({
              name: areaName,
              description: `Imported from existing data`,
              isActive: true,
              created_by: "system_import",
            });
            importedAreas.push(areaName);
          } catch (error) {
            console.warn(`Failed to import area "${areaName}":`, error);
          }
        }
      }

      console.log("✅ Successfully imported areas:", importedAreas);
      return importedAreas;
    } catch (error) {
      console.error("❌ Failed to import areas:", error);
      throw new Error("Failed to import areas from existing data");
    }
  }

  /**
   * Get default areas as fallback
   */
  private static getDefaultAreas(): Area[] {
    const now = new Date();
    return [
      {
        id: "default-1",
        name: "Downtown",
        description: "Central business district",
        isActive: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "default-2",
        name: "Suburbs",
        description: "Residential suburban areas",
        isActive: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "default-3",
        name: "Industrial",
        description: "Industrial and commercial zones",
        isActive: true,
        created_at: now,
        updated_at: now,
      },
    ];
  }

  /**
   * Get area names only (for dropdown usage)
   */
  static async getAreaNames(): Promise<string[]> {
    const areas = await this.getActiveAreas();
    return areas.map((area) => area.name);
  }
}
