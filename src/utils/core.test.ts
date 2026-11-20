import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  evaluatePasswordStrength,
  sanitizeExternalUrl,
  validateGroupName,
  validateAssistantInput,
} from './validators.ts';
import {
  hasAdminAccess,
  isSuperAdmin,
  canAccountAccessProtectedApp,
  canRemoveGroupMember,
} from './permissions.ts';
import {
  buildDirectPairKey,
  extractMentions,
  resolveTriggeredGroupAssistants,
  shouldRecommendThinkingMode,
  formatFileSize,
  formatDurationMs,
  getInitials,
} from './chatLogic.ts';
import type { AIAssistant, ConversationMember, GroupAssistant } from '../types/database.ts';

test('validators: email, password strength, and external URL sanitization', () => {
  assert.equal(isValidEmail('adeel@adichat.internal'), true);
  assert.equal(isValidEmail('not-an-email'), false);

  const strong = evaluatePasswordStrength('EmeraldPine#2026');
  assert.equal(strong.isValid, true);
  assert.equal(strong.label, 'Strong');

  const weak = evaluatePasswordStrength('abc');
  assert.equal(weak.isValid, false);
  assert.equal(weak.label, 'Weak');

  assert.equal(sanitizeExternalUrl('https://github.com/adeelbhatti'), 'https://github.com/adeelbhatti');
  assert.equal(sanitizeExternalUrl('mailto:adeel@adichat.app'), 'mailto:adeel@adichat.app');
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('data:text/html,<script>'), null);

  assert.equal(validateGroupName('A'), 'Group name must be at least 2 characters.');
  assert.equal(validateGroupName('Frontend Guild'), null);

  assert.ok(validateAssistantInput({ name: 'A', instructions: 'short' }));
  assert.equal(
    validateAssistantInput({
      name: 'Study Buddy AI',
      instructions: 'Explain technical concepts clearly with structured examples.',
    }),
    null
  );
});

test('permissions: role checks, user status, and last-admin protection', () => {
  assert.equal(hasAdminAccess(['user']), false);
  assert.equal(hasAdminAccess(['admin']), true);
  assert.equal(hasAdminAccess(['super_admin']), true);
  assert.equal(isSuperAdmin(['admin']), false);
  assert.equal(isSuperAdmin(['super_admin']), true);

  assert.equal(canAccountAccessProtectedApp('active'), true);
  assert.equal(canAccountAccessProtectedApp('suspended'), false);
  assert.equal(canAccountAccessProtectedApp('banned'), false);

  const members: ConversationMember[] = [
    {
      id: 'm1',
      conversation_id: 'g1',
      user_id: 'u1',
      member_role: 'admin',
      joined_at: '2026-01-01T00:00:00Z',
      last_read_at: null,
      muted_until: null,
      is_blocked: false,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      conversation_id: 'g1',
      user_id: 'u2',
      member_role: 'member',
      joined_at: '2026-01-01T00:00:00Z',
      last_read_at: null,
      muted_until: null,
      is_blocked: false,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  // Non-admin cannot remove another member
  assert.equal(canRemoveGroupMember(members, 'g1', 'u2', 'u1').allowed, false);
  // Last admin cannot leave/be removed while other members remain
  assert.equal(canRemoveGroupMember(members, 'g1', 'u1', 'u1').allowed, false);
  // Admin can remove regular member
  assert.equal(canRemoveGroupMember(members, 'g1', 'u1', 'u2').allowed, true);
  // Platform admin override can remove a group member during moderation
  assert.equal(canRemoveGroupMember(members, 'g1', 'u_admin', 'u2', true).allowed, true);
});

test('chatLogic: direct pair keys, @mentions, assistant triggers, and thinking heuristic', () => {
  assert.equal(buildDirectPairKey('u2', 'u1'), 'u1:u2');
  assert.equal(buildDirectPairKey('u1', 'u2'), 'u1:u2');
  assert.throws(() => buildDirectPairKey('u1', 'u1'));

  assert.deepEqual(extractMentions('Hey @StudyBuddyAI and @Ayesha please check!'), [
    'studybuddyai',
    'ayesha',
  ]);

  const assistants: AIAssistant[] = [
    {
      id: 'a1',
      owner_user_id: 'u1',
      name: 'Study Buddy AI',
      handle: 'StudyBuddyAI',
      avatar_path: null,
      description: 'Study helper',
      personality: 'Clear & rigorous',
      instructions: 'Be helpful and rigorous.',
      tone: 'Analytical',
      language: 'English',
      starter_prompts: [],
      is_enabled: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];
  const groupAssistants: GroupAssistant[] = [
    {
      id: 'ga1',
      group_conversation_id: 'g1',
      assistant_id: 'a1',
      response_mode: 'mentioned_only',
      added_by: 'u1',
      is_enabled: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  assert.equal(
    resolveTriggeredGroupAssistants('Normal chat message', groupAssistants, assistants).length,
    0
  );
  assert.equal(
    resolveTriggeredGroupAssistants('@StudyBuddyAI summarize PR', groupAssistants, assistants).length,
    1
  );
  assert.equal(
    resolveTriggeredGroupAssistants('@StudyBuddyAI summarize PR', groupAssistants, assistants, false)
      .length,
    0
  );

  assert.equal(
    shouldRecommendThinkingMode(
      'Explain the difference between optimistic concurrency and pessimistic locking in distributed database design'
    ),
    true
  );
  assert.equal(shouldRecommendThinkingMode('Hello!'), false);

  assert.equal(formatFileSize(2516582), '2.4 MB');
  assert.equal(formatDurationMs(42000), '0:42');
  assert.equal(getInitials('Adeel Bhatti'), 'AB');
});
