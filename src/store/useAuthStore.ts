import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserProfile } from "@/types/database";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateUserProfile as updateUserProfileFirestore } from "@/lib/firestore";
import type { UserGender } from "@/types/database";

/** بيانات التسجيل التي يدخلها المستخدم مع أول حساب (إيميل + كلمة سر) */
export interface SignupProfile {
  displayName?: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: UserGender;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  loading: boolean;
  authReady: boolean;
  error: string | null;

  completeLogin: (
    firebaseUser: FirebaseUser,
    profile?: SignupProfile,
  ) => Promise<{ ok: boolean; message: string }>;
  logoutUser: () => Promise<void>;
  initAuthListener: () => () => void;
  updateUserProfile: (
    profile: Partial<UserProfile>,
  ) => Promise<{ ok: boolean; message: string }>;
  updateUserLocation: (location: {
    address?: string;
    locationLabel?: string;
    lat?: number;
    lng?: number;
  }) => Promise<{ ok: boolean; message: string }>;
  completeOnboarding: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasSeenOnboarding: false,
      loading: false,
      authReady: false,
      error: null,

      completeLogin: async (firebaseUser, profile = {}) => {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          let userData: UserProfile;

          if (userSnap.exists()) {
            userData = userSnap.data() as UserProfile;
          } else {
            // أول تسجيل — الملف يطابق الحقول المسموح بها في firestore.rules
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              phone: profile.phone || "",
              email: profile.email || firebaseUser.email || "",
              displayName: profile.displayName || firebaseUser.displayName || "",
              age: profile.age,
              gender: profile.gender,
              role: "customer",
              address: "",
              createdAt: Date.now(),
            };
            // انقل الحقول الفارغة كي يبقى المستند ضمن قائمة hasOnly المسموحة
            const payload: Record<string, unknown> = {
              uid: newUser.uid,
              phone: newUser.phone,
              displayName: newUser.displayName,
              role: newUser.role,
              address: newUser.address,
              createdAt: newUser.createdAt,
            };
            if (newUser.email) payload.email = newUser.email;
            if (newUser.age != null) payload.age = newUser.age;
            if (newUser.gender) payload.gender = newUser.gender;
            await setDoc(userRef, payload);
            userData = { ...newUser };
          }

          set({
            user: userData,
            isAuthenticated: true,
            authReady: true,
            error: null,
          });
          return { ok: true, message: "تم تسجيل الدخول بنجاح" };
        } catch (error: any) {
          set({ error: error.message });
          return { ok: false, message: error.message };
        }
      },

      initAuthListener: () => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const snap = await getDoc(doc(db, "users", firebaseUser.uid));
              if (snap.exists()) {
                set({
                  user: snap.data() as UserProfile,
                  isAuthenticated: true,
                  authReady: true,
                });
              } else {
                set({ user: null, isAuthenticated: false, authReady: true });
              }
            } catch (err) {
              console.error("Auth listener error:", err);
              set({ authReady: true });
            }
          } else {
            set({ user: null, isAuthenticated: false, authReady: true });
          }
        });
        return unsub;
      },

      logoutUser: async () => {
        await signOut(auth);
        set({ user: null, isAuthenticated: false, error: null });
      },

      updateUserProfile: async (profile) => {
        const { user } = get();
        if (!user) return { ok: false, message: "يجب تسجيل الدخول أولاً" };
        try {
          const updated = { ...user, ...profile };
          await updateUserProfileFirestore(user.uid, profile);
          set({ user: updated });
          return { ok: true, message: "تم تحديث الملف الشخصي" };
        } catch (error: any) {
          return { ok: false, message: error.message };
        }
      },

      updateUserLocation: async (location) => {
        const { user } = get();
        if (!user) return { ok: false, message: "يجب تسجيل الدخول أولاً" };
        try {
          const updated = { ...user, ...location };
          await updateUserProfileFirestore(user.uid, location);
          set({ user: updated });
          return { ok: true, message: "تم تحديث الموقع" };
        } catch (error: any) {
          return { ok: false, message: error.message };
        }
      },

      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "zest-auth",
      storage: createJSONStorage(() => localStorage),
      // ✅ الاسترجاع بعد الـ hydration وليس قبله — بدونه يُسترجع
      //    hasSeenOnboarding على العميل قبل أول رسم فيختلف عن HTML
      //    الخادم ويكسر الـ hydration (React #422). AppInitializer يستدعي
      //    rehydrate() بعد التركيب.
      skipHydration: true,
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
    },
  ),
);
