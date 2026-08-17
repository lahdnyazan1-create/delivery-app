// src/components/admin/CustomersTab.tsx
// تبويب "العملاء" — منقول كما هو من src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useToastStore } from "@/store/useToastStore";
import { UserRole, UserProfile } from "@/types/database";
import {
  setUserRole,
  fetchAllUsers,
} from "@/lib/firestore";

export function CustomersTab() {
  // ---------------- Users state ----------------
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await setUserRole(uid, newRole);
      setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Failed to update role", error);
      useToastStore.getState().error("فشل تغيير الدور. تأكد أنك أدمن.");
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const list = await fetchAllUsers();
      setUsersList(list);
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setUsersLoading(false);
    }
  };

  // المكوّن يُركَّب فقط عند تفعيل التبويب — التحميل عند التركيب يحافظ
  // على نفس السلوك الكسول (lazy) القديم المرتبط بتفعيل التبويب
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">العملاء المسجلون ({usersList.length})</h2>
        <input
          type="text"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="🔍 ابحث برقم الهاتف أو الاسم..."
          className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:w-72"
        />
      </div>
      {usersLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-foreground-muted">جارٍ التحميل...</div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary text-xs text-foreground-muted">
              <tr>
                <th className="p-3">الاسم</th>
                <th className="p-3">رقم الهاتف</th>
                <th className="p-3">تغيير الدور</th>
                <th className="p-3">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {usersList
                .filter((u) => u.phone.includes(userSearch) || (u.displayName || "").includes(userSearch))
                .map((u) => (
                <tr key={u.uid} className="border-t border-glass-border">
                  <td className="p-3 font-bold">{u.displayName || "بدون اسم"}</td>
                  <td className="p-3 font-mono text-xs" dir="ltr">{u.phone}</td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                      className={`rounded-md px-2 py-1 text-[10px] font-bold outline-none cursor-pointer ${
                        u.role === "admin" ? "bg-primary/10 text-primary" :
                        u.role === "vendor" ? "bg-accent/10 text-accent" :
                        u.role === "courier" ? "bg-amber-500/10 text-amber-500" :
                        "bg-white/5 text-foreground-muted"
                      }`}
                    >
                      <option value="customer" className="bg-secondary">عميل (customer)</option>
                      <option value="admin" className="bg-secondary">مدير (admin)</option>
                      <option value="vendor" className="bg-secondary">مطعم (vendor)</option>
                      <option value="courier" className="bg-secondary">سائق (courier)</option>
                    </select>
                  </td>
                  <td className="p-3 text-xs text-foreground-muted">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ar-EG") : "—"}
                  </td>
                </tr>
              ))}
              {usersList.filter((u) => u.phone.includes(userSearch) || (u.displayName || "").includes(userSearch)).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-foreground-muted">لا يوجد مستخدمون مطابقون للبحث</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
