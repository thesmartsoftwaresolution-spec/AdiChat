import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { useTheme } from '../../app/providers/ThemeProvider';
import { AppTabLayout } from '../../components/layout/AppShells';
import { AIBadge, UserAvatar } from '../../components/ui/Avatar';
import { ConfirmDialog, ToggleSwitch } from '../../components/ui/Feedback';
import type { ThemePreference } from '../../types/database';

export const SettingsPage: React.FC = () => {
  const {
    state,
    currentUser,
    currentUserRoles,
    isAdmin,
    updateMySettings,
    updateMyProfile,
    logout,
    pushToast,
  } = useAppState();
  const { preference, setTheme } = useTheme();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (!currentUser) return null;

  const settings = state.userSettings[currentUser.id] || {
    user_id: currentUser.id,
    show_last_seen: true,
    show_online_status: true,
    read_receipts_enabled: true,
    notify_messages: true,
    notify_groups: true,
    notify_ai_replies: true,
    disappearing_timer: 'off' as const,
    auto_download_media: 'wifi' as const,
    created_at: currentUser.created_at,
    updated_at: currentUser.updated_at,
  };

  const handleThemeChange = (pref: ThemePreference) => {
    setTheme(pref);
    updateMyProfile({ theme_preference: pref });
  };

  return (
    <AppTabLayout title="Settings">
      <div className="max-w-2xl mx-auto w-full px-margin-mobile md:px-6 pt-space-sm space-y-5 pb-10">
        {/* Profile Header Card */}
        <Link
          to="/profile"
          className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <UserAvatar
              name={currentUser.full_name}
              src={currentUser.avatar_path}
              size="md"
              isOnline={currentUser.is_online}
              showPresence
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-headline-sm text-on-surface truncate">
                  {currentUser.full_name}
                </h2>
                {currentUserRoles.includes('super_admin') && (
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary text-[11px] font-semibold">
                    Super Admin
                  </span>
                )}
              </div>
              <p className="text-caption text-on-surface-variant truncate">{currentUser.email}</p>
              <p className="text-timestamp text-secondary font-medium mt-0.5">
                ● Syncing via Quantum Cloud
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-outline">chevron_right</span>
        </Link>

        {/* ACCOUNT */}
        <section className="space-y-1.5">
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
            Account
          </h3>
          <div className="rounded-2xl bg-surface-container-lowest shadow-xs divide-y divide-outline-variant/15">
            <Link to="/profile" className="flex items-center justify-between p-3.5 hover:bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[19px]">mail</span>
                </div>
                <div>
                  <p className="text-body-md-medium text-on-surface">Email Address</p>
                  <p className="text-caption text-on-surface-variant">{currentUser.email}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
            </Link>

            <Link to="/reset-password" className="flex items-center justify-between p-3.5 hover:bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[19px]">lock_reset</span>
                </div>
                <div>
                  <p className="text-body-md-medium text-on-surface">Change Password</p>
                  <p className="text-caption text-on-surface-variant">Update account credentials</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
            </Link>
          </div>
        </section>

        {/* PRIVACY & PRESENCE */}
        <section className="space-y-1.5">
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
            Privacy &amp; Presence
          </h3>
          <div className="rounded-2xl bg-surface-container-lowest shadow-xs divide-y divide-outline-variant/15">
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[19px]">visibility</span>
                </div>
                <div>
                  <p className="text-body-md-medium text-on-surface">Last Seen &amp; Online</p>
                  <p className="text-caption text-on-surface-variant">
                    {settings.show_online_status ? 'Everyone' : 'Hidden'}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.show_online_status}
                onChange={(v) => updateMySettings({ show_online_status: v, show_last_seen: v })}
                label="Show Last Seen and Online status"
              />
            </div>

            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[19px]">done_all</span>
                </div>
                <div>
                  <p className="text-body-md-medium text-on-surface">Read Receipts</p>
                  <p className="text-caption text-on-surface-variant">
                    Recipients can see when you read their text
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.read_receipts_enabled}
                onChange={(v) => updateMySettings({ read_receipts_enabled: v })}
                label="Read Receipts"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
                  <span className="material-symbols-outlined text-[19px]">timer</span>
                </div>
                <div className="min-w-0">
                  <p className="text-body-md-medium text-on-surface">Disappearing Messages</p>
                  <p className="text-caption text-on-surface-variant">
                    Default timer for new chats
                  </p>
                </div>
              </div>
              <select
                aria-label="Disappearing Messages default timer"
                value={settings.disappearing_timer || 'off'}
                onChange={(e) => {
                  const val = e.target.value as 'off' | '24h' | '7d' | '90d';
                  updateMySettings({ disappearing_timer: val });
                  pushToast(`Disappearing timer set to ${val}`, 'success');
                }}
                className="h-9 px-3 rounded-xl bg-surface-container-low text-label-sm text-on-surface outline-none shrink-0"
              >
                <option value="off">Off</option>
                <option value="24h">24 hours</option>
                <option value="7d">7 days</option>
                <option value="90d">90 days</option>
              </select>
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS & BADGES */}
        <section className="space-y-1.5">
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
            Notifications &amp; Badges
          </h3>
          <div className="rounded-2xl bg-surface-container-lowest shadow-xs divide-y divide-outline-variant/15">
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[19px]">notifications</span>
                </div>
                <span className="text-body-md-medium text-on-surface">Message Notifications</span>
              </div>
              <ToggleSwitch
                checked={settings.notify_messages}
                onChange={(v) => updateMySettings({ notify_messages: v })}
                label="Message Notifications"
              />
            </div>

            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[19px]">groups</span>
                </div>
                <span className="text-body-md-medium text-on-surface">Group Alerts</span>
              </div>
              <ToggleSwitch
                checked={settings.notify_groups}
                onChange={(v) => updateMySettings({ notify_groups: v })}
                label="Group Alerts"
              />
            </div>

            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary-container/60 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[19px]">auto_awesome</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-body-md-medium text-on-surface">AI Assistant Replies</span>
                    <AIBadge compact />
                  </div>
                  <p className="text-caption text-on-surface-variant">
                    Immediate ping on assistant completion
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.notify_ai_replies}
                onChange={(v) => updateMySettings({ notify_ai_replies: v })}
                label="AI Assistant Replies"
              />
            </div>
          </div>
        </section>

        {/* APPEARANCE & CANVAS */}
        <section className="space-y-1.5">
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
            Appearance &amp; Canvas
          </h3>
          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px] text-primary">palette</span>
                <span className="text-body-md-medium text-on-surface">Theme Mode</span>
              </div>
              <span className="text-caption text-primary font-medium capitalize">
                {preference}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-surface-container-low">
              {[
                { id: 'light', label: 'Light', icon: 'light_mode' },
                { id: 'dark', label: 'Dark', icon: 'dark_mode' },
                { id: 'system', label: 'System', icon: 'devices' },
              ].map((opt) => {
                const active = preference === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleThemeChange(opt.id as ThemePreference)}
                    className={`py-2.5 rounded-lg text-label-sm flex flex-col items-center gap-1 transition-colors ${
                      active
                        ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* STORAGE & DATA */}
        <section className="space-y-1.5">
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
            Storage &amp; Data
          </h3>
          <div className="rounded-2xl bg-surface-container-lowest shadow-xs divide-y divide-outline-variant/15">
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[19px]">data_usage</span>
                </div>
                <div>
                  <p className="text-body-md-medium text-on-surface">Shared Media Footprint</p>
                  <p className="text-caption text-on-surface-variant">
                    {state.attachments.length} cached workspace assets
                  </p>
                </div>
              </div>
              <span className="text-label-sm text-primary font-semibold">Synced</span>
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
                  <span className="material-symbols-outlined text-[19px]">wifi</span>
                </div>
                <div className="min-w-0">
                  <p className="text-body-md-medium text-on-surface">Auto-Download Media</p>
                  <p className="text-caption text-on-surface-variant">
                    Photos, files &amp; voice notes
                  </p>
                </div>
              </div>
              <select
                aria-label="Auto-Download Media"
                value={settings.auto_download_media || 'wifi'}
                onChange={(e) => {
                  const val = e.target.value as 'wifi' | 'always' | 'never';
                  updateMySettings({ auto_download_media: val });
                  pushToast(`Auto-download set to ${val}`, 'success');
                }}
                className="h-9 px-3 rounded-xl bg-surface-container-low text-label-sm text-on-surface outline-none shrink-0"
              >
                <option value="wifi">Wi-Fi Only</option>
                <option value="always">Always</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </section>

        {/* ADICHAT CORE ECOSYSTEM */}
        <section className="space-y-1.5">
          <h3 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
            AdiChat Core Ecosystem
          </h3>
          <div className="rounded-2xl bg-surface-container-lowest shadow-xs divide-y divide-outline-variant/15">
            <Link to="/developer" className="flex items-center justify-between p-3.5 hover:bg-surface-container-low">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">code</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-body-md-medium text-on-surface">About the Developer</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-semibold">
                      Dev Special
                    </span>
                  </div>
                  <p className="text-caption text-on-surface-variant truncate">
                    {state.developerProfile.name} • Learn about AdiChat
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline">arrow_forward</span>
            </Link>

            {isAdmin && (
              <Link to="/admin" className="flex items-center justify-between p-3.5 hover:bg-surface-container-low">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[19px]">admin_panel_settings</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-body-md-medium text-on-surface">Admin Panel</span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container/70 text-on-secondary-container text-[10px] font-semibold">
                        Admin Only
                      </span>
                    </div>
                    <p className="text-caption text-on-surface-variant truncate">
                      Access system metrics, user moderation &amp; settings
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline">chevron_right</span>
              </Link>
            )}
          </div>
        </section>

        {/* Logout */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="w-full h-12 rounded-2xl bg-surface-container-lowest shadow-xs text-error text-label-md flex items-center justify-center gap-2 hover:bg-error-container/20"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Log Out</span>
          </button>
          <p className="text-center text-timestamp text-on-surface-variant">
            AdiChat Web Client • v4.12.0
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Log out of AdiChat?"
        description="Your active session on this browser will be signed out."
        confirmLabel="Log Out"
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
          pushToast('Signed out of AdiChat', 'info');
          navigate('/');
        }}
      />
    </AppTabLayout>
  );
};
