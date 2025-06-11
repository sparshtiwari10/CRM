# Customer Management Page - UI Reference

## Overview

This document serves as a reference for the Customer Management page UI structure and functionality to prevent unwanted changes and maintain consistency.

## Current Page Structure

### Header Section

- **Title**: "Customer Management"
- **Description**: Dynamic based on user role
  - Admin: "Manage all customers in the system"
  - Employee: "Manage customers in your areas: [area list]"
- **Action Buttons**:
  - Import/Export (Admin only)
  - Add Customer (Admin only)

### Statistics Cards

1. **Total Customers**: Shows total count and filtered count
2. **Active Customers**: Shows count and percentage
3. **Areas**: Shows area count based on user role

### Filters Section

- **Search Bar**: Global search across customer fields
- **Status Filter**: All Status, Active, Inactive, Demo
- **Area Filter**: Available for admins only

### Customer Table Structure

#### Updated Column Layout (New Implementation)

1. **Name**: Customer name with contact info icon
2. **Address**: Full address with location icon
3. **Area**: Area assignment with area icon
4. **Previous O/S**: Previous outstanding amount
5. **Package**: Current package with pricing
6. **Current O/S**: Current outstanding amount
7. **Status**: Primary VC status with VC number indicator

#### Customer Row Details (Expandable)

- **All VC Numbers**: List of all connections (primary and secondary)
- **Billing History**: All invoices and payment records
- **Status Change Logs**: Complete audit trail of status changes
- **Request History**: Associated service requests

### Action Buttons per Customer

- **View Details**: Opens customer information modal
- **View History**: Opens transaction history modal
- **Edit**: Opens edit customer modal (permission-based)
- **Quick Actions**: Status changes, billing actions
- **Request Actions**: For employees to request changes

### Modals and Dialogs

#### Customer Details Modal

- **Contact Information**: Phone, email, address
- **Service Details**: All VC numbers, packages, pricing
- **Billing Information**: Outstanding amounts, payment history
- **Connection Management**: Primary/secondary connections with status

#### Customer History Modal

- **Transaction History**: All billing records chronologically
- **Status Change Logs**: When and who changed status
- **Service Requests**: Associated requests and approvals

#### Add/Edit Customer Modal

- **Personal Information**: Name, phone, email, address
- **Service Configuration**: Area (from managed areas), packages
- **Billing Setup**: Due dates, outstanding amounts
- **Connection Setup**: VC numbers, packages per connection

### Data Validation Rules

#### Import Customer Validation

- **Area Field**: Must exist in managed areas (firestore areas collection)
- **Package Field**: Must exist in active packages
- **VC Numbers**: Must be unique across system
- **Required Fields**: Name, phone, area, at least one connection

#### Form Validation

- **Name**: Required, minimum 2 characters
- **Phone**: Required, valid format
- **Email**: Valid email format (optional)
- **Area**: Must be selected from managed areas
- **VC Number**: Required, unique, valid format
- **Package**: Must be selected from active packages

## Permission System

### Admin Users

- **Full Access**: Can view/edit all customers
- **Add Customers**: Can create new customer records
- **Import/Export**: Can bulk import/export customer data
- **Status Changes**: Can directly change customer status
- **Area Management**: Can assign customers to any area

### Employee Users

- **Limited Access**: Can only view/edit customers in assigned areas
- **No Add Customer**: Cannot create new customer records
- **Request System**: Must request status changes through admin approval
- **Area Restriction**: Can only work with customers in their assigned areas

## Status Management System

### Status Types

- **Active**: Customer receiving service
- **Inactive**: Service suspended/disconnected
- **Demo**: Temporary/trial service

### Status Change Process

- **Admin**: Direct status changes with automatic logging
- **Employee**: Submit requests for admin approval
- **Automatic**: Status changes when requests are approved
- **Logging**: All status changes logged with timestamp and user

## Integration Points

### Area Management Integration

- **Area Dropdowns**: Use managed areas from firestore
- **Area Validation**: Ensure selected areas exist
- **Area Updates**: Reflect area changes across customer records

### Package Management Integration

- **Package Dropdowns**: Use active packages only
- **Price Updates**: Auto-populate package prices
- **Package Validation**: Ensure selected packages exist

### Request Management Integration

- **Status Requests**: Link requests to status changes
- **Approval Workflow**: Automatic status updates on request approval
- **Request Tracking**: Associate requests with customer records

## UI Component Guidelines

### Table Design

- **Responsive**: Works on mobile and desktop
- **Sortable**: Key columns support sorting
- **Expandable**: Rows expand for additional details
- **Action Menus**: Consistent dropdown menus for actions

### Modal Design

- **Consistent Layout**: All modals follow same structure
- **Form Validation**: Real-time validation with clear error messages
- **Loading States**: Proper loading indicators for async operations
- **Responsive**: Works across device sizes

### Button Placement

- **Primary Actions**: Top right of sections
- **Secondary Actions**: Dropdown menus or inline
- **Destructive Actions**: Confirmation dialogs required
- **Permission-based**: Hide/disable based on user permissions

## Data Flow

### Customer Creation

1. Admin clicks "Add Customer"
2. Modal opens with form
3. Area and package dropdowns populated from firestore
4. Form validation on submission
5. Customer created with logging

### Status Changes

1. User requests status change
2. If admin: direct change with logging
3. If employee: creates request for admin approval
4. On approval: status updated with logging

### Data Import

1. Admin uploads CSV file
2. System validates area and package fields
3. Creates customers only if validation passes
4. Reports validation errors for correction

## Security Considerations

### Data Access

- **Area-based**: Employees see only assigned area customers
- **Role-based**: Different permissions for admin vs employee
- **Audit Trail**: All changes logged with user and timestamp

### Validation

- **Server-side**: All validation enforced on backend
- **Client-side**: Immediate feedback for user experience
- **Data Integrity**: Prevents orphaned references to areas/packages

## Future Enhancements Considerations

### Scalability

- **Pagination**: Support for large customer lists
- **Search Optimization**: Indexed search for performance
- **Bulk Operations**: Additional bulk actions for efficiency

### Features

- **Advanced Filters**: More filtering options
- **Export Options**: Multiple export formats
- **Communication**: Integration with communication systems

## Maintenance Notes

### Regular Tasks

- **Data Cleanup**: Remove inactive customers periodically
- **Area Management**: Keep areas synchronized
- **Package Updates**: Ensure package references remain valid

### Monitoring

- **Performance**: Monitor page load times
- **Error Tracking**: Log and monitor errors
- **User Feedback**: Track user interaction patterns

---

**Last Updated**: Current Implementation
**Version**: 2.0 - Enhanced with Area Management and Request Integration
