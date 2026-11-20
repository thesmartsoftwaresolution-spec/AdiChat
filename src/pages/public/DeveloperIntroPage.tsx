import React from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';
import { sanitizeExternalUrl } from '../../utils/validators';

export const DeveloperIntroPage: React.FC = () => {
  const { state, isAdmin } = useAppState();
  const dev = state.developerProfile;

  const emailHref = sanitizeExternalUrl(dev.email_url);
  const whatsappHref = sanitizeExternalUrl(dev.whatsapp_url);
  const githubHref = sanitizeExternalUrl(dev.github_url);
  const linkedinHref = sanitizeExternalUrl(dev.linkedin_url);

  if (!dev.is_visible && !isAdmin) {
    return (
      <MobileStackLayout title="Developer Intro" backTo="/">
        <div className="max-w-lg mx-auto px-margin-mobile py-12 text-center space-y-3">
          <h2 className="text-headline-md text-on-surface">Developer profile is currently private</h2>
          <p className="text-body-sm text-on-surface-variant">
            This profile has been hidden by an administrator.
          </p>
        </div>
      </MobileStackLayout>
    );
  }

  return (
    <MobileStackLayout
      title="Developer Intro"
      backTo="/"
      rightSlot={
        isAdmin ? (
          <Link
            to="/admin/developer-profile"
            className="h-9 px-3 rounded-xl bg-surface-container-low text-primary text-label-sm font-semibold inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>Edit</span>
          </Link>
        ) : null
      }
    >
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-6 space-y-6">
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center space-y-3">
          <UserAvatar name={dev.name} src={dev.photo_path} size="xl" isOnline showPresence />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-semibold mb-1.5">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>Creator &amp; Lead Architect</span>
            </div>
            <h2 className="text-headline-lg text-on-surface">{dev.name}</h2>
            <p className="text-body-md text-primary font-medium">{dev.subtitle}</p>
          </div>
          {dev.bio && (
            <p className="text-body-md text-on-surface-variant leading-relaxed max-w-lg">
              {dev.bio}
            </p>
          )}
        </div>

        {dev.why_built && (
          <div className="p-5 rounded-2xl bg-surface-container-low space-y-2">
            <h3 className="text-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
              <span>Why AdiChat Was Built</span>
            </h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed">{dev.why_built}</p>
          </div>
        )}

        <div className="space-y-2.5">
          <h3 className="text-label-md text-on-surface px-1">Direct Connect</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {emailHref && (
              <a
                href={emailHref}
                className="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface">Email</p>
                    <p className="text-caption text-on-surface-variant">Direct correspondence</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">
                  open_in_new
                </span>
              </a>
            )}
            {githubHref && (
              <a
                href={githubHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">code</span>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface">GitHub</p>
                    <p className="text-caption text-on-surface-variant">Repositories &amp; OSS</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">
                  open_in_new
                </span>
              </a>
            )}
            {linkedinHref && (
              <a
                href={linkedinHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary-container/70 text-on-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">work</span>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface">LinkedIn</p>
                    <p className="text-caption text-on-surface-variant">Engineering profile</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">
                  open_in_new
                </span>
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface">WhatsApp</p>
                    <p className="text-caption text-on-surface-variant">Quick connect</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[18px]">
                  open_in_new
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </MobileStackLayout>
  );
};
