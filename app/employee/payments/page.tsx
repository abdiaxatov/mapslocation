"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import AddPaymentDialog from "@/components/add-payment-dialog";
import PaymentList from "@/components/payment-list";

export default function EmployeePaymentsPage() {
    const { user, userData, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || !userData)) {
            router.push("/");
            return;
        }

        if (!loading && userData && userData.role === "admin") {
            router.push("/admin");
            return;
        }
    }, [user, userData, loading, router]);

    if (loading || !userData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border px-4 h-16 sticky top-0 z-50 flex items-center">
                <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/employee")}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="font-semibold text-foreground">Mening to'lovlarim</h1>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                {userData.firstName} {userData.lastName}
                            </p>
                        </div>
                    </div>
                    <AddPaymentDialog />
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto p-4">
                <PaymentList employeeId={user?.uid} />
            </main>
        </div>
    );
}
