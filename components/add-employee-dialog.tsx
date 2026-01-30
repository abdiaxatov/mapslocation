"use client";

import React from "react"

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2, User, Mail, Lock, Briefcase, Shield, Phone } from "lucide-react";
import { toast } from "sonner";

interface AddEmployeeDialogProps {
  onSuccess?: () => void;
}

export default function AddEmployeeDialog({ onSuccess }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    profession: "",
    phoneNumber: "",
    role: "employee" as "admin" | "employee",
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/employees/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Xatolik yuz berdi");
      }

      toast.success("Hodim muvaffaqiyatli qo'shildi!");
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        profession: "",
        phoneNumber: "",
        role: "employee",
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Hodim qo'shishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <UserPlus className="sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Hodim qo&apos;shish</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Yangi hodim qo&apos;shish
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Hodim ma&apos;lumotlarini to&apos;ldiring
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-foreground text-sm flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Ism
              </Label>
              <Input
                id="firstName"
                placeholder="Ism"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-foreground text-sm flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Familiya
              </Label>
              <Input
                id="lastName"
                placeholder="Familiya"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground text-sm flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground text-sm flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              Parol
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Kamida 6 ta belgi"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              className="h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profession" className="text-foreground text-sm flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              Kasbi
            </Label>
            <Input
              id="profession"
              placeholder="Masalan: Dasturchi"
              value={formData.profession}
              onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
              required
              className="h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-foreground text-sm flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Telefon raqami
            </Label>
            <Input
              id="phoneNumber"
              placeholder="+998 90 123 45 67"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role" className="text-foreground text-sm flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              Rol
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: "admin" | "employee") =>
                setFormData({ ...formData, role: value })
              }
            >
              <SelectTrigger className="h-11 bg-secondary border-border text-foreground">
                <SelectValue placeholder="Rolni tanlang" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="employee" className="text-foreground">Hodim</SelectItem>
                <SelectItem value="admin" className="text-foreground">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-border text-foreground bg-transparent hover:bg-secondary"
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Saqlash"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
