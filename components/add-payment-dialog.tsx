"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus } from "lucide-react";

export default function AddPaymentDialog() {
    const { user, userData } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
    });

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

            await addDoc(collection(db, "payments"), {
                employeeId: user.uid,
                employeeName: `${userData.firstName} ${userData.lastName}`,
                amount,
                description: formData.description,
                date: Timestamp.fromDate(paymentDate),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            toast.success("To'lov muvaffaqiyatli qo'shildi");
            setFormData({
                amount: "",
                description: "",
                date: new Date().toISOString().split("T")[0],
            });
            setOpen(false);
        } catch (error) {
            console.error("Error adding payment:", error);
            toast.error("To'lovni qo'shishda xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">To'lov qo'shish</span>
                    <span className="sm:hidden">Qo'shish</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-foreground flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Yangi to'lov qo'shish
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Odamlardan olingan pulni kiriting
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount" className="text-foreground">
                                Miqdor (so'm) *
                            </Label>
                            <Input
                                id="amount"
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
                            <Label htmlFor="description" className="text-foreground">
                                Izoh
                            </Label>
                            <Textarea
                                id="description"
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
                            <Label htmlFor="date" className="text-foreground">
                                Sana *
                            </Label>
                            <Input
                                id="date"
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
                            onClick={() => setOpen(false)}
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
