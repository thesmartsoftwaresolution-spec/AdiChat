import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { AIBadge } from '../../components/ui/Avatar';
import { evaluatePasswordStrength, isValidEmail } from '../../utils/validators';

export const SignUpPage: React.FC = () => {
  const { signUp } = useAppState();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmationNotice(null);

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!strength.isValid) {
      setError('Password must be at least 8 characters with uppercase and number/symbol.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }
    if (!acceptTerms) {
      setError('Please accept the Terms and Privacy Charter to continue.');
      return;
    }

    setSubmitting(true);
    const res = await signUp(fullName, email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Could not create account.');
      return;
    }
    if ('requiresEmailVerification' in res && res.requiresEmailVerification) {
      setConfirmationNotice('Your account has been created. Please verify your email using the link we sent before logging in. Check your inbox and spam folder.');
      return;
    }
    navigate('/chats');
  };

  return (
    <MobileStackLayout title="Sign Up" backTo="/">
      <div className="max-w-md w-full mx-auto px-margin-mobile py-6 space-y-5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed/40 text-on-primary-fixed-variant text-label-sm font-medium mb-2">
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            Zero-latency neural chat
          </span>
          <h2 className="text-headline-lg text-on-surface tracking-tight">Create account</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Join AdiChat and start chatting with people and your AI assistants.
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
        {confirmationNotice && (
          <div role="status" className="p-3 rounded-xl bg-primary/10 text-on-surface text-body-sm space-y-2">
            <p>{confirmationNotice}</p>
            <Link to="/login" className="inline-flex text-primary font-semibold hover:underline">Go to login</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-name" className="block text-label-md text-on-surface mb-1.5">
              Full name
            </label>
            <div className="relative flex items-center bg-surface-container-low rounded-xl px-3.5 h-12">
              <input
                id="signup-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Adeel Bhatti"
                className="w-full bg-transparent outline-none text-body-md text-on-surface placeholder:text-outline"
              />
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                person
              </span>
            </div>
            <p className="text-caption text-on-surface-variant mt-1">
              Your display handle for human and AI dialogues.
            </p>
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-label-md text-on-surface mb-1.5">
              Email address
            </label>
            <div className="relative flex items-center bg-surface-container-low rounded-xl px-3.5 h-12">
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-transparent outline-none text-body-md text-on-surface placeholder:text-outline"
              />
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                mail
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-label-md text-on-surface mb-1.5">
              Password
            </label>
            <div className="relative flex items-center bg-surface-container-low rounded-xl px-3.5 h-12">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-transparent outline-none text-body-md text-on-surface placeholder:text-outline"
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
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={`h-1 rounded-full ${
                    strength.score >= step ? 'bg-secondary' : 'bg-surface-container-highest'
                  }`}
                />
              ))}
            </div>
            <p className="text-caption text-on-surface-variant mt-1">
              Strength: <strong className="text-on-surface">{strength.label}</strong> (8+ chars,
              uppercase &amp; number/symbol)
            </p>
          </div>

          <div>
            <label htmlFor="signup-confirm" className="block text-label-md text-on-surface mb-1.5">
              Confirm password
            </label>
            <div className="relative flex items-center bg-surface-container-low rounded-xl px-3.5 h-12">
              <input
                id="signup-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-transparent outline-none text-body-md text-on-surface placeholder:text-outline"
              />
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                verified_user
              </span>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-body-sm text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 accent-primary w-4 h-4 rounded"
            />
            <span>
              I accept AdiChat&apos;s{' '}
              <span className="text-primary font-medium">Terms of Intelligence Protocol</span> and{' '}
              <span className="text-primary font-medium">Privacy Charter</span>.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-60"
          >
            <span>{submitting ? 'Creating account...' : 'Create account'}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">smart_toy</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-label-md text-on-surface">Adi Personal Assistant</span>
              <AIBadge compact />
            </div>
            <p className="text-caption text-on-surface-variant truncate">
              Configured automatically when your workspace is ready.
            </p>
          </div>
        </div>

        <p className="text-center text-body-sm text-on-surface-variant">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </MobileStackLayout>
  );
};
