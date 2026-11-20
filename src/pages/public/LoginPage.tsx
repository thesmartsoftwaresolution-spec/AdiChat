import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';

export const LoginPage: React.FC = () => {
  const { login, quickSignInDemo } = useAppState();
  const navigate = useNavigate();

  const [email, setEmail] = useState(import.meta.env.DEV ? 'adeel@adichat.internal' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'EmeraldPine#2026' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Invalid credentials.');
      return;
    }
    navigate('/chats');
  };

  return (
    <MobileStackLayout title="Login" backTo="/">
      <div className="max-w-md w-full mx-auto px-margin-mobile py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center mx-auto shadow-sm">
            <span className="material-symbols-outlined text-[24px]">forum</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">Welcome back</h2>
          <p className="text-body-sm text-on-surface-variant">
            Sign in to continue your conversations and AI workspaces.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-label-md text-on-surface mb-1.5">
              Email address
            </label>
            <div className="flex items-center bg-surface-container-low rounded-xl px-3.5 h-12">
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent outline-none text-body-md text-on-surface"
              />
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                mail
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="text-label-md text-on-surface">
                Password
              </label>
              <Link to="/forgot-password" className="text-label-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="flex items-center bg-surface-container-low rounded-xl px-3.5 h-12">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-transparent outline-none text-body-md text-on-surface"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
                className="text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60"
          >
            <span>{submitting ? 'Signing in...' : 'Log in'}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        {import.meta.env.DEV && (
          <div className="p-4 rounded-2xl bg-surface-container-low space-y-2.5">
            <p className="text-label-sm text-on-surface-variant font-semibold">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  quickSignInDemo('u-adeel');
                  navigate('/chats');
                }}
                className="h-10 px-3 rounded-xl bg-surface-container-lowest text-primary text-label-sm font-semibold shadow-xs hover:bg-surface-container"
              >
                Adeel (Super Admin)
              </button>
              <button
                type="button"
                onClick={() => {
                  quickSignInDemo('u-hamza');
                  navigate('/chats');
                }}
                className="h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface text-label-sm font-semibold shadow-xs hover:bg-surface-container"
              >
                Hamza (Standard User)
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-body-sm text-on-surface-variant">
          Don&apos;t have an account?{' '}
          <Link to="/sign-up" className="text-primary font-semibold hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </MobileStackLayout>
  );
};
