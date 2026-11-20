import React from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AppStateProvider, useAppState } from './app/providers/AppStateProvider';
import { ThemeProvider } from './app/providers/ThemeProvider';
import { EmptyState, ToastViewport } from './components/ui/Feedback';
import { PWAInstallPrompt } from './components/pwa/PWAInstallPrompt';

// Public & Auth Screens (1-5, 26)
import { WelcomeLandingPage } from './pages/public/WelcomeLandingPage';
import { SignUpPage } from './pages/public/SignUpPage';
import { LoginPage } from './pages/public/LoginPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';
import { DeveloperIntroPage } from './pages/public/DeveloperIntroPage';

// Chat, Search & Media Screens (6-10, 23-25)
import { ChatsListPage } from './pages/chats/ChatsListPage';
import { DirectChatPage } from './pages/chats/DirectChatPage';
import { NewChatPage } from './pages/chats/NewChatPage';
import { ContactInfoPage } from './pages/chats/ContactInfoPage';
import { MediaViewerPage } from './pages/chats/MediaViewerPage';
import { SharedMediaPage } from './pages/chats/SharedMediaPage';
import { GlobalSearchPage } from './pages/chats/GlobalSearchPage';

// Group Screens (11-15, 20)
import { NewGroupMembersPage } from './pages/groups/NewGroupMembersPage';
import { NewGroupDetailsPage } from './pages/groups/NewGroupDetailsPage';
import { GroupChatPage } from './pages/groups/GroupChatPage';
import { GroupInfoPage } from './pages/groups/GroupInfoPage';
import { AddGroupMembersPage } from './pages/groups/AddGroupMembersPage';
import { AddAssistantToGroupPage } from './pages/groups/AddAssistantToGroupPage';

// AI Assistants & Profile/Settings Screens (16-19, 21-22)
import { AssistantsHubPage } from './pages/assistants/AssistantsHubPage';
import { CreateAssistantPage } from './pages/assistants/CreateAssistantPage';
import { AssistantProfilePage } from './pages/assistants/AssistantProfilePage';
import { AIChatPage } from './pages/assistants/AIChatPage';
import { MyProfilePage } from './pages/profile/MyProfilePage';
import { SettingsPage } from './pages/profile/SettingsPage';

// Admin Screens (27-35)
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminGroupsPage } from './pages/admin/AdminGroupsPage';
import { AdminAssistantsPage } from './pages/admin/AdminAssistantsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminDeveloperProfilePage } from './pages/admin/AdminDeveloperProfilePage';
import { AdminAppSettingsPage } from './pages/admin/AdminAppSettingsPage';
import { AdminAnnouncementsLogsPage } from './pages/admin/AdminAnnouncementsLogsPage';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthReady } = useAppState();
  if (!isAuthReady) {
    return <div className="min-h-screen bg-surface flex items-center justify-center" role="status"><div className="flex items-center gap-3 text-on-surface-variant"><span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span><span className="text-body-sm">Restoring your session…</span></div></div>;
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (currentUser.status !== 'active') {
    return (
      <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
        <EmptyState
          icon="gpp_bad"
          title={`Account ${currentUser.status}`}
          description="Your account access has been restricted by an administrator."
          action={
            <Link to="/login" className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-sm inline-flex items-center">
              Switch Account
            </Link>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
};

const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, isAuthReady } = useAppState();
  if (!isAuthReady) {
    return <div className="min-h-screen bg-surface flex items-center justify-center" role="status"><div className="flex items-center gap-3 text-on-surface-variant"><span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span><span className="text-body-sm">Restoring your session…</span></div></div>;
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
        <EmptyState
          icon="lock"
          title="Admin Access Required"
          description="Only authorized AdiChat administrators can access this console."
          action={
            <Link to="/chats" className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-sm inline-flex items-center">
              Return to Chats
            </Link>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
};

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
          <EmptyState
            icon="error"
            title="Something went wrong"
            description={this.state.message || 'An unexpected UI error occurred.'}
            action={
              <button
                type="button"
                onClick={() => window.location.assign('/')}
                className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-sm"
              >
                Reload AdiChat
              </button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}

const AppRoutes: React.FC = () => {
  const { toasts, dismissToast } = useAppState();

  return (
    <>
      <Routes>
        {/* Public & Auth */}
        <Route path="/" element={<WelcomeLandingPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/developer" element={<DeveloperIntroPage />} />

        {/* Authenticated User Messaging */}
        <Route path="/chats" element={<RequireAuth><ChatsListPage /></RequireAuth>} />
        <Route path="/chats/:conversationId" element={<RequireAuth><DirectChatPage /></RequireAuth>} />
        <Route path="/chats/:conversationId/contact" element={<RequireAuth><ContactInfoPage /></RequireAuth>} />
        <Route path="/chats/:conversationId/media" element={<RequireAuth><SharedMediaPage /></RequireAuth>} />
        <Route path="/new-chat" element={<RequireAuth><NewChatPage /></RequireAuth>} />
        <Route path="/media/:mediaId" element={<RequireAuth><MediaViewerPage /></RequireAuth>} />
        <Route path="/search" element={<RequireAuth><GlobalSearchPage /></RequireAuth>} />

        {/* Groups */}
        <Route path="/groups/new/members" element={<RequireAuth><NewGroupMembersPage /></RequireAuth>} />
        <Route path="/groups/new/details" element={<RequireAuth><NewGroupDetailsPage /></RequireAuth>} />
        <Route path="/groups/:groupId" element={<RequireAuth><GroupChatPage /></RequireAuth>} />
        <Route path="/groups/:groupId/info" element={<RequireAuth><GroupInfoPage /></RequireAuth>} />
        <Route path="/groups/:groupId/members/add" element={<RequireAuth><AddGroupMembersPage /></RequireAuth>} />
        <Route path="/groups/:groupId/assistants" element={<RequireAuth><AddAssistantToGroupPage /></RequireAuth>} />

        {/* AI Assistants */}
        <Route path="/assistants" element={<RequireAuth><AssistantsHubPage /></RequireAuth>} />
        <Route path="/assistants/new" element={<RequireAuth><CreateAssistantPage /></RequireAuth>} />
        <Route path="/assistants/:assistantId" element={<RequireAuth><AssistantProfilePage /></RequireAuth>} />
        <Route path="/assistants/:assistantId/chat" element={<RequireAuth><AIChatPage /></RequireAuth>} />

        {/* Profile & Settings */}
        <Route path="/profile" element={<RequireAuth><MyProfilePage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

        {/* Admin Console */}
        <Route path="/admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="/admin/users/:userId" element={<RequireAdmin><AdminUserDetailPage /></RequireAdmin>} />
        <Route path="/admin/groups" element={<RequireAdmin><AdminGroupsPage /></RequireAdmin>} />
        <Route path="/admin/assistants" element={<RequireAdmin><AdminAssistantsPage /></RequireAdmin>} />
        <Route path="/admin/reports" element={<RequireAdmin><AdminReportsPage /></RequireAdmin>} />
        <Route path="/admin/developer-profile" element={<RequireAdmin><AdminDeveloperProfilePage /></RequireAdmin>} />
        <Route path="/admin/settings" element={<RequireAdmin><AdminAppSettingsPage /></RequireAdmin>} />
        <Route path="/admin/announcements-logs" element={<RequireAdmin><AdminAnnouncementsLogsPage /></RequireAdmin>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <PWAInstallPrompt />
    </>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <AppStateProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AppStateProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
