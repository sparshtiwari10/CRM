# Customer Authentication Implementation Guide

## Overview

This document outlines the approach to implement phone number-based OTP authentication for customers in the AGV Cable TV Management System, allowing customers to access their billing information, service status, and make payments through a dedicated customer portal.

## Technology Stack for Customer Authentication

### Firebase Authentication

- **Phone Authentication**: Firebase Auth Phone Provider for OTP-based login
- **Security Rules**: Firestore security rules for customer data access
- **Session Management**: Firebase Auth state management for customer sessions

### Implementation Architecture

```
Customer Portal Architecture:
┌─────────────────────���───────────────────────┐
│                 Customer App                │
├─────────────────────────────────────────────┤
│  Phone OTP Auth  │  Customer Dashboard      │
│  - Phone Input   │  - Billing History       │
│  - OTP Verify    │  - Current Outstanding   │
│  - Auto Login    │  - Service Status        │
│                  │  - Payment Options       │
├─────────────────────────────────────────────┤
│           Firebase Authentication           │
│           Firestore Customer Data           │
└─────────────────────────────────────────────┘
```

## Phase 1: Core Authentication Setup

### 1.1 Firebase Phone Authentication Configuration

#### Enable Phone Authentication in Firebase Console

```javascript
// Firebase Console Configuration Steps:
1. Go to Authentication → Sign-in method
2. Enable "Phone" provider
3. Add authorized domains for production
4. Configure reCAPTCHA for web (invisible reCAPTCHA recommended)
5. Set up SMS usage limits and billing
```

#### Phone Authentication Service

```typescript
// src/services/customerAuthService.ts
import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from "firebase/auth";

export class CustomerAuthService {
  private auth = getAuth();
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  // Initialize reCAPTCHA verifier
  initializeRecaptcha(containerId: string): void {
    this.recaptchaVerifier = new RecaptchaVerifier(
      containerId,
      {
        size: "invisible",
        callback: (response: any) => {
          console.log("reCAPTCHA verified");
        },
      },
      this.auth,
    );
  }

  // Send OTP to phone number
  async sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
    if (!this.recaptchaVerifier) {
      throw new Error("reCAPTCHA not initialized");
    }

    // Ensure phone number is in international format
    const formattedPhone = phoneNumber.startsWith("+91")
      ? phoneNumber
      : `+91${phoneNumber}`;

    return await signInWithPhoneNumber(
      this.auth,
      formattedPhone,
      this.recaptchaVerifier,
    );
  }

  // Verify OTP and complete login
  async verifyOTP(
    confirmationResult: ConfirmationResult,
    otpCode: string,
  ): Promise<UserCredential> {
    return await confirmationResult.confirm(otpCode);
  }

  // Get current customer data
  async getCurrentCustomer(): Promise<Customer | null> {
    const user = this.auth.currentUser;
    if (!user) return null;

    const customerDoc = await getDoc(doc(db, "customers", user.phoneNumber!));

    return customerDoc.exists() ? (customerDoc.data() as Customer) : null;
  }
}
```

### 1.2 Customer Data Structure Enhancement

#### Enhanced Customer Interface

```typescript
// src/types/customer.ts
export interface CustomerPortalData {
  // Authentication
  phoneNumber: string; // Primary key for customer authentication
  isPortalActive: boolean; // Can customer access portal
  lastLoginAt?: Date; // Track customer login activity

  // Portal Access Settings
  portalPermissions: {
    viewBilling: boolean; // Can view billing history
    viewStatus: boolean; // Can view service status
    makePayments: boolean; // Can initiate payments
    submitRequests: boolean; // Can submit service requests
  };

  // Billing Portal Data
  billingPortalData: {
    currentBill: {
      amount: number;
      dueDate: Date;
      status: "paid" | "pending" | "overdue";
    };
    paymentHistory: PaymentRecord[];
    outstandingAmount: number;
  };

  // Service Portal Data
  servicePortalData: {
    primaryConnection: ConnectionStatus;
    secondaryConnections: ConnectionStatus[];
    lastServiceDate?: Date;
    nextServiceDate?: Date;
  };
}

export interface ConnectionStatus {
  vcNumber: string;
  status: "active" | "inactive" | "suspended";
  package: string;
  monthlyAmount: number;
  lastPaymentDate?: Date;
}
```

## Phase 2: Customer Portal Frontend

### 2.1 Customer Authentication Pages

#### Customer Login Page

```typescript
// src/pages/customer/CustomerLogin.tsx
export default function CustomerLogin() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const customerAuth = new CustomerAuthService();

  const handleSendOtp = async () => {
    try {
      setIsLoading(true);
      customerAuth.initializeRecaptcha('recaptcha-container');
      const confirmation = await customerAuth.sendOTP(phoneNumber);
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult) return;

    try {
      setIsLoading(true);
      await customerAuth.verifyOTP(confirmationResult, otpCode);
      // Redirect to customer dashboard
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Customer login form with OTP */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
```

#### Customer Dashboard

```typescript
// src/pages/customer/CustomerDashboard.tsx
export default function CustomerDashboard() {
  const [customerData, setCustomerData] = useState<CustomerPortalData | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNavbar />
      <div className="max-w-4xl mx-auto p-4">
        {/* Service Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ServiceStatusCard />
          <CurrentBillCard />
          <PaymentHistoryCard />
        </div>

        {/* Recent Activity */}
        <RecentActivitySection />
      </div>
    </div>
  );
}
```

### 2.2 Customer Portal Components

#### Service Status Component

```typescript
// src/components/customer/ServiceStatusCard.tsx
export function ServiceStatusCard({ connection }: { connection: ConnectionStatus }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">VC: {connection.vcNumber}</h3>
          <Badge variant={connection.status === 'active' ? 'default' : 'destructive'}>
            {connection.status}
          </Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div>Package: {connection.package}</div>
          <div>Monthly: ₹{connection.monthlyAmount}</div>
          {connection.lastPaymentDate && (
            <div>Last Payment: {new Date(connection.lastPaymentDate).toLocaleDateString()}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Phase 3: Backend Integration

### 3.1 Firestore Security Rules for Customers

```javascript
// Enhanced firestore.rules for customer access
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Customer authentication helper
    function isCustomer() {
      return request.auth != null &&
             request.auth.token.phone_number != null;
    }

    // Customer can only access their own data
    function isOwnCustomerData() {
      return isCustomer() &&
             request.auth.token.phone_number == resource.data.phoneNumber;
    }

    // Customer portal data access
    match /customers/{customerId} {
      // Employees and admins maintain existing access
      allow read, write: if isAdmin() && isActiveUser();
      allow read, write: if isAuthenticated() &&
                        isActiveUser() &&
                        canAccessArea(resource.data.collectorName);

      // Customers can read their own data
      allow read: if isCustomer() &&
                 resource.data.phoneNumber == request.auth.token.phone_number &&
                 resource.data.isPortalActive == true;
    }

    // Customer billing history
    match /customerBillingHistory/{recordId} {
      // Existing admin/employee access
      allow read: if isAdmin() && isActiveUser();
      allow read: if isAuthenticated() &&
                 isActiveUser() &&
                 canAccessArea(resource.data.area);

      // Customer access to their own billing
      allow read: if isCustomer() &&
                 resource.data.customerPhone == request.auth.token.phone_number;
    }

    // Customer service requests
    match /customerRequests/{requestId} {
      // Customers can create and read their own requests
      allow read, create: if isCustomer() &&
                         request.auth.token.phone_number == resource.data.customerPhone;

      // Admin/employee access for processing
      allow read, write: if isAdmin() && isActiveUser();
    }
  }
}
```

### 3.2 Customer Data Migration

#### Migration Script for Existing Customers

```typescript
// scripts/enableCustomerPortal.ts
export async function enableCustomerPortalAccess() {
  const customers = await CustomerService.getAllCustomers();

  for (const customer of customers) {
    // Add portal access fields to existing customers
    const portalData: Partial<CustomerPortalData> = {
      isPortalActive: true, // Enable portal for all customers
      portalPermissions: {
        viewBilling: true,
        viewStatus: true,
        makePayments: true,
        submitRequests: true,
      },
      billingPortalData: {
        currentBill: {
          amount: customer.packageAmount || 0,
          dueDate: calculateNextDueDate(customer.billDueDate),
          status: customer.currentOutstanding > 0 ? "pending" : "paid",
        },
        paymentHistory: [],
        outstandingAmount: customer.currentOutstanding || 0,
      },
      servicePortalData: {
        primaryConnection: {
          vcNumber: customer.vcNumber,
          status: customer.status,
          package: customer.currentPackage,
          monthlyAmount: customer.packageAmount,
          lastPaymentDate: customer.lastPaymentDate,
        },
        secondaryConnections:
          customer.connections?.filter((c) => !c.isPrimary) || [],
      },
    };

    await CustomerService.updateCustomer(customer.id, portalData);
  }
}
```

## Phase 4: Payment Integration

### 4.1 Payment Gateway Integration

#### Razorpay Integration for Customer Payments

```typescript
// src/services/paymentService.ts
export class CustomerPaymentService {
  private razorpay: any;

  constructor() {
    // Initialize Razorpay (load script dynamically)
    this.loadRazorpayScript();
  }

  async initiatePayment(
    amount: number,
    customerData: CustomerPortalData,
  ): Promise<void> {
    const options = {
      key: process.env.VITE_RAZORPAY_KEY_ID,
      amount: amount * 100, // Amount in paisa
      currency: "INR",
      name: "AGV Cable TV",
      description: "Cable TV Bill Payment",
      prefill: {
        contact: customerData.phoneNumber,
        name: customerData.name,
      },
      handler: async (response: any) => {
        // Verify payment and update customer record
        await this.verifyAndUpdatePayment(response, customerData);
      },
      theme: {
        color: "#3B82F6",
      },
    };

    const razorpayInstance = new this.razorpay(options);
    razorpayInstance.open();
  }

  private async verifyAndUpdatePayment(
    paymentResponse: any,
    customerData: CustomerPortalData,
  ): Promise<void> {
    // Verify payment with backend
    // Update customer billing status
    // Create payment record
  }
}
```

### 4.2 Customer Payment History

```typescript
// src/components/customer/PaymentHistory.tsx
export function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="flex justify-between items-center p-3 border rounded">
              <div>
                <div className="font-medium">₹{payment.amount}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(payment.date).toLocaleDateString()}
                </div>
              </div>
              <Badge variant={payment.status === 'completed' ? 'default' : 'destructive'}>
                {payment.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Phase 5: Admin Integration

### 5.1 Customer Portal Management for Admins

#### Admin Customer Portal Settings

```typescript
// src/components/admin/CustomerPortalSettings.tsx
export function CustomerPortalSettings({ customer }: { customer: Customer }) {
  const [portalSettings, setPortalSettings] = useState(customer.portalPermissions);

  const updatePortalAccess = async (settings: PortalPermissions) => {
    await CustomerService.updateCustomer(customer.id, {
      portalPermissions: settings,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Portal Access</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Portal Access</Label>
            <Switch
              checked={customer.isPortalActive}
              onCheckedChange={(checked) =>
                updatePortalAccess({ ...portalSettings, isPortalActive: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>View Billing</Label>
            <Switch
              checked={portalSettings.viewBilling}
              onCheckedChange={(checked) =>
                updatePortalAccess({ ...portalSettings, viewBilling: checked })
              }
            />
          </div>

          {/* Additional permission toggles */}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.2 Customer Activity Monitoring

```typescript
// src/components/admin/CustomerActivityLog.tsx
export function CustomerActivityLog() {
  const [activities, setActivities] = useState<CustomerActivity[]>([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Portal Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>{activity.customerName}</TableCell>
                <TableCell>{activity.action}</TableCell>
                <TableCell>{new Date(activity.timestamp).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={activity.success ? 'default' : 'destructive'}>
                    {activity.success ? 'Success' : 'Failed'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

## Phase 6: Implementation Roadmap

### Week 1-2: Foundation Setup

1. **Firebase Phone Auth Configuration**

   - Enable phone authentication in Firebase Console
   - Configure reCAPTCHA settings
   - Set up SMS billing and limits

2. **Customer Authentication Service**

   - Implement CustomerAuthService
   - Create phone number validation
   - Build OTP verification flow

3. **Customer Data Structure Enhancement**
   - Add portal access fields to Customer interface
   - Create migration script for existing customers
   - Update Firestore security rules

### Week 3-4: Customer Portal Development

1. **Customer Login System**

   - Build phone number input with country code
   - Implement OTP verification interface
   - Add login state management

2. **Customer Dashboard**

   - Create customer dashboard layout
   - Build service status components
   - Implement billing information display

3. **Mobile Optimization**
   - Ensure responsive design for mobile devices
   - Optimize for touch interactions
   - Test on various screen sizes

### Week 5-6: Payment Integration

1. **Payment Gateway Setup**

   - Integrate Razorpay for online payments
   - Configure payment success/failure handling
   - Build payment history tracking

2. **Payment UI Components**
   - Create payment initiation interface
   - Build payment confirmation screens
   - Implement payment history display

### Week 7-8: Admin Integration & Testing

1. **Admin Portal Updates**

   - Add customer portal management to admin interface
   - Create customer activity monitoring
   - Build portal permission management

2. **Testing & Security**

   - Comprehensive testing of authentication flow
   - Security audit of customer data access
   - Performance testing with multiple concurrent users

3. **Documentation & Training**
   - Update user guides for customer portal
   - Create admin training materials
   - Document troubleshooting procedures

## Security Considerations

### Data Protection

- **Phone Number Security**: Hash and encrypt phone numbers in database
- **OTP Security**: Implement rate limiting for OTP requests
- **Session Management**: Use secure session tokens with expiration
- **Data Access**: Strict firestore rules ensuring customers only access their data

### Privacy Compliance

- **Data Minimization**: Only collect necessary customer data
- **Consent Management**: Explicit consent for portal access
- **Data Retention**: Clear policies for customer data retention
- **Right to Deletion**: Allow customers to delete their portal accounts

### Fraud Prevention

- **Rate Limiting**: Limit OTP requests per phone number
- **Device Tracking**: Monitor unusual login patterns
- **Payment Security**: Secure payment processing with PCI compliance
- **Activity Monitoring**: Track and alert on suspicious activities

## Cost Considerations

### Firebase SMS Costs

- **OTP SMS**: Approximately ₹0.60 per SMS in India
- **Usage Estimation**: For 1000 customers logging in monthly = ₹600/month
- **Optimization**: Implement login session persistence to reduce OTP usage

### Development Resources

- **Development Time**: 6-8 weeks for full implementation
- **Testing Time**: 2-3 weeks for comprehensive testing
- **Maintenance**: Ongoing updates and security monitoring

### Infrastructure

- **Firebase Plan**: Upgrade to paid plan for production SMS usage
- **Payment Gateway**: Razorpay charges ~2% per transaction
- **Monitoring**: Firebase Analytics for customer portal usage tracking

## Success Metrics

### Customer Adoption

- **Portal Registration Rate**: % of customers who activate portal access
- **Login Frequency**: Average logins per customer per month
- **Feature Usage**: Which portal features are most used

### Business Impact

- **Payment Collection**: Improvement in payment collection rates
- **Customer Service**: Reduction in customer service calls
- **Customer Satisfaction**: Customer feedback on portal experience

### Technical Metrics

- **Authentication Success Rate**: % of successful OTP verifications
- **Payment Success Rate**: % of successful online payments
- **Portal Performance**: Page load times and responsiveness

This comprehensive implementation guide provides a roadmap for adding customer authentication and portal access to the AGV Cable TV Management System, enabling customers to self-serve their billing and service needs while maintaining security and administrative control.
