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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus, Calculator, Calendar, FileText, X } from "lucide-react";

export default function AddPaymentDialog({ trigger }: { trigger?: React.ReactNode }) {
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
                {trigger || (
                    <Button className="h-14 sm:h-16 rounded-3xl gap-3 px-8 text-lg font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                        <Plus className="h-6 w-6 stroke-[3]" />
                        TO'LOV QO'SHISH
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-card border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <Plus className="h-8 w-8 text-primary stroke-[3]" />
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-2xl font-black tracking-tighter">Yangi to'lov</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-muted-foreground">
                                Olingan mablag'ni hisobga qo'shish
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="px-8 py-4 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                To'lov miqdori (UZS)
                            </Label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-focus-within:bg-primary group-focus-within:text-white transition-all">
                                    <Calculator className="h-5 w-5" />
                                </div>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="Masalan: 50 000"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="h-16 pl-16 rounded-2xl bg-secondary/50 border-none text-xl font-black focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                Sana
                            </Label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="h-14 pl-12 rounded-2xl bg-secondary/50 border-none font-bold focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                Qo'shimcha izoh
                            </Label>
                            <div className="relative group">
                                <div className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <Textarea
                                    id="description"
                                    placeholder="Kimdan olindi yoki nima uchun..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="min-h-[100px] pl-12 pt-4 rounded-2xl bg-secondary/50 border-none font-bold focus-visible:ring-2 focus-visible:ring-primary/20 transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-8 pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-16 rounded-[1.5rem] text-lg font-black shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    SAQLANMOQDA...
                                </>
                            ) : (
                                "TO'LOVNI SAQLASH"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
