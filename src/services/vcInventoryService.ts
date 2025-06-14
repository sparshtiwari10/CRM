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
    } catch (error) {
      console.error("Failed to get VC inventory:", error);
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

  static async getVCItemsByArea(areas: string[]): Promise<VCInventoryItem[]> {
    try {
      // This requires getting customers first, then filtering VCs
      // In a production system, you might want to denormalize area into VC documents
      const allVCs = await this.getAllVCItems();

      // Get customers to filter by area
      const customersQuery = query(collection(db, "customers"));
      const customersSnapshot = await getDocs(customersQuery);
      const customersInAreas = customersSnapshot.docs
        .filter((doc) => areas.includes(doc.data().collectorName))
        .map((doc) => doc.id);

      return allVCs.filter((vc) => customersInAreas.includes(vc.customerId));
    } catch (error) {
      console.error("Failed to get VC items by area:", error);
      throw error;
    }
  }

  static async getVCItem(vcId: string): Promise<VCInventoryItem> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, vcId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("VC item not found");
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        statusHistory:
          data.statusHistory?.map((h: any) => ({
            ...h,
            changedAt: h.changedAt?.toDate() || new Date(),
          })) || [],
        ownershipHistory:
          data.ownershipHistory?.map((h: any) => ({
            ...h,
            startDate: h.startDate?.toDate() || new Date(),
            endDate: h.endDate?.toDate() || null,
          })) || [],
      } as VCInventoryItem;
    } catch (error) {
      console.error("Failed to get VC item:", error);
      throw error;
    }
  }

  static async createVCItem(
    vcData: Omit<VCInventoryItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Check if VC number already exists
      const existingVC = await this.findByVCNumber(vcData.vcNumber);
      if (existingVC) {
        throw new Error(`VC number ${vcData.vcNumber} already exists`);
      }

      const docData = {
        ...vcData,
        statusHistory: vcData.statusHistory.map((h) => ({
          ...h,
          changedAt: Timestamp.fromDate(h.changedAt),
        })),
        ownershipHistory: vcData.ownershipHistory.map((h) => ({
          ...h,
          startDate: Timestamp.fromDate(h.startDate),
          endDate: h.endDate ? Timestamp.fromDate(h.endDate) : null,
        })),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        docData,
      );
      console.log(`✅ VC item created: ${vcData.vcNumber}`);
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
      const docRef = doc(db, this.COLLECTION_NAME, vcId);

      const updateData: any = { ...updates };

      if (updates.statusHistory) {
        updateData.statusHistory = updates.statusHistory.map((h) => ({
          ...h,
          changedAt: Timestamp.fromDate(h.changedAt),
        }));
      }

      if (updates.ownershipHistory) {
        updateData.ownershipHistory = updates.ownershipHistory.map((h) => ({
          ...h,
          startDate: Timestamp.fromDate(h.startDate),
          endDate: h.endDate ? Timestamp.fromDate(h.endDate) : null,
        }));
      }

      updateData.updatedAt = Timestamp.now();

      await updateDoc(docRef, updateData);
      console.log(`✅ VC item updated: ${vcId}`);
    } catch (error) {
      console.error("Failed to update VC item:", error);
      throw error;
    }
  }

  static async deleteVCItem(vcId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, vcId);
      await deleteDoc(docRef);
      console.log(`✅ VC item deleted: ${vcId}`);
    } catch (error) {
      console.error("Failed to delete VC item:", error);
      throw error;
    }
  }

  // ================== VC OPERATIONS ==================

  static async findByVCNumber(
    vcNumber: string,
  ): Promise<VCInventoryItem | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("vcNumber", "==", vcNumber),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        statusHistory:
          data.statusHistory?.map((h: any) => ({
            ...h,
            changedAt: h.changedAt?.toDate() || new Date(),
          })) || [],
        ownershipHistory:
          data.ownershipHistory?.map((h: any) => ({
            ...h,
            startDate: h.startDate?.toDate() || new Date(),
            endDate: h.endDate?.toDate() || null,
          })) || [],
      } as VCInventoryItem;
    } catch (error) {
      console.error("Failed to find VC by number:", error);
      throw error;
    }
  }

  static async changeVCStatus(
    vcId: string,
    newStatus: "active" | "inactive",
    reason?: string,
  ): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const vcItem = await this.getVCItem(vcId);

      const statusEntry: VCStatusHistory = {
        status: newStatus,
        changedAt: new Date(),
        changedBy: currentUser.name,
        reason,
      };

      const updatedStatusHistory = [...vcItem.statusHistory, statusEntry];

      await this.updateVCItem(vcId, {
        status: newStatus,
        statusHistory: updatedStatusHistory,
      });

      console.log(`✅ VC status changed: ${vcItem.vcNumber} → ${newStatus}`);
    } catch (error) {
      console.error("Failed to change VC status:", error);
      throw error;
    }
  }

  static async reassignVC(
    vcId: string,
    newCustomerId: string,
    newCustomerName: string,
  ): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const vcItem = await this.getVCItem(vcId);

      // End current ownership
      const updatedOwnershipHistory = vcItem.ownershipHistory.map((h) => {
        if (!h.endDate) {
          return { ...h, endDate: new Date() };
        }
        return h;
      });

      // Add new ownership
      const newOwnershipEntry: VCOwnershipHistory = {
        customerId: newCustomerId,
        customerName: newCustomerName,
        startDate: new Date(),
        assignedBy: currentUser.name,
      };

      updatedOwnershipHistory.push(newOwnershipEntry);

      await this.updateVCItem(vcId, {
        customerId: newCustomerId,
        customerName: newCustomerName,
        ownershipHistory: updatedOwnershipHistory,
      });

      console.log(`✅ VC reassigned: ${vcItem.vcNumber} → ${newCustomerName}`);
    } catch (error) {
      console.error("Failed to reassign VC:", error);
      throw error;
    }
  }

  // ================== HELPER METHODS ==================

  static async getActiveVCsForCustomer(
    customerId: string,
  ): Promise<VCInventoryItem[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("customerId", "==", customerId),
        where("status", "==", "active"),
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
      console.error("Failed to get active VCs for customer:", error);
      throw error;
    }
  }

  static async bulkCreateVCs(
    vcNumbers: string[],
    defaultPackageId: string,
    defaultPackageName: string,
  ): Promise<{
    success: string[];
    failed: { vcNumber: string; error: string }[];
  }> {
    const success: string[] = [];
    const failed: { vcNumber: string; error: string }[] = [];

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    for (const vcNumber of vcNumbers) {
      try {
        const vcData: Omit<VCInventoryItem, "id" | "createdAt" | "updatedAt"> =
          {
            vcNumber,
            customerId: "", // Unassigned initially
            packageId: defaultPackageId,
            packageName: defaultPackageName,
            status: "inactive",
            statusHistory: [
              {
                status: "inactive",
                changedAt: new Date(),
                changedBy: currentUser.name,
                reason: "Bulk creation",
              },
            ],
            ownershipHistory: [],
          };

        await this.createVCItem(vcData);
        success.push(vcNumber);
      } catch (error) {
        failed.push({
          vcNumber,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { success, failed };
  }
}
