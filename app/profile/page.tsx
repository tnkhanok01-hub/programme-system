"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type UserProfile = {
  name: string;
  email: string | null;
  id: string;
  matric: string | null;
  staff: string | null;
  role: string;
  created_at: string | null;
  phone: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const isAdmin =
    user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    const getUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;

      if (!authUser) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(`
          full_name,
          phone,
          matric_number,
          staff_number,
          created_at,
          role:roles(name)
        `)
        .eq("id", authUser.id)
        .single();

      if (error || !data) {
        console.error(error);
        return;
      }

      const role = data.role?.name ?? "student";

      setUser({
        name: data.full_name ?? "User",
        email: authUser.email ?? null,
        id: authUser.id,
        matric: data.matric_number ?? null,
        staff: data.staff_number ?? null,
        role,
        created_at: data.created_at ?? null,
        phone: data.phone ?? null,
      });

      setName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setLoading(false);
    };

    getUser();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update({
        full_name: name,
        phone: phone,
      })
      .eq("id", user.id);

    if (error) {
      alert("Failed to update profile");
      return;
    }

    setUser({ ...user, name, phone });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-2xl shadow-xl">
        <CardContent className="p-6 flex flex-col gap-5">

          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <Badge className="mt-2 capitalize">{user?.role}</Badge>
          </div>

          {/* Name */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Full Name</p>
            {isEditing ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <p>{user?.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Phone</p>
            {isEditing ? (
              <Input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
            ) : (
              <p>{user?.phone || "N/A"}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Email</p>
            <p>{user?.email}</p>
          </div>

          {/* Matric / Staff */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {isAdmin ? "Staff ID" : "Matric Number"}
            </p>
            <p>{isAdmin ? user?.staff : user?.matric}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            {!isEditing ? (
              <Button className="w-full" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            ) : (
              <>
                <Button className="w-full" onClick={handleSave}>
                  Save
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>

          {/* Logout */}
          <Button
            variant="destructive"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Logout
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}