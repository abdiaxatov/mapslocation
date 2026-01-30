"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment, EmployeePaymentSummary } from "@/types/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DollarSign,
    TrendingUp,
    Users,
    Receipt,
    Phone,
} from "lucide-react";
import PaymentList from "./payment-list";
import EmployeePaymentsDialog from "./employee-payments-dialog";

export default function AdminPaymentAnalytics() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<{ name: string; id: string } | null>(null);
    const [employeePhones, setEmployeePhones] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        const q = query(collection(db, "payments"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const paymentData: Payment[] = [];
            snapshot.forEach((doc) => {
                paymentData.push({ id: doc.id, ...doc.data() } as Payment);
            });
            // Sort in memory by date descending
            paymentData.sort((a, b) => {
                const aTime = a.date.toMillis ? a.date.toMillis() : a.date;
                const bTime = b.date.toMillis ? b.date.toMillis() : b.date;
                return bTime - aTime;
            });
            setPayments(paymentData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch employee phone numbers
    useEffect(() => {
        const fetchPhones = async () => {
            const uniqueEmployeeIds = [...new Set(payments.map(p => p.employeeId))];
            const phoneMap = new Map<string, string>();

            for (const employeeId of uniqueEmployeeIds) {
                try {
                    const userDoc = await import('firebase/firestore').then(mod =>
                        mod.getDoc(mod.doc(db, 'users', employeeId))
                    );
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.phoneNumber) {
                            phoneMap.set(employeeId, userData.phoneNumber);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching phone:', error);
                }
            }

            setEmployeePhones(phoneMap);
        };

        if (payments.length > 0) {
            fetchPhones();
        }
    }, [payments]);

    // Calculate statistics
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPayments = payments.length;

    // Group by employee
    const employeeSummaries: EmployeePaymentSummary[] = [];
    const employeeMap = new Map<string, EmployeePaymentSummary>();

    payments.forEach((payment) => {
        const existing = employeeMap.get(payment.employeeId);
        if (existing) {
            existing.totalAmount += payment.amount;
            existing.paymentCount += 1;
            if (
                !existing.lastPaymentDate ||
                payment.date.toMillis() > existing.lastPaymentDate.toMillis()
            ) {
                existing.lastPaymentDate = payment.date;
            }
        } else {
            employeeMap.set(payment.employeeId, {
                employeeId: payment.employeeId,
                employeeName: payment.employeeName,
                totalAmount: payment.amount,
                paymentCount: 1,
                lastPaymentDate: payment.date,
            });
        }
    });

    employeeMap.forEach((value) => employeeSummaries.push(value));
    employeeSummaries.sort((a, b) => b.totalAmount - a.totalAmount);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("uz-UZ").format(amount);
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("uz-UZ", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <p className="text-muted-foreground">Yuklanmoqda...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Jami yig'ilgan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">
                            {formatCurrency(totalAmount)} so'm
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Receipt className="h-4 w-4" />
                            To'lovlar soni
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {totalPayments}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Faol hodimlar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {employeeSummaries.length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employee Summary Table */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Hodimlar bo'yicha hisobot
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {employeeSummaries.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-muted-foreground">To'lovlar yo'q</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                                Hodim
                                            </th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                                                Jami summa
                                            </th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                                                To'lovlar
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                                Oxirgi to'lov
                                            </th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                                                Amallar
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employeeSummaries.map((summary) => (
                                            <tr
                                                key={summary.employeeId}
                                                className="border-b border-border hover:bg-secondary/50 transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                            <span className="text-sm font-medium text-primary">
                                                                {summary.employeeName.charAt(0)}
                                                            </span>
                                                        </div>
                                                        <span className="font-medium text-foreground text-sm">
                                                            {summary.employeeName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-bold text-primary">
                                                            {formatCurrency(summary.totalAmount)}
                                                        </span>
                                                        <span className="text-xs text-primary/70">so'm</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Badge variant="secondary" className="font-medium">{summary.paymentCount}</Badge>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">
                                                    {formatDate(summary.lastPaymentDate)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {employeePhones.get(summary.employeeId) ? (
                                                        <a
                                                            href={`tel:${employeePhones.get(summary.employeeId)}`}
                                                            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                                                        >
                                                            <Phone className="h-3 w-3" />
                                                            <span>{employeePhones.get(summary.employeeId)}</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedEmployee({
                                                                    name: summary.employeeName,
                                                                    id: summary.employeeId
                                                                });
                                                            }}
                                                            className="gap-1 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                            title="To'lovlarni ko'rish"
                                                        >
                                                            <Receipt className="h-4 w-4" />
                                                            <span className="text-xs">Ko'rish</span>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {employeeSummaries.map((summary) => (
                                    <div
                                        key={summary.employeeId}
                                        className="p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    <span className="text-base font-bold text-primary">
                                                        {summary.employeeName.charAt(0)}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold text-foreground text-base truncate">
                                                        {summary.employeeName}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        {summary.paymentCount} ta to'lov
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedEmployee({
                                                        name: summary.employeeName,
                                                        id: summary.employeeId
                                                    });
                                                }}
                                                className="gap-1 text-primary hover:text-primary hover:bg-primary/10 shrink-0"
                                            >
                                                <Receipt className="h-4 w-4" />
                                                <span className="text-xs">Ko'rish</span>
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Jami summa:</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-bold text-primary">
                                                        {formatCurrency(summary.totalAmount)}
                                                    </span>
                                                    <span className="text-xs text-primary/70">so'm</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Oxirgi to'lov:</span>
                                                <span className="text-sm text-foreground">
                                                    {formatDate(summary.lastPaymentDate)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* All Payments List */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        Barcha to'lovlar
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <PaymentList showEmployeeName={true} isAdmin={true} />
                </CardContent>
            </Card>

            {/* Employee Payments Dialog */}
            {selectedEmployee && (
                <EmployeePaymentsDialog
                    employeeName={selectedEmployee.name}
                    payments={payments.filter(p => p.employeeId === selectedEmployee.id)}
                    open={!!selectedEmployee}
                    onOpenChange={(open) => !open && setSelectedEmployee(null)}
                />
            )}
        </div>
    );
}
