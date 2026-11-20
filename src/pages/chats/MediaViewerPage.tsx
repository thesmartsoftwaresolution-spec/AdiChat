import React from 'react';
import { useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { EmptyState } from '../../components/ui/Feedback';
import { formatFileSize } from '../../utils/chatLogic';

export const MediaViewerPage: React.FC = () => {
  const { mediaId = '' } = useParams();
  const { state, pushToast } = useAppState();

  const attachment = state.attachments.find(
    (a) => a.id === mediaId || a.message_id === mediaId
  );
  const message = state.messages.find(
    (m) => m.id === mediaId || m.id === attachment?.message_id
  );
  const uploader = state.profiles.find(
    (p) => p.id === (attachment?.uploaded_by || message?.sender_user_id)
  );

  const mediaUrl = attachment?.preview_url || message?.metadata.media_url;
  const fileName =
    attachment?.file_name || message?.metadata.file_name || 'Media Asset';
  const fileSize =
    attachment?.file_size_bytes || message?.metadata.file_size_bytes || 0;

  if (!attachment && !message) {
    return (
      <MobileStackLayout title="Media Viewer">
        <div className="p-6">
          <EmptyState
            icon="broken_image"
            title="Media unavailable"
            description="This file could not be found or access was revoked."
          />
        </div>
      </MobileStackLayout>
    );
  }

  return (
    <MobileStackLayout
      title={fileName}
      subtitle={`Shared by ${uploader?.full_name || 'Member'}`}
      rightSlot={
        mediaUrl ? (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open or download file"
            className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </a>
        ) : null
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-inverse-surface/5 space-y-4">
        {mediaUrl && (attachment?.mime_type.startsWith('image/') || message?.message_type === 'image') ? (
          <div className="max-w-3xl w-full rounded-2xl overflow-hidden shadow-xl bg-surface-container-lowest">
            <img src={mediaUrl} alt={fileName} className="w-full max-h-[70vh] object-contain" />
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-surface-container-lowest shadow-md flex flex-col items-center gap-3 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">description</span>
            </div>
            <h2 className="text-headline-sm text-on-surface">{fileName}</h2>
            <p className="text-body-sm text-on-surface-variant">
              {attachment?.mime_type || 'application/octet-stream'} •{' '}
              {formatFileSize(fileSize)}
            </p>
            {mediaUrl ? (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-5 rounded-xl bg-primary text-on-primary text-label-md inline-flex items-center gap-2 mt-2"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Open / Download File</span>
              </a>
            ) : (
              <p className="text-caption text-on-surface-variant">Secure download is unavailable. Reopen this chat to refresh the file link.</p>
            )}
          </div>
        )}
      </div>
    </MobileStackLayout>
  );
};
