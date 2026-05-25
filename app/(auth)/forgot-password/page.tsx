"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { AuthBrandPanel, AuthMobileBrand } from "@/components/auth/auth-brand-panel";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel />

      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        <AuthMobileBrand />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              We&apos;ll send you a secure link to choose a new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <p className="text-sm text-slate-600">
                Check your inbox for a reset link. It may take a minute to arrive.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            )}
            <Link
              href="/login"
              className="text-brand mt-6 inline-flex items-center gap-2 text-sm hover:opacity-80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
