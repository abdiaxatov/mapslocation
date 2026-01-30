"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
    collection,
    query,
    where,
    onSnapshot,
    deleteDoc,
    doc,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment } from "@/types/types";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DollarSign,
    Calendar,
    Pencil,
    Trash2,
    History,
    TrendingUp,
} from "lucide-react";
import EditPaymentDialog from "./edit-payment-dialog";
import PaymentHistoryDialog from "./payment-history-dialog";

interface PaymentListProps {
    employeeId?: string;
    showEmployeeName?: boolean;
    isAdmin?: boolean;
}

export default function PaymentList({
    employeeId,
    showEmployeeName = false,
    isAdmin = false,
}: PaymentListProps) {
    const { user, userData } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [editPayment, setEditPayment] = useState<Payment | null>(null);
    const [historyPayment, setHistoryPayment] = useState<Payment | null>(null);
    const [deletePayment, setDeletePayment] = useState<Payment | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const targetEmployeeId = employeeId || user?.uid;

    useEffect(() => {
        if (!targetEmployeeId) return;

        const q = query(
            collection(db, "payments"),
            where("employeeId", "==", targetEmployeeId)
        );

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
    }, [targetEmployeeId]);

    const handleDelete = async () => {
        if (!deletePayment || !user || !userData) return;
        setDeleteLoading(true);

        try {
            // First, save deletion record to history
            await addDoc(collection(db, "payments", deletePayment.id, "history"), {
                amount: deletePayment.amount,
                description: deletePayment.description,
                editedAt: serverTimestamp(),
                editedBy: user.uid,
                editedByName: `${userData.firstName} ${userData.lastName}`,
                action: "deleted", // Mark as deletion
            });

            // Then delete the payment
            await deleteDoc(doc(db, "payments", deletePayment.id));

            toast.success("To'lov o'chirildi va tarixga saqlandi");
            setDeletePayment(null);
        } catch (error) {
            console.error("Error deleting payment:", error);
            toast.error("O'chirishda xatolik yuz berdi");
        } finally {
            setDeleteLoading(false);
        }
    };

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("uz-UZ", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("uz-UZ").format(amount);
    };

    if (loading) {
        return (
            <Card className="bg-card border-border">
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Yuklanmoqda...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="bg-card border-border">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            To'lovlar
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-sm text-muted-foreground">Jami:</span>
                            <span className="text-lg font-bold text-primary">
                                {formatCurrency(totalAmount)} so'm
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {payments.length === 0 ? (
                        <div className="text-center py-12">
                            <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-muted-foreground">To'lovlar yo'q</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px] pr-4">
                            <div className="space-y-3">
                                {payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="p-4 sm:p-5 rounded-xl border border-border bg-gradient-to-br from-secondary/30 via-secondary/20 to-transparent hover:from-secondary/50 hover:via-secondary/30 transition-all duration-200 group"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                            <div className="flex-1 min-w-0 space-y-2">
                                                {/* Amount */}
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="text-2xl sm:text-3xl font-bold text-primary">
                                                        {formatCurrency(payment.amount)}
                                                    </span>
                                                    <span className="text-sm text-primary/70">so'm</span>
                                                </div>

                                                {/* Employee Name (if shown) */}
                                                {showEmployeeName && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <span className="text-xs font-semibold text-primary">
                                                                {payment.employeeName.split(' ').map(n => n[0]).join('')}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {payment.employeeName}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Description */}
                                                {payment.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {payment.description}
                                                    </p>
                                                )}

                                                {/* Date */}
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>{formatDate(payment.date)}</span>
                                                </div>
                                            </div>


                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1 shrink-0 sm:self-start">
                                                {/* History - Always visible */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setHistoryPayment(payment)}
                                                    className="gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                                >
                                                    <History className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Tarix</span>
                                                </Button>

                                                {/* Edit - For employees (own payments) and admins (all payments) */}
                                                {(!employeeId || isAdmin) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditPayment(payment)}
                                                        className="gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        <span className="hidden sm:inline">Tahrirlash</span>
                                                    </Button>
                                                )}

                                                {/* Delete - Only for admins */}
                                                {isAdmin && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeletePayment(payment)}
                                                        className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="hidden sm:inline">O'chirish</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            {editPayment && (
                <EditPaymentDialog
                    payment={editPayment}
                    open={!!editPayment}
                    onOpenChange={(open) => !open && setEditPayment(null)}
                />
            )}

            {/* History Dialog */}
            {historyPayment && (
                <PaymentHistoryDialog
                    payment={historyPayment}
                />
            )}


            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletePayment} onOpenChange={(open) => !open && setDeletePayment(null)}>
                <AlertDialogContent className="bg-card border-border max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                                <Trash2 className="h-5 w-5 text-destructive" />
                            </div>
                            To'lovni o'chirish
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground space-y-3 pt-2">
                            {deletePayment && (
                                <>
                                    <p>
                                        Ushbu to'lovni o'chirishni xohlaysizmi?
                                    </p>
                                    <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-bold text-primary">
                                                {formatCurrency(deletePayment.amount)}
                                            </span>
                                            <span className="text-sm text-primary/70">so'm</span>
                                        </div>
                                        {deletePayment.description && (
                                            <p className="text-sm text-foreground">{deletePayment.description}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(deletePayment.date)}
                                        </p>
                                    </div>
                                    <p className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-2">
                                        <span className="text-base">⚠️</span>
                                        <span>To'lov tarixga saqlanadi, lekin asosiy ro'yxatdan o'chiriladi.</span>
                                    </p>
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel className="bg-secondary text-foreground border-border">
                            Bekor qilish
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteLoading ? "O'chirilmoqda..." : "O'chirish"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
