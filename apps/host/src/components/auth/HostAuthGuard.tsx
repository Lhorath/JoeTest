"use client";

import * as React from "react";
import {
  Card,
  Button,
  Input,
  FormField,
  Badge,
} from "@platform/ui";
import { useAuth } from "../../providers/AuthProvider";
import { Radio, Lock, ShieldAlert } from "lucide-react";

export const HostAuthGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading, isAuthenticated, isHost, login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSubmitting(true);
      await login(emailOrUsername, password);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        errorObj?.response?.data?.message ||
          errorObj?.message ||
          "Invalid credentials. Please verify your host account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="h-10 w-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-zinc-400">
          Authenticating Host Studio...
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-2">
              <Radio className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-50">
              TheQueue Host Studio
            </h2>
            <p className="text-xs text-zinc-400">
              Sign in with your verified Host or DJ credentials to broadcast and
              manage live queues.
            </p>
          </div>

          <Card className="border-zinc-800 bg-zinc-950/80 shadow-2xl backdrop-blur">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-red-950/50 border border-red-800 text-xs text-red-300">
                  {error}
                </div>
              )}

              <FormField label="Email or Username">
                <Input
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="host@thequeue.live or dj_alex"
                  required
                />
              </FormField>

              <FormField label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-600/20 mt-2"
              >
                <Lock className="mr-2 h-4 w-4" /> Sign In to Host Studio
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Authenticated but not a Host role
  if (!isHost) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center p-8 rounded-xl border border-zinc-800 bg-zinc-950 space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-100">
            Host Clearance Required
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Signed in as{" "}
            <span className="font-semibold text-zinc-200">
              {user?.displayName || user?.username}
            </span>
            . Your account does not currently hold a verified HOST or
            ADMINISTRATOR role.
          </p>
          <div className="pt-2">
            <Badge variant="warning">Role: {user?.roles?.join(", ") || "USER"}</Badge>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
