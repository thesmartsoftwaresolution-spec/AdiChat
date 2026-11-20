import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AdminLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';
import { ToggleSwitch } from '../../components/ui/Feedback';

export const AdminDeveloperProfilePage: React.FC = () => {
  const { state, adminUpdateDeveloperProfile, pushToast } = useAppState();
  const dev = state.developerProfile;
  const photoFileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(dev.name);
  const [subtitle, setSubtitle] = useState(dev.subtitle);
  const [bio, setBio] = useState(dev.bio || '');
  const [whyBuilt, setWhyBuilt] = useState(dev.why_built || '');
  const [photoPath, setPhotoPath] = useState<string | null>(dev.photo_path);
  const [emailUrl, setEmailUrl] = useState(dev.email_url || '');
  const [githubUrl, setGithubUrl] = useState(dev.github_url || '');
  const [linkedinUrl, setLinkedinUrl] = useState(dev.linkedin_url || '');
  const [whatsappUrl, setWhatsappUrl] = useState(dev.whatsapp_url || '');
  const [isVisible, setIsVisible] = useState(dev.is_visible);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast('Please select an image file.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      pushToast('Developer photo must be under 2 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoPath(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    adminUpdateDeveloperProfile({
      name: name.trim() || 'Adeel Bhatti',
      subtitle: subtitle.trim(),
      bio: bio.trim() || null,
      why_built: whyBuilt.trim() || null,
      photo_path: photoPath,
      email_url: emailUrl.trim() || null,
      github_url: githubUrl.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      whatsapp_url: whatsappUrl.trim() || null,
      is_visible: isVisible,
    });
  };

  return (
    <AdminLayout title="Admin - Developer Profile">
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low">
          <div>
            <p className="text-label-md text-on-surface">Public Developer Intro Sync</p>
            <p className="text-caption text-on-surface-variant">
              Changes published here immediately update the public /developer page.
            </p>
          </div>
          <Link
            to="/developer"
            className="h-9 px-3.5 rounded-xl bg-surface-container-lowest text-primary text-label-sm font-semibold inline-flex items-center gap-1 shadow-xs"
          >
            <span>Preview</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </Link>
        </div>

        <form
          onSubmit={handleSave}
          className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
            <div className="flex items-center gap-3">
              <UserAvatar name={name || 'Adeel Bhatti'} src={photoPath} size="lg" />
              <div className="space-y-1">
                <p className="text-body-md-medium text-on-surface">Developer Portrait</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={photoFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    aria-label="Upload developer photo"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoFileRef.current?.click()}
                    className="h-8 px-3 rounded-lg bg-secondary-container text-on-secondary-container text-caption font-semibold"
                  >
                    {photoPath ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {photoPath && (
                    <button
                      type="button"
                      onClick={() => setPhotoPath(null)}
                      className="h-8 px-3 rounded-lg bg-surface-container-low text-error text-caption font-semibold"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-body-sm font-medium text-on-surface">Public Visibility</p>
                <p className="text-caption text-on-surface-variant">Visible on /developer</p>
              </div>
              <ToggleSwitch
                checked={isVisible}
                onChange={setIsVisible}
                label="Public visibility of developer profile"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="dev-name" className="block text-label-md text-on-surface mb-1">
                Name
              </label>
              <input
                id="dev-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
              />
            </div>
            <div>
              <label htmlFor="dev-subtitle" className="block text-label-md text-on-surface mb-1">
                Subtitle
              </label>
              <input
                id="dev-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
              />
            </div>
          </div>

          <div>
            <label htmlFor="dev-bio" className="block text-label-md text-on-surface mb-1">
              Short Bio
            </label>
            <textarea
              id="dev-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
            />
          </div>

          <div>
            <label htmlFor="dev-why" className="block text-label-md text-on-surface mb-1">
              Why AdiChat Was Built
            </label>
            <textarea
              id="dev-why"
              rows={3}
              value={whyBuilt}
              onChange={(e) => setWhyBuilt(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="dev-email" className="block text-label-sm text-on-surface mb-1">
                Email URL (mailto:)
              </label>
              <input
                id="dev-email"
                type="text"
                value={emailUrl}
                onChange={(e) => setEmailUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface"
              />
            </div>
            <div>
              <label htmlFor="dev-github" className="block text-label-sm text-on-surface mb-1">
                GitHub URL (https://)
              </label>
              <input
                id="dev-github"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface"
              />
            </div>
            <div>
              <label htmlFor="dev-linkedin" className="block text-label-sm text-on-surface mb-1">
                LinkedIn URL (https://)
              </label>
              <input
                id="dev-linkedin"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface"
              />
            </div>
            <div>
              <label htmlFor="dev-wa" className="block text-label-sm text-on-surface mb-1">
                WhatsApp URL (https://)
              </label>
              <input
                id="dev-wa"
                type="url"
                value={whatsappUrl}
                onChange={(e) => setWhatsappUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-primary text-on-primary text-label-md shadow-md"
          >
            Save &amp; Publish Developer Profile
          </button>
        </form>
      </div>
    </AdminLayout>
  );
};
