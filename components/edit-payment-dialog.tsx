"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
    doc,
    updateDoc,
    serverTimestamp,
    collection,
    addDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment } from "@/types/types";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

interface EditPaymentDialogProps {
    payment: Payment;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function EditPaymentDialog({
    payment,
    open,
    onOpenChange,
}: EditPaymentDialogProps) {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: "",
        description: "",
        date: "",
    });

    useEffect(() => {
        if (payment) {
            const date = payment.date.toDate
                ? payment.date.toDate()
                : new Date(payment.date);
            setFormData({
                amount: payment.amount.toString(),
                description: payment.description || "",
                date: date.toISOString().split("T")[0],
            });
        }
    }, [payment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userData) return;

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Iltimos, to'g'ri miqdor kiriting");
            return;
        }

        setLoading(true);
        try {
            const paymentDate = new Date(formData.date);

            // Save history before updating
            await addDoc(collection(db, "payments", payment.id, "history"), {
                amount: payment.amount,
                description: payment.description,
                editedAt: serverTimestamp(),
                editedBy: user.uid,
                editedByName: `${userData.firstName} ${userData.lastName}`,
            });

            // Update payment
            await updateDoc(doc(db, "payments", payment.id), {
                amount,
                description: formData.description,
                date: Timestamp.fromDate(paymentDate),
                updatedAt: serverTimestamp(),
            });

            toast.success("To'lov yangilandi");
            onOpenChange(false);
        } catch (error) {
            console.error("Error updating payment:", error);
            toast.error("Yangilashda xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-foreground flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            To'lovni tahrirlash
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            O'zgarishlar tarixda saqlanadi
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-amount" className="text-foreground">
                                Miqdor (so'm) *
                            </Label>
                            <Input
                                id="edit-amount"
                                type="number"
                                step="0.01"
                                placeholder="50000"
                                value={formData.amount}
                                onChange={(e) =>
                                    setFormData({ ...formData, amount: e.target.value })
                                }
                                className="bg-secondary/50 border-border text-foreground"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-description" className="text-foreground">
                                Izoh
                            </Label>
                            <Textarea
                                id="edit-description"
                                placeholder="To'lov haqida qisqacha ma'lumot..."
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                className="bg-secondary/50 border-border text-foreground resize-none"
                                rows={3}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-date" className="text-foreground">
                                Sana *
                            </Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={formData.date}
                                onChange={(e) =>
                                    setFormData({ ...formData, date: e.target.value })
                                }
                                className="bg-secondary/50 border-border text-foreground"
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                            className="text-foreground"
                        >
                            Bekor qilish
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saqlanmoqda..." : "Saqlash"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
