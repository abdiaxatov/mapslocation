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

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      toast.success("Hodim to'liq o'chirildi (tizimdan ham)");
      setDeleteEmployee(null);
    } catch (error) {
      console.error(error);
      toast.error("O'chirishda xatolik yuz berdi");
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
                className={`w-full p-3 rounded-xl transition-all text-left group ${selectedEmployee?.uid === employee.uid
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-secondary border border-transparent"
                  }`}
              >
                <div className="flex items-start gap-3">
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate text-sm">
                        {employee.firstName} {employee.lastName}
                      </span>
                      {employee.uid === currentUserId && (
                        <Badge variant="outline" className="text-[10px] border-info/50 text-info h-5 px-1.5">
                          Siz
                        </Badge>
                      )}
                      {employee.role === "admin" && (
                        <Badge variant="outline" className="text-[10px] border-primary/50 text-primary h-5 px-1.5">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Briefcase className="h-3 w-3" />
                      <span className="truncate">{employee.profession}</span>
                    </div>
                    {employee.currentLocation && employee.locationEnabled && (
                      <div className="flex items-center gap-1.5 text-xs text-primary mt-1.5">
                        <MapPin className="h-3 w-3" />
                        <span>Joylashuv faol</span>
                      </div>
                    )}
                  </button>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem
                        onClick={() => onSelectEmployee?.(employee)}
                        className="text-foreground focus:bg-secondary cursor-pointer"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Joylashuvni ko'rish
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setEditEmployee(employee)}
                        className="text-foreground focus:bg-secondary cursor-pointer"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Tahrirlash
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={() => setDeleteEmployee(employee)}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                        disabled={employee.uid === currentUserId}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        O'chirish
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
