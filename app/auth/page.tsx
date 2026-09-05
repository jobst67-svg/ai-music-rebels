"use client";

import { AuthForm } from "@/components/auth-form";

// Backwards-compatible entry point for older bookmarks and OAuth links.
export default function AuthPage() {
  return <AuthForm mode="register" />;
}
