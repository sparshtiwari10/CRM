import { useState, useEffect } from "react";
import {
  Save,
  User,
  Building,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SettingsService, AppSettings } from "@/services/settingsService";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState({
    company: false,
    notification: false,
    system: false,
  });

  const { toast } = useToast();

  // Load settings from Firebase
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settingsData = await SettingsService.getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <DashboardLayout title="Settings">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleSaveCompanySettings = async () => {
    try {
      setIsSaving((prev) => ({ ...prev, company: true }));

      await SettingsService.updateCompanyInfo({
        projectName: settings.projectName,
        companyName: settings.companyName,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        description: settings.description,
      });

      toast({
        title: "Settings saved",
        description: "Company settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Failed to save company settings:", error);
      toast({
        title: "Error",
        description: "Failed to save company settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving((prev) => ({ ...prev, company: false }));
    }
  };

  const handleSaveNotificationSettings = async () => {
    try {
      setIsSaving((prev) => ({ ...prev, notification: true }));

      await SettingsService.updateNotificationSettings({
        emailNotifications: settings.emailNotifications,
        smsNotifications: settings.smsNotifications,
        overdueReminders: settings.overdueReminders,
        paymentConfirmations: settings.paymentConfirmations,
        systemAlerts: settings.systemAlerts,
        marketingEmails: settings.marketingEmails,
      });

      toast({
        title: "Notifications updated",
        description: "Notification preferences have been saved.",
      });
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving((prev) => ({ ...prev, notification: false }));
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      setIsSaving((prev) => ({ ...prev, system: true }));

      await SettingsService.updateSystemSettings({
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        currency: settings.currency,
        language: settings.language,
        theme: settings.theme,
        autoBackup: settings.autoBackup,
        sessionTimeout: settings.sessionTimeout,
      });

      toast({
        title: "System settings updated",
        description: "System configuration has been saved.",
      });
    } catch (error) {
      console.error("Failed to save system settings:", error);
      toast({
        title: "Error",
        description: "Failed to save system settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving((prev) => ({ ...prev, system: false }));
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground">
            Manage your application settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Company Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="projectName">
                    Project Name
                    <span className="text-xs text-muted-foreground ml-2">
                      (Shown on login page)
                    </span>
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="projectName"
                      value={settings.projectName}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          projectName: e.target.value,
                        }))
                      }
                      className="pl-10"
                      placeholder="Enter project name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev!,
                        companyName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={settings.address}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev!,
                        address: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={settings.phone}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={settings.website}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev!,
                        website: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={settings.description}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev!,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveCompanySettings}
                className="w-full"
                disabled={isSaving.company}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving.company ? "Saving..." : "Save Company Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        emailNotifications: checked,
                      }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive notifications via SMS
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        smsNotifications: checked,
                      }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Overdue Reminders</Label>
                    <p className="text-sm text-gray-500">
                      Alerts for overdue payments
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.overdueReminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        overdueReminders: checked,
                      }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Payment Confirmations</Label>
                    <p className="text-sm text-gray-500">
                      Notify when payments are received
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.paymentConfirmations}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        paymentConfirmations: checked,
                      }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Alerts</Label>
                    <p className="text-sm text-gray-500">
                      Important system notifications
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.systemAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        systemAlerts: checked,
                      }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-gray-500">
                      Promotional and marketing content
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        marketingEmails: checked,
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveNotificationSettings}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>System Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={systemSettings.timezone}
                    onValueChange={(value) =>
                      setSystemSettings((prev) => ({
                        ...prev,
                        timezone: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">
                        Eastern Time
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select
                      value={systemSettings.dateFormat}
                      onValueChange={(value) =>
                        setSystemSettings((prev) => ({
                          ...prev,
                          dateFormat: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={systemSettings.currency}
                      onValueChange={(value) =>
                        setSystemSettings((prev) => ({
                          ...prev,
                          currency: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="sessionTimeout">
                    Session Timeout (minutes)
                  </Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={systemSettings.sessionTimeout}
                    onChange={(e) =>
                      setSystemSettings((prev) => ({
                        ...prev,
                        sessionTimeout: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Backup</Label>
                    <p className="text-sm text-gray-500">
                      Automatically backup data daily
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.autoBackup}
                    onCheckedChange={(checked) =>
                      setSystemSettings((prev) => ({
                        ...prev,
                        autoBackup: checked,
                      }))
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveSystemSettings} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save System Settings
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Password Requirements
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Minimum 8 characters</p>
                    <p>• Must contain uppercase and lowercase letters</p>
                    <p>• Must contain at least one number</p>
                    <p>• Must contain at least one special character</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">Data Retention</h4>
                  <p className="text-sm text-gray-600">
                    Customer data is retained for 7 years as per regulatory
                    requirements. Inactive accounts are archived after 2 years
                    of inactivity.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">Privacy Policy</h4>
                  <p className="text-sm text-gray-600">
                    Last updated: January 2024. Customer data is encrypted and
                    stored securely. No personal information is shared with
                    third parties without consent.
                  </p>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <Shield className="mr-2 h-4 w-4" />
                Update Security Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
