-- Notifications and Direct Messages for @mentions in comments

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'mention',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
  CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can manage their notifications" ON public.notifications;
  CREATE POLICY "Users can manage their notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete their notifications" ON public.notifications;
  CREATE POLICY "Users can delete their notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
  CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
END $$;

-- Timestamp trigger for notifications
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_notifications_updated_at();


-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  source_comment_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_participants_created ON public.direct_messages (recipient_id, sender_id, created_at DESC);

-- RLS policies for direct_messages
DO $$ BEGIN
  DROP POLICY IF EXISTS "Participants can view their messages" ON public.direct_messages;
  CREATE POLICY "Participants can view their messages"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

  DROP POLICY IF EXISTS "Sender can send messages" ON public.direct_messages;
  CREATE POLICY "Sender can send messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

  DROP POLICY IF EXISTS "Recipient can update read_at" ON public.direct_messages;
  CREATE POLICY "Recipient can update read_at"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

  -- No deletes by default
END $$;

-- Restrict updates on direct_messages to only allow recipient to set read_at and prevent content edits
CREATE OR REPLACE FUNCTION public.restrict_dm_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recipient can update and only read_at, metadata allowed; content/link/source immutable
  IF auth.uid() <> NEW.recipient_id THEN
    RAISE EXCEPTION 'Only recipient can update messages';
  END IF;
  IF NEW.sender_id <> OLD.sender_id OR NEW.recipient_id <> OLD.recipient_id OR NEW.content <> OLD.content OR COALESCE(NEW.link,'') <> COALESCE(OLD.link,'') OR COALESCE(NEW.source_comment_id,'00000000-0000-0000-0000-000000000000') <> COALESCE(OLD.source_comment_id,'00000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'Only read status may be updated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_restrict_dm_updates ON public.direct_messages;
CREATE TRIGGER trg_restrict_dm_updates
BEFORE UPDATE ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.restrict_dm_updates();


-- Mention handler: on insert into comment_mentions, create notification and DM
CREATE OR REPLACE FUNCTION public.handle_comment_mention()
RETURNS TRIGGER AS $$
DECLARE
  c_record RECORD;
  excerpt TEXT;
  deep_link TEXT;
BEGIN
  -- Fetch comment content and author
  SELECT c.id, c.post_id, c.user_id, c.content
  INTO c_record
  FROM public.comments c
  WHERE c.id = NEW.comment_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Do not message yourself
  IF c_record.user_id = NEW.mentioned_user_id THEN
    -- Still create a notification so the user sees it in notifications list
    INSERT INTO public.notifications(user_id, type, payload)
    VALUES (
      NEW.mentioned_user_id,
      'mention',
      jsonb_build_object(
        'comment_id', NEW.comment_id,
        'post_id', c_record.post_id,
        'by_user_id', c_record.user_id
      )
    );
    RETURN NEW;
  END IF;

  -- Build excerpt and link
  excerpt := CASE WHEN length(c_record.content) > 140 THEN substr(c_record.content, 1, 140) || '…' ELSE c_record.content END;
  deep_link := concat('/', '?post=', c_record.post_id::text, '&comment=', NEW.comment_id::text);

  -- Create notification for the mentioned user
  INSERT INTO public.notifications(user_id, type, payload)
  VALUES (
    NEW.mentioned_user_id,
    'mention',
    jsonb_build_object(
      'comment_id', NEW.comment_id,
      'post_id', c_record.post_id,
      'by_user_id', c_record.user_id,
      'excerpt', excerpt,
      'link', deep_link
    )
  );

  -- Create a direct message from the comment author to the mentioned user
  INSERT INTO public.direct_messages(sender_id, recipient_id, content, link, source_comment_id, metadata)
  VALUES (
    c_record.user_id,
    NEW.mentioned_user_id,
    concat('You were mentioned in a comment: ', excerpt),
    deep_link,
    NEW.comment_id,
    jsonb_build_object('type','mention')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_comment_mention ON public.comment_mentions;
CREATE TRIGGER trg_handle_comment_mention
AFTER INSERT ON public.comment_mentions
FOR EACH ROW
EXECUTE FUNCTION public.handle_comment_mention();
