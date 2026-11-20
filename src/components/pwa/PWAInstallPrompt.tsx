import React, { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const PWAInstallPrompt: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent || installing) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallEvent(null);
    } finally {
      setInstalling(false);
    }
  };

  if (!installEvent || installed || dismissed) return null;

  return (
    <aside
      aria-label="Install AdiChat"
      className="fixed z-[90] bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-3 right-3 sm:left-auto sm:right-5 sm:w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-3.5 shadow-xl"
    >
      <div className="flex items-center gap-3">
        <img src="/icons/adichat.svg" alt="" className="w-11 h-11 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-label-md text-on-surface">Install AdiChat</p>
          <p className="text-caption text-on-surface-variant">Chat faster from your home screen.</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install prompt"
          className="w-8 h-8 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => void handleInstall()}
        disabled={installing}
        className="mt-3 w-full h-10 rounded-xl bg-primary text-on-primary text-label-sm font-semibold disabled:opacity-60"
      >
        {installing ? 'Opening install…' : 'Install app'}
      </button>
    </aside>
  );
};
