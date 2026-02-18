"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Payment, EmployeePaymentSummary } from "@/types/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DollarSign,
    TrendingUp,
    Users,
    Receipt,
    Phone,
    Calendar,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    PieChart,
} from "lucide-react";
import EmployeePaymentsDialog from "./employee-payments-dialog";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    AreaChart,
    Area,
} from "recharts";
import {
    format,
    startOfDay,
    endOfDay,
    isWithinInterval,
    subDays,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay
} from "date-fns";
import { uz } from "date-fns/locale";

type DateFilter = "today" | "yesterday" | "week" | "month" | "all";

export default function AdminPaymentAnalytics() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<{ name: string; id: string } | null>(null);
    const [employeePhones, setEmployeePhones] = useState<Map<string, string>>(new Map());
    const [dateFilter, setDateFilter] = useState<DateFilter>("today");

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
    }, [payments.length]);

    const filteredPayments = useMemo(() => {
        const now = new Date();
        let start: Date;
        let end: Date = endOfDay(now);

        switch (dateFilter) {
            case "today":
                start = startOfDays(now);
                break;
            case "yesterday":
                start = startOfDay(subDays(now, 1));
                end = endOfDay(subDays(now, 1));
                break;
            case "week":
                start = startOfWeek(now, { weekStartsOn: 1 });
                break;
            case "month":
                start = startOfMonth(now);
                break;
            case "all":
            default:
                return payments;
        }

        return payments.filter(p => {
            const pDate = p.date.toDate ? p.date.toDate() : new Date(p.date as any);
            return isWithinInterval(pDate, { start, end });
        });
    }, [payments, dateFilter]);

    // Calculate statistics
    const stats = useMemo(() => {
        const total = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        const count = filteredPayments.length;

        // Group by employee
        const employeeMap = new Map<string, EmployeePaymentSummary>();
        filteredPayments.forEach((payment) => {
            const existing = employeeMap.get(payment.employeeId);
            if (existing) {
                existing.totalAmount += payment.amount;
                existing.paymentCount += 1;
                const pTime = payment.date.toMillis ? payment.date.toMillis() : (payment.date as any);
                const eTime = existing.lastPaymentDate?.toMillis ? existing.lastPaymentDate.toMillis() : (existing.lastPaymentDate as any);
                if (!existing.lastPaymentDate || pTime > eTime) {
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

        const summaries = Array.from(employeeMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

        return { total, count, summaries };
    }, [filteredPayments]);

    // Chart Data Preparation
    const chartData = useMemo(() => {
        if (dateFilter === "all") return [];

        const now = new Date();
        let start: Date;
        let end: Date = endOfDay(now);

        if (dateFilter === "today") {
            start = startOfDay(now);
        } else if (dateFilter === "yesterday") {
            start = startOfDay(subDays(now, 1));
            end = endOfDay(subDays(now, 1));
        } else if (dateFilter === "week") {
            start = startOfWeek(now, { weekStartsOn: 1 });
        } else {
            start = startOfMonth(now);
        }

        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const dayTotal = payments.reduce((sum, p) => {
                const pDate = p.date.toDate ? p.date.toDate() : new Date(p.date as any);
                return isSameDay(pDate, day) ? sum + p.amount : sum;
            }, 0);

            return {
                name: format(day, dateFilter === "month" ? "d" : "EEE", { locale: uz }),
                fullDate: format(day, "d-MMMM", { locale: uz }),
                total: dayTotal,
            };
        });
    }, [payments, dateFilter]);

    const employeeChartData = useMemo(() => {
        return stats.summaries.slice(0, 10).map(s => ({
            name: s.employeeName,
            total: s.totalAmount,
        }));
    }, [stats.summaries]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("uz-UZ").format(amount);
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return format(date, "d-MMM, HH:mm", { locale: uz });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Yuklanmoqda...</p>
            </div>
        );
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Helper for start of day
    function startOfDays(date: Date) {
        return startOfDay(date);
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">To'lovlar Analitikasi</h2>
                        <p className="text-xs text-muted-foreground">Vaqt oralig'ini tanlang</p>
                    </div>
                </div>

                <div className="flex items-center bg-secondary/30 p-1 rounded-lg border border-border w-full sm:w-auto">
                    {(["today", "yesterday", "week", "month", "all"] as DateFilter[]).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setDateFilter(filter)}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-all ${dateFilter === filter
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                }`}
                        >
                            {filter === "today" && "Bugun"}
                            {filter === "yesterday" && "Kecha"}
                            {filter === "week" && "Hafta"}
                            {filter === "month" && "Oy"}
                            {filter === "all" && "Hammasi"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="relative overflow-hidden group border-none shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Jami yig'ilgan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(stats.total)} <span className="text-sm font-normal text-muted-foreground">so'm</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Tanlangan davr uchun umumiy mablag'
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-none shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            To'lovlar soni
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.count} <span className="text-sm font-normal text-muted-foreground">ta</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Muvaffaqiyatli amalga oshirilgan tranzaksiyalar
                        </p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-none shadow-lg sm:col-span-2 lg:col-span-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            Faol hodimlar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {stats.summaries.length} <span className="text-sm font-normal text-muted-foreground">kishi</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Shu davrda to'lov kiritgan hodimlar
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                Kunlik dinamika
                            </CardTitle>
                            <CardDescription>Mablag' tushishi trendi</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748B' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748B' }}
                                        tickFormatter={(value) => `${value / 1000}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: any) => [`${formatCurrency(value)} so'm`, 'Summa']}
                                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorTotal)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <PieChart className="h-4 w-4 text-primary" />
                                Hodimlar reytingi (Top 10)
                            </CardTitle>
                            <CardDescription>Eng ko'p mablag' yig'ganlar</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={employeeChartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#64748B' }}
                                        width={100}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                                        formatter={(value: any) => [`${formatCurrency(value)} so'm`, 'Jami']}
                                    />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]} animationDuration={2000}>
                                        {employeeChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employee Summary Table */}
            <Card className="bg-card border-border shadow-md overflow-hidden">
                <CardHeader className="border-b border-border bg-secondary/10">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Hodimlar bo'yicha hisobot
                        </CardTitle>
                        <Badge variant="outline" className="bg-background">
                            {stats.summaries.length} ta hodim
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {stats.summaries.length === 0 ? (
                        <div className="text-center py-20">
                            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                            <p className="text-muted-foreground font-medium">Bu davr uchun to'lovlar mavjud emas</p>
                            <Button
                                variant="link"
                                onClick={() => setDateFilter("all")}
                                className="text-primary mt-2"
                            >
                                Barcha to'lovlarni ko'rish
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-secondary/50">
                                            <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Hodim
                                            </th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Jami summa
                                            </th>
                                            <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                To'lovlar
                                            </th>
                                            <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Oxirgi to'lov
                                            </th>
                                            <th className="text-right py-3 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Amallar
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {stats.summaries.map((summary) => (
                                            <tr
                                                key={summary.employeeId}
                                                className="hover:bg-secondary/20 transition-colors group"
                                            >
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm transition-transform group-hover:scale-105">
                                                            <span className="text-base font-bold text-primary">
                                                                {summary.employeeName.charAt(0)}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-foreground text-sm">
                                                                {summary.employeeName}
                                                            </span>
                                                            {employeePhones.get(summary.employeeId) && (
                                                                <a
                                                                    href={`tel:${employeePhones.get(summary.employeeId)}`}
                                                                    className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors"
                                                                >
                                                                    <Phone className="h-3 w-3" />
                                                                    {employeePhones.get(summary.employeeId)}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-bold text-primary tracking-tight">
                                                            {formatCurrency(summary.totalAmount)}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold text-primary/60">so'm</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <Badge variant="secondary" className="px-2 py-0.5 rounded-full font-bold">
                                                        {summary.paymentCount}
                                                    </Badge>
                                                </td>
                                                <td className="py-4 px-6 text-sm text-muted-foreground font-medium">
                                                    {formatDate(summary.lastPaymentDate)}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-end">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedEmployee({
                                                                    name: summary.employeeName,
                                                                    id: summary.employeeId
                                                                });
                                                            }}
                                                            className="h-9 px-4 gap-2 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                                        >
                                                            <Receipt className="h-4 w-4" />
                                                            <span className="text-xs font-semibold">Tafsilotlar</span>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden p-4 space-y-4">
                                {stats.summaries.map((summary) => (
                                    <div
                                        key={summary.employeeId}
                                        className="p-4 rounded-xl border border-border bg-secondary/10 hover:shadow-md transition-all active:scale-[0.98]"
                                        onClick={() => {
                                            setSelectedEmployee({
                                                name: summary.employeeName,
                                                id: summary.employeeId
                                            });
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                                    <span className="text-lg font-bold text-primary">
                                                        {summary.employeeName.charAt(0)}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-foreground text-sm truncate">
                                                        {summary.employeeName}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-bold bg-background">
                                                            {summary.paymentCount} ta to'lov
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-primary">
                                                    {formatCurrency(summary.totalAmount)}
                                                </div>
                                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">so'm</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                            <p className="text-[11px] text-muted-foreground font-medium">
                                                Oxirgi: {formatDate(summary.lastPaymentDate)}
                                            </p>
                                            <div className="flex items-center gap-1 text-primary text-xs font-bold">
                                                Batafsil <ChevronRight className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
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

