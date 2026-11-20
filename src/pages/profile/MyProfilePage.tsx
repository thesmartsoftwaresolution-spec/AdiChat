import React, { useRef, useState } from 'react';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';

export const MyProfilePage: React.FC = () => {
  const { currentUser, currentUserRoles, updateMyProfile, pushToast } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [title, setTitle] = useState(currentUser?.title || '');
  const [about, setAbout] = useState(currentUser?.about || '');

  if (!currentUser) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast('Please choose an image file (PNG, JPG, WebP).', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      pushToast('Profile photo must be under 2 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateMyProfile({ avatar_path: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      pushToast('Full name is required.', 'error');
      return;
    }
    updateMyProfile({
      full_name: fullName.trim(),
      title: title.trim() || null,
      about: about.trim() || null,
    });
  };

  return (
    <MobileStackLayout title="My Profile" backTo="/settings">
      <div className="max-w-xl mx-auto w-full px-margin-mobile py-6 space-y-6">
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col items-center text-center space-y-3">
          <UserAvatar
            name={currentUser.full_name}
            src={currentUser.avatar_path}
            size="xl"
            isOnline={currentUser.is_online}
            showPresence
          />
          <div>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-headline-md text-on-surface">{currentUser.full_name}</h2>
              {currentUserRoles.includes('super_admin') && (
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-body-sm text-on-surface-variant">{currentUser.email}</p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              aria-label="Upload profile photo"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-9 px-3.5 rounded-xl bg-secondary-container text-on-secondary-container text-label-sm font-semibold inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              <span>{currentUser.avatar_path ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
            {currentUser.avatar_path && (
              <button
                type="button"
                onClick={() => updateMyProfile({ avatar_path: null })}
                className="h-9 px-3.5 rounded-xl bg-surface-container-low text-error text-label-sm font-semibold"
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="p-5 rounded-2xl bg-surface-container-low space-y-4">
          <div>
            <label htmlFor="prof-email" className="block text-label-md text-on-surface mb-1">
              Email Address (Read-only)
            </label>
            <input
              id="prof-email"
              type="email"
              value={currentUser.email || ''}
              readOnly
              disabled
              className="w-full h-12 px-4 rounded-xl bg-surface-container text-body-md text-on-surface-variant outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="prof-name" className="block text-label-md text-on-surface mb-1">
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface"
            />
          </div>

          <div>
            <label htmlFor="prof-title" className="block text-label-md text-on-surface mb-1">
              Role / Title
            </label>
            <input
              id="prof-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface"
            />
          </div>

          <div>
            <label htmlFor="prof-about" className="block text-label-md text-on-surface mb-1">
              About / Status Bio
            </label>
            <textarea
              id="prof-about"
              rows={3}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full p-4 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md shadow-md"
          >
            Save Profile Changes
          </button>
        </form>
      </div>
    </MobileStackLayout>
  );
};
