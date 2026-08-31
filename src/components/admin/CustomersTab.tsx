// src/components/admin/CustomersTab.tsx
// تبويب "العملاء" — بحث/تغيير أدوار/حذف ملفات المستخدمين
// ✅ محدَّث ليعرض بيانات التسجيل الجديدة: البريد والعمر والجنس بجانب الهاتف
"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";
import { useAuthStore } from "@/store/useAuthStore";
import { UserRole, UserProfile } from "@/types/database";
import {
  setUserRole,
  fetchAllUsers,
  deleteUserDoc,
} from "@/lib/firestore";

const GENDER_LABEL: Record<string, string> = {
  male: "ذكر",
  female: "أنثى",
};

export function CustomersTab() {
  const currentUid = useAuthStore((s) => s.user?.uid);

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

  const handleDeleteUser = async (u: UserProfile) => {
    // ✅ حماية: لا يُسمح للأدمن بحذف ملفه من هنا — لو حذفه يفقد صلاحياته
    if (u.uid === currentUid) {
      useToastStore.getState().error("لا يمكنك حذف حسابك الخاص");
      return;
    }
    const ok = await useToastStore.getState().confirm({
      title: `حذف ملف "${u.displayName || u.email || u.phone}"؟`,
      message:
        "يُحذف الملف الشخصي من قاعدة البيانات فقط — حساب الدخول (Firebase Auth) يبقى ويمكن للمستخدم التسجيل من جديد.",
      confirmText: "حذف الملف",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteUserDoc(u.uid);
      setUsersList((prev) => prev.filter((x) => x.uid !== u.uid));
      useToastStore.getState().success("تم حذف ملف المستخدم");
    } catch (error: any) {
      useToastStore.getState().error(
        `فشل الحذف: ${error?.message || "خطأ غير معروف"}`,
      );
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

  const matchesSearch = (u: UserProfile) =>
    (u.phone || "").includes(userSearch) ||
    (u.displayName || "").includes(userSearch) ||
    (u.email || "").includes(userSearch);

  const filteredUsers = usersList.filter(matchesSearch);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">العملاء المسجلون ({usersList.length})</h2>
        <input
          type="text"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder="🔍 ابحث بالاسم أو البريد أو الهاتف..."
          className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary sm:w-72"
        />
      </div>
      {usersLoading ? (
        <div className="glass rounded-2xl p-8 text-center text-foreground-muted">جارٍ التحميل...</div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="bg-secondary text-xs text-foreground-muted">
              <tr>
                <th className="p-3">الاسم</th>
                <th className="p-3">البريد الإلكتروني</th>
                <th className="p-3">رقم الهاتف</th>
                <th className="p-3">العمر</th>
                <th className="p-3">الجنس</th>
                <th className="p-3">تغيير الدور</th>
                <th className="p-3">تاريخ التسجيل</th>
                <th className="p-3">حذف الملف</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="border-t border-glass-border">
                  <td className="p-3 font-bold">
                    {u.displayName || "بدون اسم"}
                    {u.uid === currentUid && (
                      <span className="mr-1.5 text-[10px] font-semibold text-primary">(أنت)</span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs" dir="ltr">{u.email || "—"}</td>
                  <td className="p-3 font-mono text-xs" dir="ltr">{u.phone || "—"}</td>
                  <td className="p-3 text-xs text-foreground-muted">
                    {u.age != null ? `${u.age} سنة` : "—"}
                  </td>
                  <td className="p-3 text-xs text-foreground-muted">
                    {u.gender ? GENDER_LABEL[u.gender] || u.gender : "—"}
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                      className={`rounded-md px-2 py-1 text-[10px] font-bold outline-none cursor-pointer ${
                        u.role === "admin" ? "bg-primary/10 text-primary" :
                        u.role === "vendor" ? "bg-accent/10 text-accent" :
                        u.role === "courier" ? "bg-amber-500/10 text-amber-500" :
                        "bg-foreground/5 text-foreground-muted"
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
                  <td className="p-3">
                    {u.uid === currentUid ? (
                      <span className="text-[10px] text-foreground-muted">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        aria-label={`حذف ملف ${u.displayName || u.email || u.phone}`}
                        className="rounded-lg bg-danger/10 px-2.5 py-1.5 text-[11px] font-bold text-danger transition hover:bg-danger/20"
                      >
                        <Trash2 className="inline size-3" aria-hidden /> حذف
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-foreground-muted">لا يوجد مستخدمون مطابقون للبحث</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
