"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type UserData } from "@/contexts/auth-context";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from "next/dynamic";
import AddEmployeeDialog from "@/components/add-employee-dialog";
import EmployeeList from "@/components/employee-list";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, MapPin, Menu, X, Users, Wifi, WifiOff, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import AdminPaymentAnalytics from "@/components/admin-payment-analytics";

const LocationMap = dynamic(() => import("@/components/location-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-secondary rounded-xl">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

export default function AdminDashboard() {
  const { user, userData, loading, signOut } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<UserData[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UserData | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "payments">("map");

  // Sync local state with userData
  useEffect(() => {
    if (userData) {
      setLocationEnabled(userData.locationEnabled || false);
    }
  }, [userData]);

  // Location Tracking Effect
  useEffect(() => {
    let watchId: number | undefined;

    const updateLocation = async (lat: number, lng: number) => {
      if (!user) return;
      try {
        await updateDoc(doc(db, "users", user.uid), {
          currentLocation: { lat, lng, timestamp: serverTimestamp() }
        });
      } catch (error) {
        console.error("Error updating location:", error);
      }
    };

    if (locationEnabled && user) {
      if (!navigator.geolocation) {
        toast.error("Brauzer joylashuvni qo'llab-quvvatlamaydi");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Location error:", error.code, error.message);
          switch (error.code) {
            case 1: // PERMISSION_DENIED
              toast.error("Joylashuvga ruxsat berilmadi. Iltimos, brauzer sozlamalarini tekshiring.");
              break;
            case 2: // POSITION_UNAVAILABLE
              toast.error("Joylashuvni aniqlab bo'lmadi. GPS yoqilganligini tekshiring.");
              break;
            case 3: // TIMEOUT
              toast.error("Joylashuvni aniqlash vaqti tugadi.");
              break;
            default:
              toast.error("Joylashuv xatoligi yuz berdi.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else if (!locationEnabled && user) {
      // Optional: clear location when disabled? 
      // For now just stop updating.
    }

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [locationEnabled, user]);

  const handleToggleLocation = async (enabled: boolean) => {
    if (!user) return;
    try {
      setLocationEnabled(enabled); // Optimistic update
      await updateDoc(doc(db, "users", user.uid), {
        locationEnabled: enabled
      });
      if (enabled) toast.success("Joylashuv yoqildi");
      else toast.info("Joylashuv o'chirildi");
    } catch (error) {
      console.error(error);
      setLocationEnabled(!enabled); // Revert on error
      toast.error("Xatolik yuz berdi");
    }
  };

  useEffect(() => {
    if (!loading && (!user || !userData)) {
      router.push("/");
      return;
    }

    if (!loading && userData && userData.role !== "admin") {
      router.push("/employee");
      return;
    }
  }, [user, userData, loading, router]);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const employeeData: UserData[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data() as UserData;
        employeeData.push(userData);
      });
      setEmployees(employeeData);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const handleEmployeeSelect = (employee: UserData) => {
    setSelectedEmployee(employee);
    setSidebarOpen(false);
    if (employee.currentLocation && employee.locationEnabled) {
      toast.success(`${employee.firstName} joylashuviga o'tildi`);
    }
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

  const onlineCount = employees.filter(e => e.locationEnabled).length;
  const offlineCount = employees.filter(e => !e.locationEnabled).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 h-16 sticky top-0 z-50 flex items-center">
        <div className="flex items-center justify-between w-full max-w-[1800px] mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors text-foreground"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">Hodimlar joylashuvi</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">


            {activeTab === "map" && (
              <div className="flex items-center gap-2 bg-secondary/50 px-2 sm:px-3 py-1.5 rounded-lg border border-border">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {locationEnabled ? <Wifi className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> : <WifiOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />}
                  <span className="text-xs sm:text-sm font-medium">
                    {locationEnabled ? "Faol" : "O'chiq"}
                  </span>
                </div>
                <Switch
                  checked={locationEnabled}
                  onCheckedChange={handleToggleLocation}
                  className="data-[state=checked]:bg-primary scale-75 sm:scale-90"
                />
              </div>
            )}


            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
              <button
                onClick={() => setActiveTab("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${activeTab === "map"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Xarita</span>
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${activeTab === "payments"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">To'lovlar</span>
              </button>
            </div>


            <AddEmployeeDialog />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Employee List */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-40    bg-card border-r border-border
            transform transition-transform duration-300 ease-in-out
            lg:transform-none mt-16 lg:mt-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <EmployeeList
            employees={employees}
            onSelectEmployee={handleEmployeeSelect}
            selectedEmployee={selectedEmployee}
            currentUserId={user?.uid}
          />
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <button
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            type="button"
          />
        )}

        {/* Map Area */}
        <main className="flex-1 flex flex-col">
          {activeTab === "map" ? (
            <>
              {/* Stats Bar */}
              <div className="bg-card border-b border-border px-4 py-3">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Jami:</span>
                    <span className="font-semibold text-foreground">{employees.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-muted-foreground">Online:</span>
                    <span className="font-semibold text-primary">{onlineCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    <span className="text-muted-foreground">Offline:</span>
                    <span className="font-semibold text-foreground">{offlineCount}</span>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="flex-1 p-4">
                <div className="h-full bg-card rounded-xl border border-border overflow-hidden">
                  <LocationMap
                    employees={employees}
                    selectedEmployee={selectedEmployee}
                    currentUserId={user?.uid}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 p-4 overflow-auto">
              <div className="max-w-7xl mx-auto">
                <AdminPaymentAnalytics />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
