"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-[#0F172A] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-emerald-400" />
          <span className="text-xl font-semibold">{APP_NAME}</span>
        </div>
        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            AI-powered customer care
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Your WhatsApp assistant, always on.
          </h1>
          <p className="text-lg text-slate-400">
            Automate replies, capture leads, and stay in control — without the
            complexity.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          Trusted by modern businesses worldwide.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-slate-200/80 shadow-lg shadow-slate-200/60">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isSignUp ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Start automating customer conversations in minutes."
                : "Sign in to manage your AI assistant."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
              </Button>
            </form>
            <div className="mt-4 flex flex-col gap-2 text-center text-sm">
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
              <Link
                href="/forgot-password"
                className="text-emerald-600 hover:text-emerald-700"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
