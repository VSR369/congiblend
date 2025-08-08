import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Database seeding for development
export const seedDevelopmentData = async () => {
  if (import.meta.env.PROD) {
    throw new Error('Seeding only allowed in development');
  }
  
  try {
    console.log('Starting database seeding...');
    
    // Create test users first
    const testUsers = await createTestUsers(10);
    console.log(`Created ${testUsers.length} test users`);
    
    // Create test posts
    const testPosts = await createTestPosts(testUsers, 50);
    console.log(`Created ${testPosts.length} test posts`);
    
    // Create test interactions
    await createTestInteractions(testUsers, testPosts);
    console.log('Created test interactions');
    
    toast.success('Development data seeded successfully!');
    return { users: testUsers.length, posts: testPosts.length };
  } catch (error) {
    console.error('Seeding failed:', error);
    toast.error('Failed to seed development data');
    throw error;
  }
};

// Create test users
const createTestUsers = async (count: number) => {
  const testUsers = [];
  
  for (let i = 0; i < count; i++) {
    const email = `testuser${i + 1}@example.com`;
    const password = 'password123';
    
    try {
      // Sign up test user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: `testuser${i + 1}`,
            display_name: `Test User ${i + 1}`,
          }
        }
      });
      
      if (authError) {
        console.warn(`Failed to create user ${email}:`, authError.message);
        continue;
      }
      
      if (authData.user) {
        testUsers.push(authData.user);
        
        // Create user profile
        await supabase.from('profiles').insert({
          id: authData.user.id,
          username: `testuser${i + 1}`,
          display_name: `Test User ${i + 1}`,
          bio: `Bio for test user ${i + 1}`,
          location: ['New York', 'London', 'Tokyo', 'Sydney', 'Berlin'][i % 5],
          is_verified: Math.random() > 0.7,
          custom_user_id: `testuser${i + 1}`,
          organization_name: `Test Company ${i + 1}`,
          organization_type: 'Corporation',
          entity_type: 'Private',
          country: 'United States',
          contact_person_name: `Test User ${i + 1}`,
        });
      }
    } catch (error) {
      console.warn(`Error creating user ${email}:`, error);
    }
  }
  
  return testUsers;
};

// Create test posts
const createTestPosts = async (users: any[], count: number) => {
  const postContents = [
    "Just shipped a new feature! 🚀 #development #coding",
    "Beautiful sunset today 🌅 #nature #photography",
    "Working on an exciting project with @teammate #collaboration",
    "Coffee and code - perfect combination ☕ #developer #morning",
    "Thoughts on the latest tech trends? #technology #innovation",
    "Great meeting with the team today! #teamwork #progress",
    "Learning something new every day 📚 #growth #learning",
    "Weekend coding session in progress 💻 #weekend #coding",
    "Excited about the upcoming conference! #conference #networking",
    "Simple things bring the most joy ✨ #gratitude #mindfulness"
  ];
  
  const postTypes = ['text', 'image', 'article', 'poll'];
  const visibilityOptions = ['public', 'connections', 'private'];
  
  const testPosts = [];
  
  for (let i = 0; i < count; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const content = postContents[Math.floor(Math.random() * postContents.length)];
    
    try {
      const { data: post, error } = await supabase.from('posts').insert({
        user_id: randomUser.id,
        content,
        type: postTypes[Math.floor(Math.random() * postTypes.length)],
        visibility: visibilityOptions[Math.floor(Math.random() * visibilityOptions.length)],
        hashtags: extractHashtags(content),
        mentions: extractMentions(content),
        reactions_count: Math.floor(Math.random() * 50),
        comments_count: Math.floor(Math.random() * 20),
        shares_count: Math.floor(Math.random() * 10),
        views_count: Math.floor(Math.random() * 200),
      }).select().single();
      
      if (!error && post) {
        testPosts.push(post);
      }
    } catch (error) {
      console.warn('Error creating post:', error);
    }
  }
  
  return testPosts;
};

  // Create test interactions (reactions, connections)
const createTestInteractions = async (users: any[], posts: any[]) => {
  // Comments functionality removed
  
  // Create test reactions
  for (let i = 0; i < 200; i++) {
    const randomPost = posts[Math.floor(Math.random() * posts.length)];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const reactionTypes = ['like', 'love', 'celebrate', 'support', 'insightful', 'curious'];
    
    try {
      await supabase.from('reactions').insert({
        user_id: randomUser.id,
        target_type: 'post',
        target_id: randomPost.id,
        reaction_type: reactionTypes[Math.floor(Math.random() * reactionTypes.length)],
      });
    } catch (error) {
      // Ignore duplicate reactions
      if (!error.message?.includes('duplicate')) {
        console.warn('Error creating reaction:', error);
      }
    }
  }
  
  // Create test connections
  for (let i = 0; i < 50; i++) {
    const user1 = users[Math.floor(Math.random() * users.length)];
    const user2 = users[Math.floor(Math.random() * users.length)];
    
    if (user1.id !== user2.id) {
      try {
        await supabase.from('connections').insert({
          user1_id: user1.id,
          user2_id: user2.id,
          initiated_by: user1.id,
          status: Math.random() > 0.3 ? 'accepted' : 'pending',
          message: `Connection request from ${user1.email}`,
        });
      } catch (error) {
        // Ignore duplicates
        if (!error.message?.includes('duplicate')) {
          console.warn('Error creating connection:', error);
        }
      }
    }
  }
};

// Production data validation
export const validateProductionData = async () => {
  const issues: string[] = [];
  
  try {
    // Check for test data in users
    const { count: testUserCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or('username.ilike.%test%,display_name.ilike.%test%,bio.ilike.%test%');
    
    if (testUserCount && testUserCount > 0) {
      issues.push(`Found ${testUserCount} test users in production`);
    }
    
    // Check for incomplete profiles
    const { count: incompleteProfileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or('username.is.null,display_name.is.null');
    
    if (incompleteProfileCount && incompleteProfileCount > 0) {
      issues.push(`Found ${incompleteProfileCount} incomplete user profiles`);
    }
    
    // Check for test content in posts
    const { count: testPostCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .or('content.ilike.%test%,content.ilike.%lorem%,content.ilike.%example%');
    
    if (testPostCount && testPostCount > 0) {
      issues.push(`Found ${testPostCount} test posts in production`);
    }
    
    // Comments functionality removed
    
    // Check for orphaned reactions (reactions without valid target posts)
    const { data: orphanedReactions } = await supabase
      .from('reactions')
      .select('id')
      .eq('target_type', 'post')
      .not('target_id', 'in', `(SELECT id FROM posts)`);
    
    if (orphanedReactions && orphanedReactions.length > 0) {
      issues.push(`Found ${orphanedReactions.length} orphaned reactions`);
    }
    
    console.log('Production data validation completed');
    return issues;
  } catch (error) {
    console.error('Validation error:', error);
    return [`Validation failed: ${error}`];
  }
};

// Clean up all test data
export const cleanupTestData = async () => {
  if (import.meta.env.PROD) {
    throw new Error('Cleanup only allowed in development');
  }
  
  try {
    console.log('Starting test data cleanup...');
    
    // Remove test users and their associated data
    const { data: testUsers } = await supabase
      .from('profiles')
      .select('id')
      .or('username.ilike.%test%,display_name.ilike.%test%,bio.ilike.%test%');
    
    if (testUsers && testUsers.length > 0) {
      const userIds = testUsers.map(u => u.id);
      
      // Delete reactions by test users
      await supabase.from('reactions').delete().in('user_id', userIds);
      
      // Comments functionality removed
      
      // Delete posts by test users
      await supabase.from('posts').delete().in('user_id', userIds);
      
      // Delete connections involving test users
      await supabase.from('connections').delete().or(`user1_id.in.(${userIds.join(',')}),user2_id.in.(${userIds.join(',')})`);
      
      // Delete test user profiles
      await supabase.from('profiles').delete().in('id', userIds);
    }
    
    // Remove test posts
    await supabase.from('posts').delete().or('content.ilike.%test%,content.ilike.%lorem%,content.ilike.%example%');
    
    toast.success('Test data cleaned up successfully!');
    console.log('Test data cleanup completed');
  } catch (error) {
    console.error('Cleanup failed:', error);
    toast.error('Failed to cleanup test data');
    throw error;
  }
};

// Helper functions
const extractHashtags = (content: string): string[] => {
  const hashtagRegex = /#[\w]+/g;
  const matches = content.match(hashtagRegex) || [];
  return [...new Set(matches)];
};

const extractMentions = (content: string): string[] => {
  const mentionRegex = /@[\w]+/g;
  const matches = content.match(mentionRegex) || [];
  return [...new Set(matches.map(m => m.substring(1)))];
};