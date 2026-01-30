"use client";

import { useState } from "react";
import { doc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Payment } from "@/types/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, DollarSign, Calendar, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EmployeePaymentsDialogProps {
    employeeName: string;
    payments: Payment[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function EmployeePaymentsDialog({
    employeeName,
    payments,
    open,
    onOpenChange,
}: EmployeePaymentsDialogProps) {
    const { user, userData } = useAuth();
    const [deletePayment, setDeletePayment] = useState<Payment | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

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
                action: "deleted",
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

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-foreground flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-primary">
                                        {employeeName.charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-base">{employeeName}</p>
                                    <p className="text-sm font-normal text-muted-foreground">
                                        {payments.length} ta to'lov
                                    </p>
                                </div>
                            </DialogTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* Total Summary */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Jami yig'ilgan summa</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-primary">
                                        {formatCurrency(totalAmount)}
                                    </span>
                                    <span className="text-lg text-primary/70">so'm</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Payments List */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-foreground">Barcha to'lovlar</h3>
                        {payments.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                                <p className="text-muted-foreground">To'lovlar yo'q</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-2">
                                    {payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2 mb-2">
                                                        <span className="text-xl font-bold text-primary">
                                                            {formatCurrency(payment.amount)}
                                                        </span>
                                                        <span className="text-sm text-primary/70">so'm</span>
                                                    </div>
                                                    {payment.description && (
                                                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                                            {payment.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{formatDate(payment.date)}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeletePayment(payment)}
                                                    className="gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                    title="O'chirish"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="hidden sm:inline text-xs">O'chirish</span>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

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
                                <div className="space-y-3">
                                    <div className="text-sm">
                                        <span className="font-medium text-foreground">{employeeName}</span> ning ushbu to'lovini o'chirishni xohlaysizmi?
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-bold text-primary">
                                                {formatCurrency(deletePayment.amount)}
                                            </span>
                                            <span className="text-sm text-primary/70">so'm</span>
                                        </div>
                                        {deletePayment.description && (
                                            <div className="text-sm text-foreground">{deletePayment.description}</div>
                                        )}
                                        <div className="text-xs text-muted-foreground">
                                            {formatDate(deletePayment.date)}
                                        </div>
                                    </div>
                                    <div className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-2">
                                        <span className="text-base">⚠️</span>
                                        <span>To'lov tarixga saqlanadi, lekin asosiy ro'yxatdan o'chiriladi.</span>
                                    </div>
                                </div>
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
