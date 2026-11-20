import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { EmptyState } from '../../components/ui/Feedback';
import { formatDurationMs, formatFileSize } from '../../utils/chatLogic';

type MediaTab = 'media' | 'files' | 'voice';

export const SharedMediaPage: React.FC = () => {
  const { conversationId = '' } = useParams();
  const { state } = useAppState();
  const [tab, setTab] = useState<MediaTab>('media');

  const conv = state.conversations.find((c) => c.id === conversationId);
  const allAssets = useMemo(
    () => state.attachments.filter((a) => a.conversation_id === conversationId),
    [state.attachments, conversationId]
  );

  const mediaItems = allAssets.filter((a) => a.mime_type.startsWith('image/'));
  const fileItems = allAssets.filter(
    (a) => !a.mime_type.startsWith('image/') && !a.mime_type.startsWith('audio/')
  );
  const voiceItems = allAssets.filter((a) => a.mime_type.startsWith('audio/'));

  const currentItems =
    tab === 'media' ? mediaItems : tab === 'files' ? fileItems : voiceItems;

  return (
    <MobileStackLayout
      title="Shared Media & Files"
      subtitle={`${conv?.title || 'Conversation'} • ${allAssets.length} shared assets`}
    >
      <div className="max-w-4xl mx-auto w-full px-margin-mobile py-4 space-y-4">
        <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-surface-container-low">
          {[
            { id: 'media', label: `Media (${mediaItems.length})`, icon: 'image' },
            { id: 'files', label: `Files (${fileItems.length})`, icon: 'folder' },
            { id: 'voice', label: `Voice (${voiceItems.length})`, icon: 'mic' },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as MediaTab)}
                className={`h-10 rounded-xl text-label-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container shadow-xs'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {currentItems.length === 0 ? (
          <EmptyState
            icon="perm_media"
            title={`No ${tab} shared yet`}
            description="Photos, documents, and voice notes shared in this chat will appear here."
          />
        ) : tab === 'media' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {currentItems.map((item) => (
              <Link
                key={item.id}
                to={`/media/${item.id}`}
                className="relative aspect-square rounded-xl overflow-hidden bg-surface-container shadow-xs group"
              >
                {item.preview_url ? (
                  <img
                    src={item.preview_url}
                    alt={item.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">image</span>
                  </div>
                )}
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-inverse-surface/70 text-inverse-on-surface text-[10px] font-semibold">
                  {item.file_name.split('.').pop()?.toUpperCase()}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {currentItems.map((item) => (
              <Link
                key={item.id}
                to={`/media/${item.id}`}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      {tab === 'voice' ? 'graphic_eq' : 'description'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-md-medium text-on-surface truncate">{item.file_name}</p>
                    <p className="text-caption text-on-surface-variant">
                      {formatFileSize(item.file_size_bytes)}
                      {item.duration_ms ? ` • ${formatDurationMs(item.duration_ms)}` : ''}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline">chevron_right</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MobileStackLayout>
  );
};
