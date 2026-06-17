import { supabase } from "@/lib/supabase";
import { useNavigate } from "@tanstack/react-router";

export function WaitlistPage() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-background p-6">
      <div className="max-w-md w-full bg-surface-card rounded-2xl shadow-sm border-2 border-neutral-200 p-8 text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-bold text-neutral-900 mb-3">
          You're on the waitlist!
        </h1>
        <p className="text-neutral-600 mb-8 leading-relaxed">
          Forager is currently in private beta. We've securely saved your account, and we'll notify you as soon as a workspace is ready for you.
        </p>
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
