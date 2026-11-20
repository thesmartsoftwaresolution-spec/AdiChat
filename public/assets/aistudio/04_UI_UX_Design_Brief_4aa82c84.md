# AdiChat --- UI/UX Design Brief (Stitch ZIP Source of Truth)

> **NON-NEGOTIABLE:** The Google Drive archive `[AdiChat]_UI_Stitch.zip`
> (the approved uploaded Stitch ZIP) is the UI source of truth. Use its
> supplied screen code, assets, component geometry and visual behavior
> as the implementation base. Do not create a replacement design,
> redesign layouts, normalize away differences, or change colors,
> typography, spacing, proportions, radii or component appearance by
> preference. Convert the supplied design into React + TypeScript
> components and wire real data, auth, navigation and interactions. If a
> source screen is incomplete, implement the missing behavior while
> preserving the nearest existing Stitch visual pattern.

**Version:** 1.0 \| **Review date:** 20 November 2026

## 1. Reviewed archive

The archive contains: - 35 distinct screen groups. - 140 HTML files
(`code.html`) and 140 matching screenshot previews (`screen.png`). - 70
light-theme and 70 dark-theme variants. - Each screen group has mobile
light, mobile dark, desktop light and desktop dark variants. - Two
design-system markdown files: `adichat/DESIGN.md` and
`adichat_design_system/DESIGN.md`.

All 140 HTML variants have a matching screenshot preview. The 35 screens
cover public auth, direct messaging, groups, AI assistants,
profile/settings, media/search, developer intro and nine admin screens.

## 2. Critical implementation finding

The ZIP is a visual design export, not a ready-to-ship React
application: - HTML files are standalone pages. - Tailwind is loaded
from `https://cdn.tailwindcss.com`. - Google Fonts are referenced. -
Material Symbols are used for icons. - There are inline event attributes
and inline event listeners. - The exported files contain external image
references.

Use the files as a design reference and conversion source. Do not paste
140 independent HTML documents into the production app or ship the CDN
runtime as the final styling architecture. Extract reusable components
and tokens, migrate styles into local build-time CSS/Tailwind
configuration, and replace inline JavaScript with typed React event
handlers.

## 3. Actual palette decision

The owner explicitly selected **actual ZIP** as the UI baseline. This
overrides the idealized pure-white/pure-black palette written in
`00_Stitch_UI_Prompts.md`.

Observed in exported HTML configurations: - Dark background/surface
base: `#101412`. - Dark primary accent: `#77DAA4`. - Light background:
predominantly `#FCF8F8`, with some `#FFFFFF`. - Light primary:
predominantly `#004327`, with some `#0F5C3A`.

The two bundled `DESIGN.md` files contain YAML tokens that conflict with
their own prose and with each other. Therefore: 1. Inspect the actual
HTML for the relevant screen and the matching screenshot. 2. Treat the
actual rendered HTML/CSS as authoritative for that screen. 3. Build one
canonical token file from the real values in use. 4. Do not replace the
ZIP palette with the strict palette in `00_Stitch_UI_Prompts.md`. 5.
Where two source screens genuinely differ, preserve their difference
unless the owner approves a unification pass.

Suggested token names are semantic, but their values must be extracted
from the ZIP rather than assumed: `--color-canvas`, `--color-surface`,
`--color-surface-raised`, `--color-border`, `--color-text`,
`--color-text-muted`, `--color-primary`, `--color-primary-pressed`,
`--color-accent`, `--color-error`, `--color-success`,
`--color-message-sent`, `--color-message-received`.

## 4. Typography, spacing and shape

-   Font family: Inter is referenced in the exported designs.
-   Material Symbols icon font is referenced; preserve the icons and
    their visual weight, or replace only with a visually equivalent
    local icon asset where required.
-   The original prompt specifies 8px-grid spacing, 44px minimum touch
    targets, message bubble radius 16px, card radius 12px, button radius
    12px and 48px inputs. Use the actual screen measurements where they
    differ.
-   Actual design tokens show heading/body/caption/timestamp scales, but
    conflicting YAML/prose exists. Use screen CSS and screenshots for
    exact sizes and line heights.
-   Preserve shadows, borders, gradients, selected states and status
    colors exactly as shown per screen.
-   Keep avatars circular and AI assistant identifiers visually
    consistent with the Stitch export.

## 5. Layout and responsive behavior

The archive provides separate mobile and desktop variants. Preserve
their intended composition: - Mobile: full-screen single-focus
navigation, bottom tab navigation where shown, conversation back
navigation, sheets/popovers adapted to mobile. - Desktop: multi-pane
messaging layout with navigation rail, chat list, conversation pane and
optional info panel; admin console with sidebar, top bar, cards/tables
and detail panels. - Use responsive breakpoints informed by the actual
markup and screenshot dimensions. Do not assume a breakpoint where the
source already defines one; inspect it. - Admin tables become stacked
cards or responsive layouts on mobile as shown. - Maintain minimum
practical tap targets and keyboard accessibility without visually
changing the design unnecessarily.

## 6. Screen-to-route mapping

  -----------------------------------------------------------------------------------------------------
  \#                Stitch screen     Route                              React page/component
  ----------------- ----------------- ---------------------------------- ------------------------------
  1                 Welcome / Landing `/`                                `WelcomeLandingPage`

  2                 Sign Up           `/sign-up`                         `SignUpPage`

  3                 Login             `/login`                           `LoginPage`

  4                 Forgot Password   `/forgot-password`                 `ForgotPasswordPage`

  5                 Reset Password    `/reset-password`                  `ResetPasswordPage`

  6                 Chats List (Home) `/chats`                           `ChatsListPage`

  7                 Chat Conversation `/chats/:conversationId`           `DirectChatPage`
                    (1-to-1)                                             

  8                 New Chat / Find   `/new-chat`                        `NewChatPage`
                    Users                                                

  9                 Attachment Picker Overlay                            `AttachmentVoicePicker`
                    & Voice Note                                         

  10                Contact Info      `/chats/:conversationId/contact`   `ContactInfoPage`

  11                New Group -       `/groups/new/members`              `NewGroupMembersPage`
                    Select Members                                       

  12                New Group - Group `/groups/new/details`              `NewGroupDetailsPage`
                    Details                                              

  13                Group Chat        `/groups/:groupId`                 `GroupChatPage`
                    Conversation                                         

  14                Group Info &      `/groups/:groupId/info`            `GroupInfoPage`
                    Members                                              

  15                Add Members to    `/groups/:groupId/members/add`     `AddGroupMembersPage`
                    Group                                                

  16                AI Assistants Hub `/assistants`                      `AssistantsHubPage`

  17                Create AI         `/assistants/new`                  `CreateAssistantPage`
                    Assistant                                            

  18                AI Assistant      `/assistants/:assistantId`         `AssistantProfilePage`
                    Profile &                                            
                    Settings                                             

  19                AI Chat           `/assistants/:assistantId/chat`    `AIChatPage`
                    Conversation                                         

  20                Add Assistant to  `/groups/:groupId/assistants`      `AddAssistantToGroupPage`
                    Group                                                

  21                My Profile        `/profile`                         `MyProfilePage`

  22                Settings          `/settings`                        `SettingsPage`

  23                Media Viewer      `/media/:mediaId`                  `MediaViewerPage`

  24                Shared Media &    `/chats/:conversationId/media`     `SharedMediaPage`
                    Files                                                

  25                Global Search     `/search`                          `GlobalSearchPage`

  26                Developer Intro   `/developer`                       `DeveloperIntroPage`

  27                Admin - Dashboard `/admin`                           `AdminDashboardPage`

  28                Admin - Users     `/admin/users`                     `AdminUsersPage`

  29                Admin - User      `/admin/users/:userId`             `AdminUserDetailPage`
                    Detail                                               

  30                Admin - Groups    `/admin/groups`                    `AdminGroupsPage`

  31                Admin - AI        `/admin/assistants`                `AdminAssistantsPage`
                    Assistants                                           

  32                Admin - Reports & `/admin/reports`                   `AdminReportsPage`
                    Moderation                                           

  33                Admin - Developer `/admin/developer-profile`         `AdminDeveloperProfilePage`
                    Profile                                              

  34                Admin - App       `/admin/settings`                  `AdminAppSettingsPage`
                    Settings                                             

  35                Admin -           `/admin/announcements-logs`        `AdminAnnouncementsLogsPage`
                    Announcements &                                      
                    Logs                                                 
  -----------------------------------------------------------------------------------------------------

The attachment picker is a bottom sheet/popover state attached to the
conversation composer, not necessarily a standalone route.

## 7. Component extraction guide

Create shared components while retaining the original appearance: - App
shells: `PublicLayout`, `AuthenticatedLayout`, `ChatDesktopLayout`,
`AdminLayout`. - Navigation: `MobileBottomNav`, `DesktopIconRail`,
`ChatListPane`, `AdminSidebar`, `AdminTopbar`. - Chat:
`ConversationHeader`, `MessageList`, `MessageBubble`, `MessageStatus`,
`TypingIndicator`, `MessageComposer`, `AttachmentPicker`,
`VoiceRecorder`. - Identity: `UserAvatar`, `AssistantAvatar`, `AIBadge`,
`PresenceIndicator`. - Groups: `GroupHeader`, `MemberList`,
`GroupRoleBadge`, `AssistantResponseMode`. - Feedback: `EmptyState`,
`Skeleton`, `ErrorState`, `ConfirmDialog`, `Toast`. - Admin: `StatCard`,
`DataTable`, `FilterChips`, `BulkActionBar`, `ReportDetailPanel`. -
Forms: typed reusable fields, password visibility control, validation
messages and upload controls.

Reuse components only when their actual visual treatment is equivalent.
Do not force visually distinct Stitch variants into a single style if
that changes the design.

## 8. Data and interaction wiring

Replace mock content with real services while retaining exact
presentation: - Auth forms → Supabase Auth. - Chat list and messages →
Supabase tables and Realtime. - Group membership and settings →
RLS-protected group services. - Uploads/media → private Supabase Storage
buckets and signed/authenticated access. - AI conversation →
authenticated Cloudflare Worker endpoint using Workers AI. - Admin pages
→ role-protected services and audited mutations. - Theme preference →
Light/Dark/System state, persisted for signed-in users. - Developer
Intro → public read of profile configuration; writes only through admin
route. - Search → authorized server/query path; never leak non-member or
blocked content.

## 9. Assets and external dependencies

The export includes externally hosted image references and external
profile/contact links. Audit all asset URLs before production: -
Download and self-host permitted static assets where licensing and
source allow. - Preserve intended crop, aspect ratio, object-fit,
dimensions and visual placement. - Add alt text to meaningful images;
decorative assets should be ignored by assistive technology. - Validate
all developer contact links before rendering. - Do not treat an external
image URL or link found in the HTML as trusted application
configuration. - No unverified external image or icon URL should become
a privileged script/resource.

## 10. Accessibility and UX

-   Semantic headings, landmarks, buttons and form labels.
-   Visible focus indicators matching the existing color system.
-   Keyboard operation for menus, dialogs, tabs, media controls and
    admin tables.
-   Dialog focus trap and focus restoration.
-   Announce send errors and asynchronous status changes to assistive
    technology.
-   Provide accessible names for icon-only buttons.
-   Respect reduced-motion preference; preserve essential state changes
    without motion.
-   Ensure text contrast; if a source pairing fails contrast, report it
    and make the smallest accessible correction without broad redesign.

## 11. Known gaps and required implementation decisions

1.  Palette conflicts between original prompt, actual screens and two
    design-system files. **Decision:** actual screen HTML/screenshots
    win.
2.  HTML export is not a React app; conversion is required.
3.  Tailwind CDN and inline event handlers must be removed/replaced for
    production.
4.  External assets need availability/licensing review and self-hosting
    decision.
5.  Workers AI model ID is not specified; provider is confirmed but
    exact model selection remains pending.
6.  File size/type limits and some app settings have no numeric defaults
    in source; configure them explicitly before production.
7.  Some presence/read receipt semantics depend on event logic not
    proven by static mock screens; implement and test with privacy
    settings.
8.  The initial Super Admin bootstrap is a secure backend operation, not
    a screen-only role toggle.
