import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Auth callback error:", error.message);
        setError(error.message);
      } else if (data.session) {
        navigate({ to: "/" });
      } else {
        // Sometimes the session takes a moment to establish or PKCE exchanges via hash
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            navigate({ to: "/" });
          }
        });
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-background">
      <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-neutral-900">Verifying your login...</h2>
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg max-w-md text-center">
          <p className="font-medium">Verification failed</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg font-medium transition-colors"
          >
            Return to login
          </button>
        </div>
      )}
    </div>
  );
}
