-- Create comprehensive RLS policies for all tables

-- Users table policies
CREATE POLICY "Users can view public profiles" ON public.users
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Companies table policies
CREATE POLICY "Companies are publicly visible" ON public.companies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create companies" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (true);

-- Skills table policies
CREATE POLICY "Skills are publicly visible" ON public.skills
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create skills" ON public.skills
  FOR INSERT TO authenticated WITH CHECK (true);

-- User skills policies
CREATE POLICY "User skills are publicly visible" ON public.user_skills
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own skills" ON public.user_skills
  FOR ALL USING (auth.uid() = user_id);

-- Experiences policies
CREATE POLICY "Experiences are publicly visible" ON public.experiences
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own experiences" ON public.experiences
  FOR ALL USING (auth.uid() = user_id);

-- Posts policies
CREATE POLICY "Users can view posts based on visibility" ON public.posts
  FOR SELECT USING (
    visibility = 'public' OR
    (visibility = 'connections' AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.connections c
        WHERE (c.user1_id = auth.uid() AND c.user2_id = posts.user_id)
           OR (c.user2_id = auth.uid() AND c.user1_id = posts.user_id)
        AND c.status = 'accepted'
      )
    )) OR
    (visibility = 'private' AND user_id = auth.uid())
  );

CREATE POLICY "Users can create posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view comments on visible posts" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = comments.post_id
      AND (
        p.visibility = 'public' OR
        (p.visibility = 'connections' AND (
          p.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.connections c
            WHERE (c.user1_id = auth.uid() AND c.user2_id = p.user_id)
               OR (c.user2_id = auth.uid() AND c.user1_id = p.user_id)
            AND c.status = 'accepted'
          )
        )) OR
        (p.visibility = 'private' AND p.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions policies
CREATE POLICY "Users can view reactions" ON public.reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reactions" ON public.reactions
  FOR ALL USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Users can view follows" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows" ON public.follows
  FOR ALL USING (auth.uid() = follower_id);

-- Connections policies
CREATE POLICY "Users can view their connections" ON public.connections
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create connection requests" ON public.connections
  FOR INSERT WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "Users can update connections they're part of" ON public.connections
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Conversation participants policies
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can manage participants in conversations they created" ON public.conversation_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can send messages to conversations they're part of" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);