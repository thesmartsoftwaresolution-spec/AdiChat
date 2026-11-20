import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { useTheme } from '../../app/providers/ThemeProvider';
import { PublicLayout } from '../../components/layout/AppShells';
import { AIBadge } from '../../components/ui/Avatar';

export const WelcomeLandingPage: React.FC = () => {
  const { effectiveTheme, toggleLightDark } = useTheme();
  const { quickSignInDemo } = useAppState();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [devSheetOpen, setDevSheetOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('autostart') === '1') {
      quickSignInDemo('u-adeel');
      navigate('/chats', { replace: true });
    }
  }, [searchParams, quickSignInDemo, navigate]);

  return (
    <PublicLayout maxWidth="max-w-lg lg:max-w-5xl">
      <div className="flex flex-col w-full pb-10">
        {/* Top Utility & Brand Bar */}
        <header className="flex items-center justify-between px-space-md py-space-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[18px]">forum</span>
            </div>
            <span className="text-headline-md text-primary tracking-tight">AdiChat</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Toggle Theme Preview"
              onClick={toggleLightDark}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined material-symbols-filled text-[16px] text-primary">
                {effectiveTheme === 'dark' ? 'dark_mode' : 'light_mode'}
              </span>
              <span className="text-label-sm font-medium capitalize">{effectiveTheme}</span>
            </button>
          </div>
        </header>

        {/* Responsive Desktop Split / Mobile Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 lg:items-center px-space-md pt-space-xs">
          {/* Illustrated Conversational Canvas */}
          <div className="pb-space-sm lg:order-2">
            <div className="relative w-full rounded-2xl bg-surface-container-low p-space-md overflow-hidden flex flex-col justify-end min-h-[240px] lg:min-h-[380px] shadow-xs">
              <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-secondary-container/30 blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-primary-fixed/20 blur-xl pointer-events-none" />

              {/* Human Sent Message */}
              <div className="relative z-10 self-end max-w-[82%] mb-space-sm">
                <div className="bg-msg-sent rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm">
                  <p className="text-body-sm text-on-surface">
                    Can we plan the research roadmap for tomorrow?
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-timestamp text-on-surface-variant">09:41 AM</span>
                    <span className="material-symbols-outlined text-[12px] text-secondary">
                      done_all
                    </span>
                  </div>
                </div>
              </div>

              {/* Human Received Message */}
              <div className="relative z-10 self-start max-w-[80%] mb-space-sm">
                <div className="bg-surface-container-lowest rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant text-[11px] font-semibold shrink-0">
                    AK
                  </div>
                  <div>
                    <p className="text-body-sm text-on-surface">
                      Yes! Let&apos;s ask our Research Copilot to draft the prompt tree.
                    </p>
                    <span className="text-timestamp text-on-surface-variant block mt-0.5">
                      09:42 AM
                    </span>
                  </div>
                </div>
              </div>

              {/* Prominent Emerald AI Assistant Bubble */}
              <div className="relative z-10 self-start max-w-[90%]">
                <div className="bg-primary text-on-primary rounded-2xl rounded-tl-sm px-4 py-3 shadow-md flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-on-primary/15 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[13px] text-secondary-fixed">
                          auto_awesome
                        </span>
                      </div>
                      <span className="text-label-sm font-semibold">Research Copilot</span>
                    </div>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-on-primary/15 text-[10px] font-semibold">
                      <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                      AI
                    </span>
                  </div>
                  <p className="text-body-sm opacity-95 leading-relaxed">
                    I prepared 4 synthesis pillars and indexed team notes. Tap below to launch your
                    workspace!
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-timestamp opacity-75">Just now</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-on-primary/15 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" /> Live sync
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Narrative + Feature Highlights + Actions */}
          <div className="lg:order-1">
            <div className="pt-space-sm pb-space-xs text-left">
              <h1 className="text-headline-lg-mobile lg:text-headline-xl text-on-surface tracking-tight mb-2">
                Chat with people. Build your own AI assistants.
              </h1>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                The modern messaging app designed for seamless conversations with friends, groups,
                and personalized AI helpers.
              </p>
            </div>

            <div className="py-space-sm flex flex-col gap-2.5">
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-surface-container-low">
                <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-xs text-primary">
                  <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-headline-sm text-on-surface">Realtime chat</span>
                  <span className="text-body-sm text-on-surface-variant">
                    1-to-1 and group messaging with instantaneous delivery receipts.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-surface-container-low">
                <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-xs text-primary">
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-headline-sm text-on-surface">Groups</span>
                  <span className="text-body-sm text-on-surface-variant">
                    Collaborate seamlessly with friends, family, and study circles.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-surface-container-low">
                <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-xs text-primary">
                  <span className="material-symbols-outlined text-[20px]">neurology</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-headline-sm text-on-surface">Your AI assistants</span>
                    <AIBadge compact />
                  </div>
                  <span className="text-body-sm text-on-surface-variant">
                    Create and invite bespoke AI personas directly into active team chats.
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-space-sm flex flex-col gap-2.5">
              <Link
                to="/sign-up"
                className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-opacity"
              >
                <span>Create account</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  className="h-12 rounded-xl bg-surface-container-low text-primary text-label-md flex items-center justify-center hover:bg-surface-container transition-colors"
                >
                  Log in
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    quickSignInDemo('u-adeel');
                    navigate('/chats');
                  }}
                  className="h-12 rounded-xl bg-secondary-container text-on-secondary-container text-label-md flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>Demo Workspace</span>
                </button>
              </div>
            </div>

            <div className="pt-space-md flex items-center justify-center gap-4 text-center">
              <Link
                to="/developer"
                className="text-label-sm text-on-surface-variant underline decoration-outline-variant underline-offset-4 hover:text-primary py-1"
              >
                About the developer
              </Link>
              <button
                type="button"
                onClick={() => setDevSheetOpen(true)}
                className="text-label-sm text-on-surface-variant hover:text-primary py-1"
              >
                Quick overview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Intro Quick Bottom Sheet */}
      {devSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dev-sheet-title"
          className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setDevSheetOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-surface-container-lowest rounded-t-2xl md:rounded-2xl p-space-md pb-8 shadow-2xl flex flex-col gap-space-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-surface-container-highest mx-auto md:hidden" />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined text-[18px]">code</span>
                </div>
                <div>
                  <h2 id="dev-sheet-title" className="text-headline-sm text-on-surface">
                    Developer Intro
                  </h2>
                  <p className="text-caption text-on-surface-variant">Adeel Bhatti • AdiChat</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close developer overview"
                onClick={() => setDevSheetOpen(false)}
                className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-low space-y-2">
              <p className="text-body-sm text-on-surface leading-relaxed">
                AdiChat unifies human real-time messaging with customizable personal and group AI
                copilots powered by high-depth reasoning.
              </p>
              <div className="flex items-center gap-2 text-label-sm text-primary">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Built for clarity, privacy &amp; speed</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/developer"
                className="flex-1 h-11 rounded-xl bg-surface-container-low text-primary text-label-md flex items-center justify-center"
              >
                Full Profile
              </Link>
              <button
                type="button"
                onClick={() => setDevSheetOpen(false)}
                className="flex-1 h-11 rounded-xl bg-primary text-on-primary text-label-md"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
};
