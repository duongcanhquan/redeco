'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async (): Promise<void> => {
    setLoading(true);
    await createClient().auth.signOut();
    router.replace('/login');
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted transition-colors duration-200 hover:bg-danger/10 hover:text-danger cursor-pointer disabled:opacity-50"
    >
      <LogOut size={18} aria-hidden />
      <span>{loading ? 'Đang thoát…' : 'Đăng xuất'}</span>
    </button>
  );
}
