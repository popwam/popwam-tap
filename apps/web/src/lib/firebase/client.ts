"use client";

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import type { Analytics } from "firebase/analytics";

const requiredConfigNames = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

function browserOnly() {
  return typeof window !== "undefined";
}

function firebaseConfig(): FirebaseOptions | null {
  if (!browserOnly()) return null;
  const values = Object.fromEntries(requiredConfigNames.map((name) => [name, process.env[name]?.trim() || ""]));
  if (Object.values(values).some((value) => !value)) return null;
  return {
    apiKey: values.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: values.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: values.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: values.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: values.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: values.NEXT_PUBLIC_FIREBASE_APP_ID,
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
