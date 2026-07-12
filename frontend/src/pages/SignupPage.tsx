import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const { error } = await signUp(email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Account created. Check your email if confirmation is required.");
    navigate("/search");
  };

  return (
    <div className="min-h-screen page-shell auth-shell">
      <PublicHeader />

      <main className="auth-page mx-auto w-full max-w-6xl">
        <section className="auth-copy">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">
            Save your schedule and carry your course planning across devices.
          </p>
        </section>

        <div className="auth-card w-full">
          {!isConfigured && (
            <p className="rounded-lg border border-[var(--aqua-line)] bg-[var(--aqua-sky-pale)] px-3 py-2 text-sm text-[var(--design-muted)]">
              Supabase is not configured. Add <code className="text-xs">VITE_SUPABASE_URL</code>{" "}
              and <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to enable sign-up.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <Button
              type="submit"
              className="aqua-btn btn-ink w-full border-0"
              disabled={isSubmitting || !isConfigured}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  Creating account...
                </>
              ) : (
                "Sign up"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-[var(--aqua-sky)] hover:underline">
              Log in
            </Link>
          </p>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            <Link to="/search" className="hover:underline">
              Continue as guest
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
