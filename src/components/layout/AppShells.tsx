import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { UserAvatar } from '../ui/Avatar';

export const PublicLayout: React.FC<{
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ children, maxWidth = 'max-w-md md:max-w-lg' }) => (
  <div className="min-h-screen bg-surface text-on-surface flex flex-col">
    <main className={`flex-1 w-full ${maxWidth} mx-auto flex flex-col pt-safe pb-safe`}>
      {children}
    </main>
  </div>
);

export const MobileStackLayout: React.FC<{
  title: string;
  subtitle?: string;
  backTo?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, backTo, rightSlot, children }) => {
  const navigate = useNavigate();
  const { currentUser } = useAppState();

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <header className="sticky top-0 z-40 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-gutter-mobile md:px-6 max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
              className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-headline-sm text-on-surface truncate">{title}</h1>
              {subtitle && (
                <p className="text-caption text-on-surface-variant truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {rightSlot}
            {currentUser && (
              <Link
                to="/profile"
                aria-label="My Profile"
                className="ml-1 rounded-full hover:opacity-90"
              >
                <UserAvatar name={currentUser.full_name} src={currentUser.avatar_path} size="sm" />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto pb-safe flex flex-col">{children}</main>
    </div>
  );
};

export const AppTabLayout: React.FC<{
  title: string;
  children: React.ReactNode;
  fab?: React.ReactNode;
  rightHeaderSlot?: React.ReactNode;
}> = ({ title, children, fab, rightHeaderSlot }) => {
  const location = useLocation();
  const { currentUser, isAdmin } = useAppState();

  const navItems = [
    { path: '/chats', label: 'Chats', icon: 'chat_bubble' },
    { path: '/assistants', label: 'AI Assistants', icon: 'auto_awesome' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col md:flex-row">
      {/* Desktop Left Navigation Rail */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 py-5 bg-surface-container-low border-r border-outline-variant/25 shrink-0 sticky top-0 h-screen">
        <div className="flex flex-col items-center gap-6">
          <Link
            to="/chats"
            aria-label="AdiChat Home"
            className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">forum</span>
          </Link>

          <nav className="flex flex-col items-center gap-3">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className={`flex flex-col items-center justify-center w-14 py-2 rounded-xl transition-colors ${
                    active
                      ? 'bg-secondary-container text-on-secondary-container font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="text-[10px] mt-0.5 leading-tight text-center">{item.label.split(' ')[0]}</span>
                </Link>
              );
            })}
            <Link
              to="/search"
              aria-label="Global Search"
              className={`flex flex-col items-center justify-center w-14 py-2 rounded-xl transition-colors ${
                location.pathname.startsWith('/search')
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              <span className="text-[10px] mt-0.5">Search</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                aria-label="Admin Console"
                className="flex flex-col items-center justify-center w-14 py-2 rounded-xl text-primary hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                <span className="text-[10px] mt-0.5">Admin</span>
              </Link>
            )}
          </nav>
        </div>

        <Link to="/profile" aria-label="Profile">
          <UserAvatar
            name={currentUser?.full_name || 'Adeel Bhatti'}
            src={currentUser?.avatar_path}
            size="sm"
            isOnline={Boolean(currentUser?.is_online)}
            showPresence
          />
        </Link>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-16 px-margin-mobile md:px-6 flex items-center justify-between gap-2 max-w-6xl mx-auto w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0 md:hidden">
                <span className="material-symbols-outlined text-on-primary text-[20px]">forum</span>
              </div>
              <div className="flex flex-col truncate">
                <span className="text-headline-md tracking-tight text-primary leading-tight">
                  AdiChat
                </span>
                <span className="text-caption text-on-surface-variant truncate">{title}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {rightHeaderSlot}
              <Link
                to="/search"
                aria-label="Search AdiChat"
                className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
              </Link>
              <Link
                to="/profile"
                aria-label="Account profile"
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container"
              >
                <UserAvatar
                  name={currentUser?.full_name || 'Adeel Bhatti'}
                  src={currentUser?.avatar_path}
                  size="sm"
                />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto pb-24 md:pb-8">{children}</main>
      </div>

      {fab && (
        <div className="fixed right-4 bottom-20 md:bottom-6 z-40 pb-safe">{fab}</div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)] border-t border-outline-variant/20">
        <div className="flex justify-around items-center h-16 px-gutter-mobile">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 w-20 h-12 transition-colors ${
                  active ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-label-sm leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export const ChatWorkspaceLayout: React.FC<{
  activeConversationId?: string;
  children: React.ReactNode;
}> = ({ activeConversationId, children }) => {
  const location = useLocation();
  const { state, currentUser, isAdmin, openAssistantConversation } = useAppState();

  const navItems = [
    { path: '/chats', label: 'Chats', icon: 'chat_bubble' },
    { path: '/assistants', label: 'AI Assistants', icon: 'auto_awesome' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const sortedConversations = [...state.conversations].sort((a, b) =>
    (b.last_message_at || b.updated_at).localeCompare(a.last_message_at || a.updated_at)
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface flex">
      {/* Desktop Navigation Rail */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 py-5 bg-surface-container-low border-r border-outline-variant/25 shrink-0 sticky top-0 h-screen">
        <div className="flex flex-col items-center gap-6">
          <Link
            to="/chats"
            aria-label="AdiChat Home"
            className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">forum</span>
          </Link>
          <nav className="flex flex-col items-center gap-3">
            {navItems.map((item) => {
              const active =
                location.pathname.startsWith(item.path) ||
                (item.path === '/chats' && location.pathname.startsWith('/groups'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className={`flex flex-col items-center justify-center w-14 py-2 rounded-xl transition-colors ${
                    active
                      ? 'bg-secondary-container text-on-secondary-container font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="text-[10px] mt-0.5 leading-tight text-center">
                    {item.label.split(' ')[0]}
                  </span>
                </Link>
              );
            })}
            <Link
              to="/search"
              aria-label="Global Search"
              className="flex flex-col items-center justify-center w-14 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              <span className="text-[10px] mt-0.5">Search</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                aria-label="Admin Console"
                className="flex flex-col items-center justify-center w-14 py-2 rounded-xl text-primary hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                <span className="text-[10px] mt-0.5">Admin</span>
              </Link>
            )}
          </nav>
        </div>

        <Link to="/profile" aria-label="Profile">
          <UserAvatar
            name={currentUser?.full_name || 'Adeel Bhatti'}
            src={currentUser?.avatar_path}
            size="sm"
            isOnline={Boolean(currentUser?.is_online)}
            showPresence
          />
        </Link>
      </aside>

      {/* Desktop Conversation Switcher Sidebar */}
      <aside className="hidden lg:flex flex-col w-80 bg-surface-container-lowest border-r border-outline-variant/25 shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="p-4 border-b border-outline-variant/15 flex items-center justify-between">
          <div>
            <p className="text-headline-sm text-on-surface">Conversations</p>
            <p className="text-caption text-on-surface-variant">
              {sortedConversations.length} active threads
            </p>
          </div>
          <Link
            to="/new-chat"
            aria-label="New thread"
            className="w-9 h-9 rounded-full bg-surface-container-low text-primary flex items-center justify-center hover:bg-secondary-container"
          >
            <span className="material-symbols-outlined text-[18px]">edit_square</span>
          </Link>
        </div>

        <div className="p-2.5 space-y-1">
          {sortedConversations.map((conv) => {
            let label = conv.title || 'Conversation';
            let assistant = undefined;
            let otherUser = undefined;

            if (conv.type === 'direct') {
              const m = state.conversationMembers.find(
                (cm) => cm.conversation_id === conv.id && cm.user_id !== currentUser?.id
              );
              otherUser = state.profiles.find((p) => p.id === m?.user_id);
              if (otherUser) label = otherUser.full_name;
            } else if (conv.type === 'assistant') {
              assistant = state.assistants.find(
                (a) => a.name === conv.title || `conv-ai-${a.id}` === conv.id
              );
              if (assistant) label = assistant.name;
            } else if (conv.type === 'group') {
              const grp = state.groups.find((g) => g.conversation_id === conv.id);
              if (grp) label = grp.name;
            }

            const route =
              conv.type === 'group'
                ? `/groups/${conv.id}`
                : conv.type === 'assistant' && assistant
                  ? `/assistants/${assistant.id}/chat`
                  : `/chats/${conv.id}`;

            const isActive =
              activeConversationId === conv.id ||
              (assistant && location.pathname === `/assistants/${assistant.id}/chat`);

            return (
              <Link
                key={conv.id}
                to={route}
                onClick={() => {
                  if (conv.type === 'assistant' && assistant) {
                    openAssistantConversation(assistant.id);
                  }
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-secondary-container/70 text-on-secondary-container font-semibold'
                    : 'hover:bg-surface-container-low text-on-surface'
                }`}
              >
                {conv.type === 'assistant' ? (
                  <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">
                      {assistant?.icon_name || 'smart_toy'}
                    </span>
                  </div>
                ) : conv.type === 'group' ? (
                  <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">diversity_3</span>
                  </div>
                ) : (
                  <UserAvatar
                    name={label}
                    src={otherUser?.avatar_path}
                    size="sm"
                    isOnline={Boolean(otherUser?.is_online)}
                    showPresence
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium truncate">{label}</p>
                  <p className="text-timestamp text-on-surface-variant capitalize truncate">
                    {conv.type === 'assistant' ? 'AI Assistant' : conv.type}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Active Thread Pane */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">{children}</div>
    </div>
  );
};

export const AdminLayout: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAppState();

  const adminNav = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/users', label: 'Users', icon: 'group' },
    { path: '/admin/groups', label: 'Groups', icon: 'diversity_3' },
    { path: '/admin/assistants', label: 'AI Assistants', icon: 'smart_toy' },
    { path: '/admin/reports', label: 'Reports', icon: 'flag' },
    { path: '/admin/developer-profile', label: 'Dev Profile', icon: 'badge' },
    { path: '/admin/settings', label: 'App Settings', icon: 'tune' },
    { path: '/admin/announcements-logs', label: 'Logs & Broadcasts', icon: 'campaign' },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col lg:flex-row">
      {/* Desktop Admin Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-container-low border-r border-outline-variant/25 p-4 justify-between shrink-0 sticky top-0 h-screen">
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">shield_person</span>
              </div>
              <div>
                <p className="text-label-md text-on-surface">AdiChat Admin</p>
                <p className="text-timestamp text-primary font-semibold">Control Center</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {adminNav.map((item) => {
              const active =
                item.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium transition-colors ${
                    active
                      ? 'bg-secondary-container text-on-secondary-container font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <Link
          to="/chats"
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-surface-container-lowest text-primary text-label-sm font-semibold shadow-xs hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
          <span>Switch to User App</span>
        </Link>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-16 px-gutter-mobile lg:px-6 flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              <button
                type="button"
                aria-label="Go back"
                onClick={() => navigate(-1)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container lg:hidden"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
              </button>
              <h1 className="text-headline-sm text-on-surface truncate">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/chats"
                className="lg:hidden h-9 px-3 rounded-lg bg-surface-container-low text-primary text-label-sm inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                <span>User App</span>
              </Link>
              {currentUser && (
                <UserAvatar name={currentUser.full_name} src={currentUser.avatar_path} size="sm" />
              )}
            </div>
          </div>
          {/* Mobile horizontal quick switcher for Admin sections */}
          <div className="lg:hidden flex items-center gap-1.5 px-gutter-mobile pb-2.5 overflow-x-auto no-scrollbar">
            {adminNav.map((item) => {
              const active =
                item.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`shrink-0 px-3 py-1 rounded-full text-label-sm transition-colors ${
                    active
                      ? 'bg-secondary-container text-on-secondary-container font-semibold'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="flex-1 p-gutter-mobile lg:p-6 max-w-6xl w-full mx-auto pb-12">
          {children}
        </main>
      </div>
    </div>
  );
};
