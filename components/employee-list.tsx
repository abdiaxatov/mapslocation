"use client";

import type { UserData } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MapPin, User, Briefcase, Wifi, WifiOff, Search, Users, MoreVertical, Pencil, Trash2, Eye, Phone } from "lucide-react";
import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import EditEmployeeDialog from "./edit-employee-dialog";

interface EmployeeListProps {
  employees: UserData[];
  onSelectEmployee?: (employee: UserData) => void;
  selectedEmployee?: UserData | null;
  currentUserId?: string;
}

export default function EmployeeList({ employees, onSelectEmployee, selectedEmployee, currentUserId }: EmployeeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editEmployee, setEditEmployee] = useState<UserData | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<UserData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredEmployees = employees.filter(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.profession.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = employees.filter(e => e.locationEnabled).length;

  const handleDelete = async () => {
    if (!deleteEmployee || !deleteEmployee.uid) return;
    setDeleteLoading(true);

    try {
      // Use API to delete from Auth and Firestore
      const response = await fetch('/api/employees/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: deleteEmployee.uid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete employee');
      }

      toast.success("Hodim to'liq o'chirildi (tizimdan ham)");
      setDeleteEmployee(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "O'chirishda xatolik yuz berdi");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Employee List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "Hodim topilmadi" : "Hodimlar yo'q"}
              </p>
            </div>
          ) : (
            filteredEmployees.map((employee, index) => (
              <div
                key={employee.uid || `emp-${index}`}
                className={`w-full p-4 sm:p-5 rounded-xl transition-all text-left group ${selectedEmployee?.uid === employee.uid
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-secondary border border-transparent"
                  }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0"
                  >
                    <span className="font-bold text-primary text-sm">
                      {employee.firstName[0]}{employee.lastName[0]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectEmployee?.(employee)}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    {/* Name and Badges Row */}
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[70%]">
                        <span className="font-semibold text-foreground truncate text-sm sm:text-base" title={`${employee.firstName} ${employee.lastName}`}>
                          {employee.firstName} {employee.lastName}
                        </span>
                        {employee.uid === currentUserId && (
                          <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 px-1.5 h-5 border-0 shrink-0">
                            Siz
                          </Badge>
                        )}
                        {employee.role === "admin" && (
                          <Badge variant="outline" className="text-[10px] border-primary/50 text-primary h-5 px-1.5 shrink-0">
                            Admin
                          </Badge>
                        )}
                      </div>
                      {/* Status Indicator */}
                      <div className="shrink-0 ml-2">
                        {employee.locationEnabled ? (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                          </span>
                        ) : (
                          <span className="h-2.5 w-2.5 bg-muted-foreground/30 rounded-full block"></span>
                        )}
                      </div>
                    </div>

                    {/* Profession */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-1">
                      <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                      <span className="truncate" title={employee.profession}>{employee.profession}</span>
                    </div>

                    {/* Phone Number */}
                    {employee.phoneNumber && (
                      <a
                        href={`tel:${employee.phoneNumber}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground/80 hover:text-primary transition-colors mb-1.5 w-fit"
                      >
                        <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                        <span className="truncate font-mono text-[11px] sm:text-xs underline decoration-dotted" title={employee.phoneNumber}>{employee.phoneNumber}</span>
                      </a>
                    )}

                    {/* Location Status Badge */}
                    {employee.currentLocation && employee.locationEnabled && (
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>Kuzatilmoqda</span>
                      </div>
                    )}
                  </button>

                  {/* Action Buttons - Always Visible */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditEmployee(employee);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                      title="Tahrirlash"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteEmployee(employee);
                      }}
                      disabled={employee.uid === currentUserId}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                      title="O'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      {editEmployee && (
        <EditEmployeeDialog
          employee={editEmployee}
          open={!!editEmployee}
          onOpenChange={(open) => !open && setEditEmployee(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEmployee} onOpenChange={(open) => !open && setDeleteEmployee(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Hodimni o'chirish</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <span className="font-medium text-foreground">{deleteEmployee?.firstName} {deleteEmployee?.lastName}</span> ni o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary text-foreground border-border hover:bg-secondary/80">
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
    </div>
  );
}
