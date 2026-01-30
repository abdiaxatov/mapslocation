import { Timestamp } from "firebase/firestore";

export interface Payment {
    id: string;
    employeeId: string;
    employeeName: string;
    amount: number;
    description: string;
    date: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface PaymentHistory {
    id: string;
    amount: number;
    description: string;
    editedAt: Timestamp;
    editedBy: string;
    editedByName: string;
}

export interface PaymentStats {
    totalAmount: number;
    paymentCount: number;
    lastPaymentDate?: Timestamp;
}

export interface EmployeePaymentSummary {
    employeeId: string;
    employeeName: string;
    totalAmount: number;
    paymentCount: number;
    lastPaymentDate?: Timestamp;
}
