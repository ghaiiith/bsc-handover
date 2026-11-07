-- 079_messaging.sql
-- Report BS-18: in-app direct messaging with server-enforced permissions.
--   * Students may NOT start a conversation with other students.
--   * Companies may message students.
-- The rule is enforced in the server action AND at the DB boundary by keeping
-- INSERTs service-role-only (the app ships a public anon client, so RLS is the
-- real trust boundary — mirrors the enrollments/reviews lockdown).

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  participant_two uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (participant_one <> participant_two)
);
-- One conversation per unordered pair.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_conversation_pair
  ON public.conversations (
    LEAST(participant_one, participant_two),
    GREATEST(participant_one, participant_two)
  );
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations (participant_one, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations (participant_two, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id, created_at);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Participants may READ their conversations and messages. All writes go through
-- the service-role client in server actions (which enforce the messaging rule),
-- so there is no INSERT/UPDATE policy for the authenticated role.
DROP POLICY IF EXISTS "conversations_participant_read" ON public.conversations;
CREATE POLICY "conversations_participant_read" ON public.conversations
  FOR SELECT USING (participant_one = auth.uid() OR participant_two = auth.uid());

DROP POLICY IF EXISTS "messages_participant_read" ON public.messages;
CREATE POLICY "messages_participant_read" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

-- Live updates for participants (realtime respects the SELECT policies above).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
