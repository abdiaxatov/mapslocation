"use client";

import type { UserData } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, User, Briefcase, Wifi, WifiOff, Search, Users, Pencil, Trash2, Shield, Phone, Navigation2 } from "lucide-react";
import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import EditEmployeeDialog from "./edit-employee-dialog";
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

interface EmployeeListProps {
  employees: UserData[];
  onSelectEmployee?: (employee: UserData) => void;
  onSelectRoute?: (employee: UserData) => void;
  selectedEmployee?: UserData | null;
  currentUserId?: string;
}

export default function EmployeeList({ employees, onSelectEmployee, onSelectRoute, selectedEmployee, currentUserId }: EmployeeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editEmployee, setEditEmployee] = useState<UserData | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<UserData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredEmployees = employees.filter(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.profession.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = employees.filter(e => e.locationEnabled).length;
  const adminEmployees = filteredEmployees.filter(e => e.role === "admin");
  const regularEmployees = filteredEmployees.filter(e => e.role === "employee");

  const handleDelete = async () => {
    if (!deleteEmployee) return;
    setDeleteLoading(true);

    try {
      await deleteDoc(doc(db, "users", deleteEmployee.uid));
      toast.success("Hodim o'chirildi");
      setDeleteEmployee(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("O'chirishda xatolik yuz berdi");
    } finally {
      setDeleteLoading(false);
    }
  };

  const EmployeeCard = ({ employee }: { employee: UserData }) => (
    <div
      className={`w-full p-4 sm:p-5 rounded-xl transition-all text-left group ${selectedEmployee?.uid === employee.uid
        ? "bg-primary/10 border border-primary/20"
        : employee.role === "admin"
          ? "bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10"
          : "hover:bg-secondary border border-transparent"
        }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`relative w-12 h-12 rounded-2xl ${employee.role === "admin"
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
            : "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30"
            } flex items-center justify-center shrink-0 transition-transform group-active:scale-95`}
        >
          <span className="font-bold text-base">
            {employee.firstName[0]}{employee.lastName[0]}
          </span>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${employee.locationEnabled ? "bg-green-500" : "bg-slate-400"}`} />
        </div>
        <button
          type="button"
          onClick={() => onSelectEmployee?.(employee)}
          className="flex-1 min-w-0 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-foreground truncate text-base" title={`${employee.firstName} ${employee.lastName}`}>
                {employee.firstName} {employee.lastName}
              </span>
            </div>
            {employee.uid === currentUserId && (
              <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-500 border-0 h-5 px-2 font-bold whitespace-nowrap">
                Siz
              </Badge>
            )}
          </div>

          <div className="space-y-1.5 pr-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <div className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center">
                <Briefcase className="h-3 w-3" />
              </div>
              <span className="truncate">{employee.profession}</span>
            </div>

            {employee.phoneNumber && (
              <a
                href={`tel:${employee.phoneNumber}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors w-fit font-bold"
              >
                <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="h-3 w-3" />
                </div>
                <span>{employee.phoneNumber}</span>
              </a>
            )}
          </div>
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0 ml-auto">
          {employee.currentLocation && employee.locationEnabled && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoute?.(employee);
              }}
              className="h-9 w-9 rounded-xl text-blue-500 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
              title="Marshrut"
            >
              <Navigation2 className="h-4.5 w-4.5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditEmployee(employee);
            }}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground border-border hover:bg-secondary/80"
            title="Tahrirlash"
          >
            <Pencil className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteEmployee(employee);
            }}
            disabled={employee.uid === currentUserId}
            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive border-border hover:bg-destructive/10 disabled:opacity-30"
            title="O'chirish"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full bg-card lg:border-r border-border">
        {/* Mobile Handle - for aesthetics */}
        <div className="lg:hidden flex justify-center py-2 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-300/50" />
        </div>

        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground text-base sm:text-lg">
                Foydalanuvchilar
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <Wifi className="h-3.5 w-3.5 text-green-500" />
                <span className="text-muted-foreground">{onlineCount}</span>
              </div>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{employees.length}</span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-secondary/50 border-border"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-2 pb-32 space-y-1">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? "Hodim topilmadi" : "Hodimlar yo'q"}
                </p>
              </div>
            ) : (
              <>
                {adminEmployees.length > 0 && (
                  <>
                    <div className="px-3 py-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
                        Adminlar ({adminEmployees.length})
                      </h3>
                    </div>
                    {adminEmployees.map((employee, index) => (
                      <EmployeeCard key={employee.uid || `admin-${index}`} employee={employee} />
                    ))}
                    {regularEmployees.length > 0 && (
                      <div className="my-4 border-t border-border" />
                    )}
                  </>
                )}

                {regularEmployees.length > 0 && (
                  <>
                    <div className="px-3 py-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Hodimlar ({regularEmployees.length})
                      </h3>
                    </div>
                    {regularEmployees.map((employee, index) => (
                      <EmployeeCard key={employee.uid || `emp-${index}`} employee={employee} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {editEmployee && (
        <EditEmployeeDialog
          employee={editEmployee}
          open={!!editEmployee}
          onOpenChange={(open) => !open && setEditEmployee(null)}
        />
      )}

      <AlertDialog open={!!deleteEmployee} onOpenChange={(open) => !open && setDeleteEmployee(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Hodimni o'chirish
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleteEmployee && (
                <>
                  <span className="font-medium text-foreground">
                    {deleteEmployee.firstName} {deleteEmployee.lastName}
                  </span>{" "}
                  ni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
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
