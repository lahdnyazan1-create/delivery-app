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

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  loading: boolean;
  authReady: boolean;
  error: string | null;

  completePhoneLogin: (
    firebaseUser: FirebaseUser,
    fullName: string,
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

      completePhoneLogin: async (firebaseUser, fullName) => {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          let userData: UserProfile;

          if (userSnap.exists()) {
            userData = userSnap.data() as UserProfile;
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              phone: firebaseUser.phoneNumber || "",
              displayName: fullName,
              role: "customer",
              address: "",
              createdAt: Date.now(),
            };
            await setDoc(userRef, newUser);
            userData = newUser;
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
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
    },
  ),
);
