"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment, PaymentHistory } from "@/types/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Clock, User, DollarSign, Trash2 } from "lucide-react";

interface PaymentHistoryDialogProps {
    payment: Payment;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function PaymentHistoryDialog({
    payment,
    open,
    onOpenChange,
}: PaymentHistoryDialogProps) {
    const [history, setHistory] = useState<PaymentHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!payment.id) return;

        const q = query(
            collection(db, "payments", payment.id, "history"),
            orderBy("editedAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const historyData: PaymentHistory[] = [];
            snapshot.forEach((doc) => {
                historyData.push({ id: doc.id, ...doc.data() } as PaymentHistory);
            });
            setHistory(historyData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [payment.id]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString("uz-UZ", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("uz-UZ").format(amount);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        To'lov tarixi
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Barcha o'zgarishlar va tahrirlash tarixi
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Current Value */}
                    <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-primary text-primary-foreground">
                                Joriy qiymat
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            <span className="text-2xl font-bold text-primary">
                                {formatCurrency(payment.amount)} so'm
                            </span>
                        </div>
                        {payment.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                                {payment.description}
                            </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Yangilangan: {formatDate(payment.updatedAt)}</span>
                        </div>
                    </div>

                    {/* History */}
                    {loading ? (
                        <p className="text-center text-muted-foreground py-4">
                            Yuklanmoqda...
                        </p>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8">
                            <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-muted-foreground">
                                Tahrirlash tarixi yo'q
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Bu to'lov hali tahrir qilinmagan
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-sm font-medium text-foreground mb-3">
                                Oldingi qiymatlar
                            </h3>
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-3">
                                    {history.map((record, index) => (
                                        <div
                                            key={record.id}
                                            className={`p-4 rounded-lg border ${record.action === "deleted"
                                                ? "bg-destructive/5 border-destructive/20"
                                                : "bg-secondary/30 border-border"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${record.action === "deleted"
                                                        ? "bg-destructive/10"
                                                        : "bg-primary/10"
                                                        }`}>
                                                        {record.action === "deleted" ? (
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        ) : (
                                                            <History className="h-4 w-4 text-primary" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {record.editedByName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDate(record.editedAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {record.action === "deleted" && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        O'chirilgan
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="space-y-2 pl-10">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-lg font-bold text-primary">
                                                        {formatCurrency(record.amount)}
                                                    </span>
                                                    <span className="text-sm text-primary/70">so'm</span>
                                                </div>
                                                {record.description && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {record.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </DialogContent >
        </Dialog >
    );
}
