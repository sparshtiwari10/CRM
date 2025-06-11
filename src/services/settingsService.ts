import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AppSettings {
  id: string;
  // Company Information
  projectName: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;

  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  overdueReminders: boolean;
  paymentConfirmations: boolean;
  systemAlerts: boolean;
  marketingEmails: boolean;

  // System Settings
  timezone: string;
  dateFormat: string;
  currency: string;
  language: string;
  theme: string;
  autoBackup: boolean;
  sessionTimeout: string;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

const DEFAULT_SETTINGS: Omit<AppSettings, "id" | "created_at" | "updated_at"> =
  {
    // Company Information
    projectName: "AGV Cable TV",
    companyName: "CableTV Operator",
    address: "123 Main Street, Anytown, State 12345",
    phone: "+1 (555) 123-4567",
    email: "info@cabletv.com",
    website: "https://cabletv.com",
    description:
      "Premium cable TV services for residential and commercial customers.",

    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    overdueReminders: true,
    paymentConfirmations: true,
    systemAlerts: true,
    marketingEmails: false,

    // System Settings
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    currency: "USD",
    language: "en",
    theme: "light",
    autoBackup: true,
    sessionTimeout: "30",
  };

export class SettingsService {
  private static readonly SETTINGS_DOC_ID = "app_settings";

  /**
   * Get application settings from Firebase
   */
  static async getSettings(): Promise<AppSettings> {
    try {
      console.log("📋 Fetching application settings from Firebase...");

      const settingsRef = doc(db, "settings", this.SETTINGS_DOC_ID);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        console.log("✅ Settings loaded from Firebase");

        return {
          id: settingsDoc.id,
          ...data,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as AppSettings;
      } else {
        console.log("📝 No settings found, creating default settings...");
        return await this.createDefaultSettings();
      }
    } catch (error) {
      console.error("❌ Failed to fetch settings from Firebase:", error);

      // Return default settings if Firebase is not available
      return {
        id: this.SETTINGS_DOC_ID,
        ...DEFAULT_SETTINGS,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
  }

  /**
   * Create default settings in Firebase
   */
  private static async createDefaultSettings(): Promise<AppSettings> {
    try {
      const settingsRef = doc(db, "settings", this.SETTINGS_DOC_ID);
      const now = Timestamp.now();

      const defaultSettings = {
        ...DEFAULT_SETTINGS,
        created_at: now,
        updated_at: now,
      };

      await setDoc(settingsRef, defaultSettings);

      console.log("✅ Default settings created in Firebase");

      return {
        id: this.SETTINGS_DOC_ID,
        ...DEFAULT_SETTINGS,
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };
    } catch (error) {
      console.error("❌ Failed to create default settings:", error);
      throw error;
    }
  }

  /**
   * Update application settings in Firebase
   */
  static async updateSettings(
    updates: Partial<Omit<AppSettings, "id" | "created_at" | "updated_at">>,
  ): Promise<void> {
    try {
      console.log("💾 Updating application settings in Firebase...");

      const settingsRef = doc(db, "settings", this.SETTINGS_DOC_ID);

      const updateData = {
        ...updates,
        updated_at: Timestamp.now(),
      };

      await updateDoc(settingsRef, updateData);

      console.log("✅ Settings updated successfully");
    } catch (error) {
      console.error("❌ Failed to update settings:", error);
      throw new Error("Failed to update settings. Please try again.");
    }
  }

  /**
   * Update company information
   */
  static async updateCompanyInfo(companyInfo: {
    projectName?: string;
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
  }): Promise<void> {
    return this.updateSettings(companyInfo);
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(notificationSettings: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    overdueReminders?: boolean;
    paymentConfirmations?: boolean;
    systemAlerts?: boolean;
    marketingEmails?: boolean;
  }): Promise<void> {
    return this.updateSettings(notificationSettings);
  }

  /**
   * Update system settings
   */
  static async updateSystemSettings(systemSettings: {
    timezone?: string;
    dateFormat?: string;
    currency?: string;
    language?: string;
    theme?: string;
    autoBackup?: boolean;
    sessionTimeout?: string;
  }): Promise<void> {
    return this.updateSettings(systemSettings);
  }

  /**
   * Get project name for login page
   */
  static async getProjectName(): Promise<string> {
    try {
      const settings = await this.getSettings();
      return settings.projectName;
    } catch (error) {
      console.error("Failed to get project name:", error);
      return DEFAULT_SETTINGS.projectName;
    }
  }

  /**
   * Update project name
   */
  static async updateProjectName(projectName: string): Promise<void> {
    return this.updateSettings({ projectName });
  }
}
