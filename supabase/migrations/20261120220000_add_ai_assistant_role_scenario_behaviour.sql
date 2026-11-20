ALTER TABLE public.ai_assistants
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS scenario text,
  ADD COLUMN IF NOT EXISTS behaviour text;

DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_assistants_role_length_check' AND conrelid = 'public.ai_assistants'::regclass) THEN
    ALTER TABLE public.ai_assistants ADD CONSTRAINT ai_assistants_role_length_check CHECK (role IS NULL OR char_length(role) <= 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_assistants_scenario_length_check' AND conrelid = 'public.ai_assistants'::regclass) THEN
    ALTER TABLE public.ai_assistants ADD CONSTRAINT ai_assistants_scenario_length_check CHECK (scenario IS NULL OR char_length(scenario) <= 2000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_assistants_behaviour_length_check' AND conrelid = 'public.ai_assistants'::regclass) THEN
    ALTER TABLE public.ai_assistants ADD CONSTRAINT ai_assistants_behaviour_length_check CHECK (behaviour IS NULL OR char_length(behaviour) <= 2000);
  END IF;
END;
$constraints$;
