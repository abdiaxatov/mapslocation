"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
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
  MapPinned,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export default function EmployeeDashboard() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !userData)) {
      router.push("/");
      return;
    }

    if (userData) {
      setLocationEnabled(userData.locationEnabled || false);
    }
  }, [user, userData, loading, router]);

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
        setCurrentLocation(null);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 h-16 sticky top-0 z-50 flex items-center">
        <div className="flex items-center justify-between w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-sm sm:text-base">Hodim Paneli</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Joylashuvni boshqarish</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Chiqish</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center">
              <User className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                {userData.firstName} {userData.lastName}
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Briefcase className="h-4 w-4" />
                <span className="text-sm">{userData.profession}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Badge
                  variant="outline"
                  className={`${userData.role === "admin" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {userData.role === "admin" ? "Admin" : "Hodim"}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${locationEnabled ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                >
                  {locationEnabled ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Location Toggle Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Navigation className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Joylashuvni ulashish</h3>
                <p className="text-sm text-muted-foreground">Admin sizning joylashuvingizni xaritada ko&apos;radi</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
              <div className="flex items-center gap-3">
                {locationEnabled ? (
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <Wifi className="h-6 w-6 text-primary" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <WifiOff className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">
                    {locationEnabled ? "Joylashuv faol" : "Joylashuv o'chiq"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {locationEnabled ? "Admin sizni ko'ra oladi" : "Admin sizni ko'ra olmaydi"}
                  </p>
                </div>
              </div>
              <Switch
                checked={locationEnabled}
                onCheckedChange={handleToggleLocation}
                disabled={isUpdating}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {locationError && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Xatolik</p>
                  <p className="text-sm text-destructive/80 mt-1">{locationError}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Current Location Card */}
        {locationEnabled && currentLocation && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <MapPinned className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Hozirgi joylashuv</h3>
                  <p className="text-sm text-muted-foreground">Real vaqt koordinatalari</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Kenglik</p>
                  <p className="font-mono text-sm text-foreground">{currentLocation.lat.toFixed(6)}</p>
                </div>
                <div className="p-4 bg-secondary rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Uzunlik</p>
                  <p className="font-mono text-sm text-foreground">{currentLocation.lng.toFixed(6)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-card border border-primary/20 rounded-2xl p-5">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Xavfsizlik haqida</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sizning joylashuvingiz faqat joylashuv yoqilgan vaqtda ulashiladi.
                Istalgan vaqtda joylashuvni o&apos;chirishingiz mumkin.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
