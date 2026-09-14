"use client";

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import type { Analytics } from "firebase/analytics";

function browserOnly() {
  return typeof window !== "undefined";
}

function firebaseConfig(): FirebaseOptions | null {
  if (!browserOnly()) return null;
  // Next.js inlines public configuration only through literal property access.
  // Analytics does not use Firebase Auth's redirect domain.
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  };
  if (Object.values(config).some((value) => !value)) return null;
  return {
    ...config,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim() ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID.trim() } : {}),
  };
}

export function getFirebaseApp(): FirebaseApp | null {
  const config = firebaseConfig();
  if (!config) return null;
  return getApps().length ? getApp() : initializeApp(config);
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    return (await isSupported()) ? getAnalytics(app) : null;
  } catch {
    return null;
  }
}
