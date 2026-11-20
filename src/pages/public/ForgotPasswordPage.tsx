import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { isValidEmail } from '../../utils/validators';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <MobileStackLayout title="Forgot Password" backTo="/login">
      <div className="max-w-md w-full mx-auto px-margin-mobile py-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-secondary-container/60 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">lock_reset</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">Forgot password?</h2>
          <p className="text-body-sm text-on-surface-variant">
            Enter your account email and we will send a secure recovery link if an account exists.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="p-4 rounded-2xl bg-secondary-container/40 space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">mark_email_read</span>
              <div>
                <p className="text-label-md text-on-surface">Check your inbox</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  If {email} is registered with AdiChat, a password reset link has been dispatched.
                </p>
              </div>
            </div>
            <Link
              to="/reset-password"
              className="w-full h-11 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2"
            >
              <span>Open Recovery Link Preview</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-label-md text-on-surface mb-1.5">
                Email address
              </label>
              <div className="flex items-center bg-surface-container-low rounded-xl px-3.5 h-12">
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-transparent outline-none text-body-md text-on-surface"
                />
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                  mail
                </span>
              </div>
            </div>
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md"
            >
              <span>Send reset link</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        )}

        <p className="text-center text-body-sm text-on-surface-variant">
          Remembered your password?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </MobileStackLayout>
  );
};
