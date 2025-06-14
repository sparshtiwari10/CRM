import {
  VCInventoryItem,
  VCStatusHistory,
  VCOwnershipHistory,
  Customer,
  Package,
} from "@/types";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { authService } from "./authService";

export class VCInventoryService {
  private static readonly COLLECTION_NAME = "vcInventory";

  // ================== VC INVENTORY CRUD ==================

  static async getAllVCItems(): Promise<VCInventoryItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy("vcNumber"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        statusHistory:
          doc.data().statusHistory?.map((h: any) => ({
            ...h,
            changedAt: h.changedAt?.toDate() || new Date(),
          })) || [],
        ownershipHistory:
          doc.data().ownershipHistory?.map((h: any) => ({
            ...h,
            startDate: h.startDate?.toDate() || new Date(),
            endDate: h.endDate?.toDate() || null,
          })) || [],
      })) as VCInventoryItem[];
    } catch (error: any) {
      console.error("Failed to get VC inventory items:", error);

      // Check if it's a permissions error
      if (error.code === "permission-denied") {
        console.warn("🚨 Permission denied for vcInventory collection");
        return [];
      }

      throw error;
    }
  }

  static async getVCItemsByCustomer(
    customerId: string,
  ): Promise<VCInventoryItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("customerId", "==", customerId),
        orderBy("vcNumber"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        statusHistory:
          doc.data().statusHistory?.map((h: any) => ({
            ...h,
            changedAt: h.changedAt?.toDate() || new Date(),
          })) || [],
        ownershipHistory:
          doc.data().ownershipHistory?.map((h: any) => ({
            ...h,
            startDate: h.startDate?.toDate() || new Date(),
            endDate: h.endDate?.toDate() || null,
          })) || [],
      })) as VCInventoryItem[];
    } catch (error) {
      console.error("Failed to get VC items for customer:", error);
      throw error;
    }
  }

  static async getAvailableVCs(): Promise<VCInventoryItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("status", "==", "available"),
        orderBy("vcNumber"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as VCInventoryItem[];
    } catch (error) {
      console.error("Failed to get available VCs:", error);
      throw error;
    }
  }

  static async getActiveVCsByCustomer(
    customerId: string,
  ): Promise<VCInventoryItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("customerId", "==", customerId),
        where("status", "==", "active"),
        orderBy("vcNumber"),
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as VCInventoryItem[];
    } catch (error) {
      console.error("Failed to get active VCs for customer:", error);
      throw error;
    }
  }

  static async createVCItem(
    vcData: Omit<VCInventoryItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const newVC = {
        ...vcData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser.uid,
        statusHistory: [
          {
            status: vcData.status,
            changedAt: Timestamp.now(),
            changedBy: currentUser.uid,
            reason: "Initial creation",
          },
        ],
        ownershipHistory: vcData.customerId
          ? [
              {
                customerId: vcData.customerId,
                customerName: vcData.customerName || "",
                startDate: Timestamp.now(),
                assignedBy: currentUser.uid,
              },
            ]
          : [],
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), newVC);
      return docRef.id;
    } catch (error) {
      console.error("Failed to create VC item:", error);
      throw error;
    }
  }

  static async updateVCItem(
    vcId: string,
    updates: Partial<VCInventoryItem>,
  ): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const vcRef = doc(db, this.COLLECTION_NAME, vcId);
      const currentDoc = await getDoc(vcRef);

      if (!currentDoc.exists()) {
        throw new Error("VC item not found");
      }

      const currentData = currentDoc.data() as VCInventoryItem;
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Track status changes
      if (updates.status && updates.status !== currentData.status) {
        const statusChange: VCStatusHistory = {
          status: updates.status,
          changedAt: Timestamp.now(),
          changedBy: currentUser.uid,
          reason: updates.notes || "Status update",
        };
        updateData.statusHistory = [
          ...(currentData.statusHistory || []),
          statusChange,
        ];
      }

      // Track ownership changes
      if (updates.customerId && updates.customerId !== currentData.customerId) {
        // Close previous ownership
        const updatedOwnershipHistory = [
          ...(currentData.ownershipHistory || []),
        ];
        if (updatedOwnershipHistory.length > 0) {
          const lastOwnership =
            updatedOwnershipHistory[updatedOwnershipHistory.length - 1];
          if (!lastOwnership.endDate) {
            lastOwnership.endDate = Timestamp.now();
          }
        }

        // Add new ownership
        if (updates.customerId) {
          const newOwnership: VCOwnershipHistory = {
            customerId: updates.customerId,
            customerName: updates.customerName || "",
            startDate: Timestamp.now(),
            assignedBy: currentUser.uid,
          };
          updatedOwnershipHistory.push(newOwnership);
        }

        updateData.ownershipHistory = updatedOwnershipHistory;
      }

      await updateDoc(vcRef, updateData);
    } catch (error) {
      console.error("Failed to update VC item:", error);
      throw error;
    }
  }

  static async deleteVCItem(vcId: string): Promise<void> {
    try {
      const vcRef = doc(db, this.COLLECTION_NAME, vcId);
      await deleteDoc(vcRef);
    } catch (error) {
      console.error("Failed to delete VC item:", error);
      throw error;
    }
  }

  // ================== VC ASSIGNMENT METHODS ==================

  static async assignVCsToCustomer(
    vcIds: string[],
    customerId: string,
    customerName: string,
    packageId?: string,
    packageName?: string,
  ): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const batch = writeBatch(db);
      const now = Timestamp.now();

      for (const vcId of vcIds) {
        const vcRef = doc(db, this.COLLECTION_NAME, vcId);
        const vcDoc = await getDoc(vcRef);

        if (!vcDoc.exists()) {
          throw new Error(`VC ${vcId} not found`);
        }

        const currentData = vcDoc.data() as VCInventoryItem;

        // Close previous ownership if exists
        const updatedOwnershipHistory = [
          ...(currentData.ownershipHistory || []),
        ];
        if (updatedOwnershipHistory.length > 0) {
          const lastOwnership =
            updatedOwnershipHistory[updatedOwnershipHistory.length - 1];
          if (!lastOwnership.endDate) {
            lastOwnership.endDate = now;
          }
        }

        // Add new ownership
        const newOwnership: VCOwnershipHistory = {
          customerId,
          customerName,
          startDate: now,
          assignedBy: currentUser.uid,
        };
        updatedOwnershipHistory.push(newOwnership);

        // Update VC status and assignment
        const updateData = {
          customerId,
          customerName,
          packageId: packageId || currentData.packageId,
          packageName: packageName || currentData.packageName,
          status: "active",
          updatedAt: now,
          ownershipHistory: updatedOwnershipHistory,
          statusHistory: [
            ...(currentData.statusHistory || []),
            {
              status: "active",
              changedAt: now,
              changedBy: currentUser.uid,
              reason: `Assigned to customer: ${customerName}`,
            },
          ],
        };

        batch.update(vcRef, updateData);
      }

      await batch.commit();
    } catch (error) {
      console.error("Failed to assign VCs to customer:", error);
      throw error;
    }
  }

  static async unassignVCsFromCustomer(vcIds: string[]): Promise<void> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const batch = writeBatch(db);
      const now = Timestamp.now();

      for (const vcId of vcIds) {
        const vcRef = doc(db, this.COLLECTION_NAME, vcId);
        const vcDoc = await getDoc(vcRef);

        if (!vcDoc.exists()) {
          throw new Error(`VC ${vcId} not found`);
        }

        const currentData = vcDoc.data() as VCInventoryItem;

        // Close current ownership
        const updatedOwnershipHistory = [
          ...(currentData.ownershipHistory || []),
        ];
        if (updatedOwnershipHistory.length > 0) {
          const lastOwnership =
            updatedOwnershipHistory[updatedOwnershipHistory.length - 1];
          if (!lastOwnership.endDate) {
            lastOwnership.endDate = now;
          }
        }

        // Update VC to available status
        const updateData = {
          customerId: null,
          customerName: null,
          status: "available",
          updatedAt: now,
          ownershipHistory: updatedOwnershipHistory,
          statusHistory: [
            ...(currentData.statusHistory || []),
            {
              status: "available",
              changedAt: now,
              changedBy: currentUser.uid,
              reason: "Unassigned from customer",
            },
          ],
        };

        batch.update(vcRef, updateData);
      }

      await batch.commit();
    } catch (error) {
      console.error("Failed to unassign VCs from customer:", error);
      throw error;
    }
  }

  // ================== VALIDATION METHODS ==================

  static async validateVCNumbers(vcNumbers: string[]): Promise<{
    valid: string[];
    invalid: string[];
    details: {
      vcNumber: string;
      exists: boolean;
      status?: string;
      customerId?: string;
    }[];
  }> {
    try {
      const details: {
        vcNumber: string;
        exists: boolean;
        status?: string;
        customerId?: string;
      }[] = [];
      const valid: string[] = [];
      const invalid: string[] = [];

      for (const vcNumber of vcNumbers) {
        const q = query(
          collection(db, this.COLLECTION_NAME),
          where("vcNumber", "==", vcNumber),
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          details.push({ vcNumber, exists: false });
          invalid.push(vcNumber);
        } else {
          const vcData = querySnapshot.docs[0].data() as VCInventoryItem;
          details.push({
            vcNumber,
            exists: true,
            status: vcData.status,
            customerId: vcData.customerId,
          });
          valid.push(vcNumber);
        }
      }

      return { valid, invalid, details };
    } catch (error) {
      console.error("Failed to validate VC numbers:", error);
      throw error;
    }
  }

  static async checkVCAvailability(vcNumbers: string[]): Promise<{
    available: string[];
    unavailable: string[];
    details: {
      vcNumber: string;
      status: string;
      customerId?: string;
      customerName?: string;
    }[];
  }> {
    try {
      const details: {
        vcNumber: string;
        status: string;
        customerId?: string;
        customerName?: string;
      }[] = [];
      const available: string[] = [];
      const unavailable: string[] = [];

      for (const vcNumber of vcNumbers) {
        const q = query(
          collection(db, this.COLLECTION_NAME),
          where("vcNumber", "==", vcNumber),
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          details.push({ vcNumber, status: "not_found" });
          unavailable.push(vcNumber);
        } else {
          const vcData = querySnapshot.docs[0].data() as VCInventoryItem;
          details.push({
            vcNumber,
            status: vcData.status,
            customerId: vcData.customerId,
            customerName: vcData.customerName,
          });

          if (vcData.status === "available") {
            available.push(vcNumber);
          } else {
            unavailable.push(vcNumber);
          }
        }
      }

      return { available, unavailable, details };
    } catch (error) {
      console.error("Failed to check VC availability:", error);
      throw error;
    }
  }

  // ================== BULK OPERATIONS ==================

  static async bulkCreateVCs(
    vcItems: Omit<
      VCInventoryItem,
      "id" | "createdAt" | "updatedAt" | "statusHistory" | "ownershipHistory"
    >[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const batch = writeBatch(db);
      const now = Timestamp.now();
      let success = 0;
      const errors: string[] = [];

      for (const vcItem of vcItems) {
        try {
          // Check if VC number already exists
          const existingQ = query(
            collection(db, this.COLLECTION_NAME),
            where("vcNumber", "==", vcItem.vcNumber),
          );
          const existing = await getDocs(existingQ);

          if (!existing.empty) {
            errors.push(`VC ${vcItem.vcNumber} already exists`);
            continue;
          }

          const newVC = {
            ...vcItem,
            createdAt: now,
            updatedAt: now,
            createdBy: currentUser.uid,
            statusHistory: [
              {
                status: vcItem.status || "available",
                changedAt: now,
                changedBy: currentUser.uid,
                reason: "Bulk creation",
              },
            ],
            ownershipHistory: [],
          };

          const docRef = doc(collection(db, this.COLLECTION_NAME));
          batch.set(docRef, newVC);
          success++;
        } catch (error: any) {
          errors.push(`VC ${vcItem.vcNumber}: ${error.message}`);
        }
      }

      if (success > 0) {
        await batch.commit();
      }

      return { success, failed: errors.length, errors };
    } catch (error) {
      console.error("Failed to bulk create VCs:", error);
      throw error;
    }
  }

  // ================== STATISTICS & REPORTING ==================

  static async getVCInventoryStats(): Promise<{
    total: number;
    available: number;
    active: number;
    inactive: number;
    maintenance: number;
    byArea: { area: string; count: number }[];
  }> {
    try {
      const allVCs = await this.getAllVCItems();

      const stats = {
        total: allVCs.length,
        available: allVCs.filter((vc) => vc.status === "available").length,
        active: allVCs.filter((vc) => vc.status === "active").length,
        inactive: allVCs.filter((vc) => vc.status === "inactive").length,
        maintenance: allVCs.filter((vc) => vc.status === "maintenance").length,
        byArea: [] as { area: string; count: number }[],
      };

      // Group by area
      const areaMap = new Map<string, number>();
      allVCs.forEach((vc) => {
        const area = vc.area || "Unknown";
        areaMap.set(area, (areaMap.get(area) || 0) + 1);
      });

      stats.byArea = Array.from(areaMap.entries()).map(([area, count]) => ({
        area,
        count,
      }));

      return stats;
    } catch (error) {
      console.error("Failed to get VC inventory stats:", error);
      throw error;
    }
  }
}
