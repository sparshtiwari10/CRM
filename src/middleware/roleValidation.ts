import { authService, User } from "@/services/authService";

/**
 * Enhanced role validation middleware for client-side security
 * This provides additional validation layer before making Firestore operations
 */

export interface PermissionError extends Error {
  code: string;
  context?: any;
}

export class RoleValidator {
  private static createPermissionError(
    message: string,
    code: string,
    context?: any,
  ): PermissionError {
    const error = new Error(message) as PermissionError;
    error.code = code;
    error.context = context;
    return error;
  }

  /**
   * Validate if current user has admin privileges
   */
  static validateAdminAccess(operation: string): User {
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      throw this.createPermissionError(
        "Authentication required for this operation",
        "AUTH_REQUIRED",
        { operation },
      );
    }

    if (currentUser.role !== "admin") {
      throw this.createPermissionError(
        "Administrator privileges required for this operation",
        "ADMIN_REQUIRED",
        { operation, userRole: currentUser.role },
      );
    }

    if (currentUser.is_active === false) {
      throw this.createPermissionError(
        "Account is deactivated. Contact administrator.",
        "ACCOUNT_INACTIVE",
        { operation, userId: currentUser.id },
      );
    }

    return currentUser;
  }

  /**
   * Validate if current user is authenticated and active
   */
  static validateAuthentication(operation: string): User {
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      throw this.createPermissionError(
        "Authentication required for this operation",
        "AUTH_REQUIRED",
        { operation },
      );
    }

    if (currentUser.is_active === false) {
      throw this.createPermissionError(
        "Account is deactivated. Contact administrator.",
        "ACCOUNT_INACTIVE",
        { operation, userId: currentUser.id },
      );
    }

    return currentUser;
  }

  /**
   * Validate customer access permissions
   */
  static validateCustomerAccess(
    customerId: string,
    customerCollectorName?: string,
    operation: string = "customer access",
  ): User {
    const currentUser = this.validateAuthentication(operation);

    // Admins can access all customers
    if (currentUser.role === "admin") {
      return currentUser;
    }

    // Employees can only access customers assigned to them
    if (currentUser.role === "employee") {
      const userCollectorName = currentUser.collector_name || currentUser.name;

      if (!customerCollectorName) {
        throw this.createPermissionError(
          "Customer collector information not available",
          "COLLECTOR_INFO_MISSING",
          { operation, customerId, currentUser: userCollectorName },
        );
      }

      if (userCollectorName !== customerCollectorName) {
        throw this.createPermissionError(
          "Access denied: Customer not assigned to current employee",
          "CUSTOMER_ACCESS_DENIED",
          {
            operation,
            customerId,
            customerCollector: customerCollectorName,
            currentUser: userCollectorName,
          },
        );
      }

      return currentUser;
    }

    throw this.createPermissionError(
      "Invalid user role for customer access",
      "INVALID_ROLE",
      { operation, userRole: currentUser.role },
    );
  }

  /**
   * Validate billing record access permissions
   */
  static validateBillingAccess(
    employeeId: string,
    operation: string = "billing access",
  ): User {
    const currentUser = this.validateAuthentication(operation);

    // Admins can access all billing records
    if (currentUser.role === "admin") {
      return currentUser;
    }

    // Employees can only access their own billing records
    if (currentUser.role === "employee") {
      if (currentUser.id !== employeeId) {
        throw this.createPermissionError(
          "Access denied: Billing record not owned by current employee",
          "BILLING_ACCESS_DENIED",
          {
            operation,
            recordEmployee: employeeId,
            currentEmployee: currentUser.id,
          },
        );
      }

      return currentUser;
    }

    throw this.createPermissionError(
      "Invalid user role for billing access",
      "INVALID_ROLE",
      { operation, userRole: currentUser.role },
    );
  }

  /**
   * Validate request management permissions
   */
  static validateRequestAccess(
    requestEmployeeId?: string,
    operation: string = "request access",
  ): User {
    const currentUser = this.validateAuthentication(operation);

    // Admins can access all requests
    if (currentUser.role === "admin") {
      return currentUser;
    }

    // Employees can only access their own requests
    if (currentUser.role === "employee") {
      if (requestEmployeeId && currentUser.id !== requestEmployeeId) {
        throw this.createPermissionError(
          "Access denied: Request not created by current employee",
          "REQUEST_ACCESS_DENIED",
          {
            operation,
            requestEmployee: requestEmployeeId,
            currentEmployee: currentUser.id,
          },
        );
      }

      return currentUser;
    }

    throw this.createPermissionError(
      "Invalid user role for request access",
      "INVALID_ROLE",
      { operation, userRole: currentUser.role },
    );
  }

  /**
   * Validate user management permissions
   */
  static validateUserManagement(
    targetUserId?: string,
    operation: string = "user management",
  ): User {
    const currentUser = this.validateAdminAccess(operation);

    // Prevent users from deleting themselves
    if (operation.includes("delete") && targetUserId === currentUser.id) {
      throw this.createPermissionError(
        "Cannot delete your own account",
        "SELF_DELETE_DENIED",
        { operation, userId: currentUser.id },
      );
    }

    return currentUser;
  }

  /**
   * Validate package management permissions
   */
  static validatePackageManagement(
    operation: string = "package management",
  ): User {
    return this.validateAdminAccess(operation);
  }

  /**
   * Log security events for auditing
   */
  static async logSecurityEvent(
    event: string,
    success: boolean,
    details?: any,
  ): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      const logEntry = {
        event,
        success,
        timestamp: new Date().toISOString(),
        user_id: currentUser?.id || "anonymous",
        user_role: currentUser?.role || "unknown",
        details: details || {},
      };

      console.log("🔐 Security Event:", logEntry);

      // In a real implementation, you would send this to a logging service
      // or store it in Firestore for audit purposes
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  /**
   * Validate data modification permissions with audit logging
   */
  static async validateAndLog<T>(
    operation: string,
    validationFn: () => User,
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      const user = validationFn();

      await this.logSecurityEvent(operation, true, {
        user_id: user.id,
        user_role: user.role,
      });

      const result = await action();

      await this.logSecurityEvent(`${operation}_completed`, true, {
        user_id: user.id,
        user_role: user.role,
      });

      return result;
    } catch (error) {
      await this.logSecurityEvent(operation, false, {
        error: error instanceof Error ? error.message : "Unknown error",
        error_code: (error as PermissionError)?.code || "UNKNOWN_ERROR",
      });

      throw error;
    }
  }
}

/**
 * Permission decorators for common operations
 */
export const requireAdmin = (operation: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      RoleValidator.validateAdminAccess(`${operation}_${propertyKey}`);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};

export const requireAuth = (operation: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      RoleValidator.validateAuthentication(`${operation}_${propertyKey}`);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};

/**
 * Helper function to check permissions without throwing errors
 */
export const checkPermission = {
  isAdmin: (): boolean => {
    try {
      RoleValidator.validateAdminAccess("permission_check");
      return true;
    } catch {
      return false;
    }
  },

  isAuthenticated: (): boolean => {
    try {
      RoleValidator.validateAuthentication("permission_check");
      return true;
    } catch {
      return false;
    }
  },

  canAccessCustomer: (customerCollectorName?: string): boolean => {
    try {
      RoleValidator.validateCustomerAccess(
        "temp",
        customerCollectorName,
        "permission_check",
      );
      return true;
    } catch {
      return false;
    }
  },
};
