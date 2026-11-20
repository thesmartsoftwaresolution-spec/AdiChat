import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { evaluatePasswordStrength } from '../../utils/validators';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  const strength = evaluatePasswordStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!strength.isValid) {
      setError('Please meet all password strength requirements.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setUpdated(true);
  };

  return (
    <MobileStackLayout title="Reset Password" backTo="/login">
      <div className="max-w-md w-full mx-auto px-margin-mobile py-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-secondary-container text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">lock_reset</span>
          </div>
          <h2 className="text-headline-lg text-on-surface">Reset password</h2>
          <p className="text-body-sm text-on-surface-variant">
            Set a strong new password for your AdiChat account.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-pass" className="block text-label-md text-on-surface mb-1.5">
              New password
            </label>
            <div className="flex items-center bg-surface-container-low rounded-xl px-3.5 h-12">
              <input
                id="reset-pass"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-transparent outline-none text-body-md text-on-surface"
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowPass((s) => !s)}
                className="text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reset-confirm" className="block text-label-md text-on-surface mb-1.5">
              Confirm new password
            </label>
            <div className="flex items-center bg-surface-container-low rounded-xl px-3.5 h-12">
              <input
                id="reset-confirm"
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-transparent outline-none text-body-md text-on-surface"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low space-y-2">
            <div className="flex items-center justify-between text-caption">
              <span className="text-on-surface-variant">Security strength</span>
              <span className="font-semibold text-secondary">{strength.label}</span>
            </div>
            <div className="space-y-1.5 text-body-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    strength.hasMinLength ? 'text-secondary' : 'text-outline'
                  }`}
                >
                  check_circle
                </span>
                At least 8 characters
              </p>
              <p className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    strength.hasUppercase ? 'text-secondary' : 'text-outline'
                  }`}
                >
                  check_circle
                </span>
                At least one uppercase letter
              </p>
              <p className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    strength.hasNumberOrSpecial ? 'text-secondary' : 'text-outline'
                  }`}
                >
                  check_circle
                </span>
                At least one number or special character
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md"
          >
            <span>Update password</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        {updated && (
          <div className="p-4 rounded-2xl bg-secondary-container/40 space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
              <div>
                <p className="text-label-md text-on-surface">Password updated successfully!</p>
                <p className="text-body-sm text-on-surface-variant">
                  You can now log in with your new credentials across all your synced devices.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex h-10 px-4 rounded-xl bg-primary text-on-primary text-label-sm font-semibold items-center gap-1.5"
            >
              <span>Log in now</span>
              <span className="material-symbols-outlined text-[16px]">login</span>
            </Link>
          </div>
        )}
      </div>
    </MobileStackLayout>
  );
};
