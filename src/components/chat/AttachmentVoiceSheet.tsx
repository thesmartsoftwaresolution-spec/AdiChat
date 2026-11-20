import React, { useEffect, useState } from 'react';

interface AttachmentVoiceSheetProps {
  open: boolean;
  initialTab?: 'attach' | 'voice';
  onClose: () => void;
  onSendAttachment: (input: {
    type: 'image' | 'file';
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    previewUrl?: string;
  }) => void;
  onSendVoiceNote: (durationMs: number) => void;
}

export const AttachmentVoiceSheet: React.FC<AttachmentVoiceSheetProps> = ({
  open,
  initialTab = 'attach',
  onClose,
  onSendAttachment,
  onSendVoiceNote,
}) => {
  const [tab, setTab] = useState<'attach' | 'voice'>(initialTab);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, open]);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  if (!open) return null;

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = kind === 'image' ? URL.createObjectURL(file) : undefined;
    onSendAttachment({
      type: kind,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      previewUrl,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Attachment Picker and Voice Note"
      className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container-lowest rounded-t-2xl md:rounded-2xl p-5 pb-7 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-surface-container-highest mx-auto md:hidden" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low">
            <button
              type="button"
              onClick={() => setTab('attach')}
              className={`px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors ${
                tab === 'attach'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              Attachments
            </button>
            <button
              type="button"
              onClick={() => setTab('voice')}
              className={`px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors ${
                tab === 'voice'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              Voice Note
            </button>
          </div>
          <button
            type="button"
            aria-label="Close picker"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {tab === 'attach' ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">photo_library</span>
              </div>
              <span className="text-label-md text-on-surface">Photo &amp; Media</span>
              <span className="text-caption text-on-surface-variant">PNG, JPG, WebP up to 25 MB</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileInput(e, 'image')}
              />
            </label>

            <label className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <span className="text-label-md text-on-surface">Document</span>
              <span className="text-caption text-on-surface-variant">PDF, TS, TXT, ZIP files</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.ts,.tsx,.json,.zip"
                className="hidden"
                onChange={(e) => handleFileInput(e, 'file')}
              />
            </label>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface-container-low flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  recording ? 'bg-error animate-ping' : 'bg-outline'
                }`}
              />
              <span className="text-headline-md font-mono text-on-surface">
                0:{seconds.toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {!recording ? (
                <button
                  type="button"
                  onClick={() => {
                    setSeconds(0);
                    setRecording(true);
                  }}
                  className="h-11 px-5 rounded-xl bg-primary text-on-primary text-label-md inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRecording(false);
                    onSendVoiceNote(Math.max(1000, seconds * 1000));
                    setSeconds(0);
                    onClose();
                  }}
                  className="h-11 px-5 rounded-xl bg-secondary text-on-secondary text-label-md inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  <span>Stop &amp; Send Voice Note</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
