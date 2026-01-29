"use client";

import React from "react"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import type { UserData } from "@/contexts/auth-context";

interface EditEmployeeDialogProps {
  employee: UserData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditEmployeeDialog({ employee, open, onOpenChange }: EditEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    profession: "",
    role: "employee" as "admin" | "employee",
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName,
        lastName: employee.lastName,
        profession: employee.profession,
        role: employee.role,
      });
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateDoc(doc(db, "users", employee.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        profession: formData.profession,
        role: formData.role,
      });

      toast.success("Hodim ma'lumotlari yangilandi");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Pencil className="h-5 w-5 text-primary" />
            Hodimni tahrirlash
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {employee.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName" className="text-foreground">Ism</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="bg-secondary border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName" className="text-foreground">Familiya</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="bg-secondary border-border text-foreground"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-profession" className="text-foreground">Kasbi</Label>
            <Input
              id="edit-profession"
              value={formData.profession}
              onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
              className="bg-secondary border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role" className="text-foreground">Rol</Label>
            <Select
              value={formData.role}
              onValueChange={(value: "admin" | "employee") =>
                setFormData({ ...formData, role: value })
              }
            >
              <SelectTrigger className="bg-secondary border-border text-foreground">
                <SelectValue placeholder="Rolni tanlang" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="employee" className="text-foreground">Hodim</SelectItem>
                <SelectItem value="admin" className="text-foreground">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Saqlash"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
