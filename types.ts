
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

export interface AssetItem {
  name: string;
  regNo: string;
}

export interface KEWPA9Form {
  id: string;
  userId: string;
  items: AssetItem[]; // List of assets for this loan
  assetName: string; // Kept for sheet compatibility (joined names)
  registrationNo: string; // Kept for sheet compatibility (joined numbers)
  serialNo: string;
  purpose: string;
  locationTo: string;
  coe?: string;
  dateOut: string;
  dateExpectedIn: string;
  dateActualIn?: string;
  status: LoanStatus;
  createdAt: string;
  
  // Signatures & Approval
  borrowerName?: string;
  signature?: string;
  
  approverName?: string;
  approverDate?: string;
  adminSignature?: string;
  
  returnUserSignature?: string;
  returnAdminSignature?: string;
  
  remarks?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
