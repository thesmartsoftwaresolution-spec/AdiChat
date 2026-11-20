import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { ToggleSwitch } from '../../components/ui/Feedback';
import { validateAssistantInput } from '../../utils/validators';

export const CreateAssistantPage: React.FC = () => {
  const { createAssistant } = useAppState();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('Structured, analytical & clear');
  const [instructions, setInstructions] = useState('');
  const [tone, setTone] = useState('Analytical');
  const [language, setLanguage] = useState('English');
  const [starterText, setStarterText] = useState(
    'Summarize the key tradeoffs\nGenerate a step-by-step plan'
  );
  const [thinkingDefault, setThinkingDefault] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateAssistantInput({ name, instructions });
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSaving(true);
    try {
      const created = await createAssistant({
        name,
        description,
        personality,
        instructions,
        tone,
        language,
        starter_prompts: starterText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        thinking_enabled_default: thinkingDefault,
      });

      if (created) {
        navigate(`/assistants/${created.id}/chat`);
      } else {
        setError('Assistant save nahi ho saka. Apni session aur connection check karke dobara koshish karein.');
      }
    } catch {
      setError('Assistant save nahi ho saka. Dobara koshish karein.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileStackLayout title="Create AI Assistant" backTo="/assistants">
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto w-full px-margin-mobile py-6 space-y-5"
      >
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low">
          <div className="w-14 h-14 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
          </div>
          <div>
            <h2 className="text-headline-sm text-on-surface">Design Your AI Persona</h2>
            <p className="text-caption text-on-surface-variant">
              Instructions are enforced server-side. Invite your assistant into 1-on-1 or group chats.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="ai-name" className="block text-label-md text-on-surface mb-1.5">
              Assistant Name
            </label>
            <input
              id="ai-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Architecture Copilot"
              className="w-full h-12 px-4 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
            />
          </div>

          <div>
            <label htmlFor="ai-desc" className="block text-label-md text-on-surface mb-1.5">
              Short Description
            </label>
            <input
              id="ai-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this assistant specialize in?"
              className="w-full h-12 px-4 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ai-tone" className="block text-label-md text-on-surface mb-1.5">
                Tone
              </label>
              <select
                id="ai-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
              >
                <option value="Analytical">Analytical</option>
                <option value="Friendly & Concise">Friendly &amp; Concise</option>
                <option value="Direct & Technical">Direct &amp; Technical</option>
                <option value="Creative & Expressive">Creative &amp; Expressive</option>
              </select>
            </div>
            <div>
              <label htmlFor="ai-lang" className="block text-label-md text-on-surface mb-1.5">
                Primary Language
              </label>
              <input
                id="ai-lang"
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ai-personality" className="block text-label-md text-on-surface mb-1.5">
              Personality Traits
            </label>
            <input
              id="ai-personality"
              type="text"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
            />
          </div>

          <div>
            <label htmlFor="ai-instructions" className="block text-label-md text-on-surface mb-1.5">
              System Instructions
            </label>
            <textarea
              id="ai-instructions"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Explain how this assistant should reason, structure answers, and cite tradeoffs..."
              className="w-full p-4 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface resize-y"
            />
          </div>

          <div>
            <label htmlFor="ai-starters" className="block text-label-md text-on-surface mb-1.5">
              Starter Prompts (one per line)
            </label>
            <textarea
              id="ai-starters"
              rows={3}
              value={starterText}
              onChange={(e) => setStarterText(e.target.value)}
              className="w-full p-4 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface resize-none"
            />
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3">
            <div>
              <p className="text-body-md-medium text-on-surface">
                Default to High Thinking Mode
              </p>
              <p className="text-caption text-on-surface-variant">
                Uses Cloudflare Workers AI GPT-OSS 20B with High Reasoning for complex queries
              </p>
            </div>
            <ToggleSwitch
              checked={thinkingDefault}
              onChange={setThinkingDefault}
              label="Enable High Thinking Mode by default"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">check</span>
          <span>{saving ? 'Saving...' : 'Save &amp; Open Chat'}</span>
        </button>
      </form>
    </MobileStackLayout>
  );
};
