
export enum LoanStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNING = 'RETURNING',
  COMPLETED = 'COMPLETED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  designation: string;
  department: string;
  verified: boolean;
  isAdmin?: boolean;
}

export interface Asset {
  id: string;
  registrationNo: string;
  description: string;
  status: 'AVAILABLE' | 'LOANED' | 'MAINTENANCE';
  createdAt: string;
}

export interface KEWPA9Form {
  id: string;
  userId: string;
  assetName: string;
  registrationNo: string;
  serialNo: string;
  purpose: string;
  locationTo: string;
  dateOut: string;
  dateExpectedIn: string;
  dateActualIn?: string;
  status: LoanStatus;
  createdAt: string;
  
  // Signatures & Approval
  borrowerName?: string;
  signature?: string; // Borrower Loan Signature
  
  approverName?: string;
  approverDate?: string;
  adminSignature?: string; // Admin Approval Signature
  
  returnUserSignature?: string; // Borrower Return Signature
  returnAdminSignature?: string; // Admin Receipt Signature
  
  remarks?: string; // Admin comments for rejection
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
