"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  LogOut,
  MapPin,
  User,
  Briefcase,
  Navigation,
  Shield,
  Wifi,
  WifiOff,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Receipt,
  LayoutDashboard,
  Target,
  MapPinned,
  History
} from "lucide-react";
import { toast } from "sonner";
import YandexMap from "@/components/ui/yandex-map";
import AddPaymentDialog from "@/components/add-payment-dialog";

export default function EmployeeDashboard() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dash" | "map" | "payments">("dash");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [totalPayments, setTotalPayments] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || !userData)) {
      router.push("/");
      return;
    }

    if (userData) {
      setLocationEnabled(userData.locationEnabled || false);
    }
  }, [user, userData, loading, router]);

  // Fetch payment statistics
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "payments"),
      where("employeeId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      let count = 0;
      snapshot.forEach((doc) => {
        const payment = doc.data();
        total += payment.amount || 0;
        count++;
      });
      setTotalPayments(total);
      setPaymentCount(count);
    });

    return () => unsubscribe();
  }, [user]);

  const updateLocation = useCallback(async (lat: number, lng: number) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        currentLocation: {
          lat,
          lng,
          timestamp: serverTimestamp()
        }
      });
      setCurrentLocation({ lat, lng });
    } catch (error) {
      console.error("Joylashuvni yangilashda xatolik:", error);
    }
  }, [user]);

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Brauzeringiz joylashuvni qo'llab-quvvatlamaydi");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateLocation(latitude, longitude);
        setLocationError(null);
      },
      (error) => {
        console.error("Joylashuv xatoligi:", error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Joylashuv ruxsati rad etildi");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Joylashuv ma'lumotlari mavjud emas");
            break;
          case error.TIMEOUT:
            setLocationError("Joylashuv so'rovi vaqti tugadi");
            break;
          default:
            setLocationError("Noma'lum xatolik yuz berdi");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );

    return watchId;
  }, [updateLocation]);

  useEffect(() => {
    let watchId: number | undefined;

    if (locationEnabled && user) {
      watchId = startLocationTracking();
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [locationEnabled, user, startLocationTracking]);

  const handleToggleLocation = async (enabled: boolean) => {
    if (!user) return;

    setIsUpdating(true);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        locationEnabled: enabled
      });

      setLocationEnabled(enabled);

      if (enabled) {
        toast.success("Joylashuv yoqildi - Admin sizni ko'ra oladi");
      } else {
        toast.info("Joylashuv o'chirildi");
      }
    } catch (error) {
      console.error("Xatolik:", error);
      toast.error("Joylashuvni yangilashda xatolik");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        locationEnabled: false
      });
    }
    await signOut();
    router.push("/");
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 font-sans">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border px-4 h-16 sticky top-0 z-50 flex items-center shrink-0">
        <div className="flex items-center justify-between w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-inner">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm sm:text-base leading-none mb-1">
                {userData.firstName} {userData.lastName}
              </h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">
                {userData.profession}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all active:scale-95"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-6">

        {activeTab === "dash" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Card */}
            <div className="relative overflow-hidden bg-card border border-border/50 rounded-[2.5rem] p-6 shadow-sm group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

              <div className="flex items-center justify-between mb-8 relative">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${locationEnabled ? "bg-green-500 text-white shadow-green-500/20" : "bg-slate-200 text-slate-500 dark:bg-slate-800"}`}>
                    {locationEnabled ? <Wifi className="h-7 w-7" /> : <WifiOff className="h-7 w-7" />}
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-foreground tracking-tight">Ish rejimi</h3>
                    <p className="text-sm font-medium text-muted-foreground">{locationEnabled ? "Siz hozir onlaynsiz" : "Hozir oflaynsiz"}</p>
                  </div>
                </div>
                <Switch
                  checked={locationEnabled}
                  onCheckedChange={handleToggleLocation}
                  disabled={isUpdating}
                  className="data-[state=checked]:bg-green-500 scale-125"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 relative">
                <div className="bg-secondary/40 backdrop-blur-sm p-4 rounded-3xl border border-white/10">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">Bugungi tushum</p>
                  <p className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(totalPayments)}<span className="text-xs ml-1 font-bold">so'm</span></p>
                </div>
                <div className="bg-secondary/40 backdrop-blur-sm p-4 rounded-3xl border border-white/10">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1 opacity-60">To'lovlar</p>
                  <p className="text-2xl font-black text-foreground tracking-tighter">{paymentCount}<span className="text-xs ml-1 font-bold">ta</span></p>
                </div>
              </div>

              {locationError && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-xs font-bold text-red-600">{locationError}</p>
                </div>
              )}
            </div>

            {/* Main Action - Add Payment */}
            <div className="flex flex-col gap-4">
              <AddPaymentDialog />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab("map")}
                className="flex flex-col items-center justify-center gap-4 p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] hover:bg-blue-500/10 transition-all active:scale-95 group"
              >
                <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <MapPin className="h-7 w-7" />
                </div>
                <span className="text-sm font-black text-blue-600 uppercase tracking-widest">Xarita</span>
              </button>
              <button
                onClick={() => router.push("/employee/payments")}
                className="flex flex-col items-center justify-center gap-4 p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] hover:bg-emerald-500/10 transition-all active:scale-95 group"
              >
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-7 w-7" />
                </div>
                <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">To'lovlar</span>
              </button>
            </div>

            {/* Map Preview */}
            {locationEnabled && currentLocation && (
              <div className="bg-card border border-border/50 rounded-[2.5rem] overflow-hidden h-[280px] relative group shadow-sm shadow-primary/5">
                <YandexMap center={currentLocation} zoom={16} />
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-white text-[10px] font-black uppercase tracking-widest">Jonli joylashuv faol</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("map")}
                  className="absolute top-4 right-4 w-12 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-2xl text-primary border border-white/20 active:scale-90 transition-all"
                >
                  <Target className="h-6 w-6" />
                </button>
              </div>
            )}

            {/* Security Info */}
            <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-foreground mb-1 uppercase tracking-tight">Xavfsizlik</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Joylashuv ma'lumotlari faqat ish rejimi yoqilganda admin bilan ulashiladi. Rejim o'chirilishi bilan ma'lumotlar uzatish to'xtaydi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="h-[calc(100vh-14rem)] min-h-[500px] animate-in fade-in zoom-in-95 duration-500">
            <div className="h-full bg-card border border-border rounded-[2.5rem] overflow-hidden relative shadow-2xl shadow-primary/5">
              <YandexMap center={currentLocation || undefined} />
              {!currentLocation && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center z-20">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 animate-bounce">
                    <Navigation className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="font-black text-2xl mb-2 tracking-tighter">Joylashuv kutilmoqda</h3>
                  <p className="text-sm text-muted-foreground max-w-xs font-medium">
                    Xaritada o'z joyingizni ko'rish uchun ish rejimini yoqing va kuting.
                  </p>
                  <Button
                    onClick={() => handleToggleLocation(true)}
                    className="mt-8 rounded-2xl px-10 h-14 font-black shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                  >
                    ISHNI BOSHLASH
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-black tracking-tighter">Tahlil</h3>
              <Button variant="ghost" size="sm" onClick={() => router.push("/employee/payments")} className="rounded-xl h-10 text-xs font-black uppercase tracking-widest text-primary">
                Batafsil
              </Button>
            </div>

            <div className="bg-card border border-border rounded-[2.5rem] p-8 space-y-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -mr-20 -mt-20" />

              <div className="flex items-center justify-between relative">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Jami tushum</p>
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>

              <div className="relative">
                <p className="text-5xl font-black text-foreground tracking-tighter">
                  {formatCurrency(totalPayments)}<span className="text-sm ml-2 font-bold text-muted-foreground">UZS</span>
                </p>
              </div>

              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-primary to-emerald-500 w-2/3 rounded-full" />
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-border/50 relative">
                <div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-2">Operatsiyalar</p>
                  <p className="text-2xl font-black">{paymentCount} ta</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-2">O'rtacha</p>
                  <p className="text-2xl font-black">{formatCurrency(paymentCount > 0 ? Math.round(totalPayments / paymentCount) : 0)}</p>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full h-20 rounded-[2.5rem] gap-4 font-black text-xl shadow-lg border border-border/50 active:scale-[0.98] transition-all"
              onClick={() => router.push("/employee/payments")}
            >
              <History className="h-7 w-7" />
              TO'LOVLAR TARIXI
            </Button>
          </div>
        )}
      </main>

      {/* Modern Floating Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[420px]">
        <div className="bg-card/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[2rem] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-around gap-2">
          <button
            onClick={() => setActiveTab("dash")}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all relative group ${activeTab === "dash"
              ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
          >
            <LayoutDashboard className={`h-6 w-6 transition-transform duration-300 ${activeTab === "dash" ? "scale-110" : "group-hover:scale-110"}`} />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Asosiy</span>
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all relative group ${activeTab === "map"
              ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
          >
            <MapPinned className={`h-6 w-6 transition-transform duration-300 ${activeTab === "map" ? "scale-110" : "group-hover:scale-110"}`} />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Xarita</span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all relative group ${activeTab === "payments"
              ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
          >
            <TrendingUp className={`h-6 w-6 transition-transform duration-300 ${activeTab === "payments" ? "scale-110" : "group-hover:scale-110"}`} />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Tahlil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
