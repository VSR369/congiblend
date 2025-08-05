import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = 'https://cmtehutbazgfjoksmkly.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdGVodXRiYXpnZmpva3Nta2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDc3MzcsImV4cCI6MjA2NzIyMzczN30.N_pjYJGlpV8cIENLeRcVyYiHGxiR_WCv669MKOxXJRA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to make API calls to edge functions
const apiCall = async (endpoint, method = 'GET', data = null, token = null) => {
  const url = `${supabaseUrl}/functions/v1/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
  };
};

// Mock request object for compatibility with the test structure
const request = (app) => ({
  post: (path) => ({
    set: (header, value) => ({
      send: async (data) => {
        const token = value.split(' ')[1];
        const endpoint = path.replace('/api/', '');
        const response = await apiCall(endpoint, 'POST', data, token);
        
        return {
          status: response.status,
          body: response.body,
          expect: (expectedStatus) => {
            expect(response.status).toBe(expectedStatus);
            return { body: response.body };
          }
        };
      }
    })
  }),
  get: (path) => ({
    set: (header, value) => ({
      expect: async (expectedStatus) => {
        const token = value.split(' ')[1];
        const endpoint = path.replace('/api/', '');
        const response = await apiCall(endpoint, 'GET', null, token);
        
        expect(response.status).toBe(expectedStatus);
        return { body: response.body };
      }
    })
  })
});

// Mock app object
const app = {};

describe('Text Post Functionality', () => {
  let alice, bob, charlie, diana;
  
  beforeEach(() => {
    // Ensure test users are available from the previous test suite
    if (!global.testUsers || global.testUsers.length < 4) {
      throw new Error('Test users not found. Please run the multi-user registration tests first.');
    }
    [alice, bob, charlie, diana] = global.testUsers;
  });

  // Clean up after tests
  afterAll(async () => {
    console.log('Cleaning up text posts...');
    
    if (global.textPosts) {
      for (const post of global.textPosts) {
        try {
          await supabase.from('posts').delete().eq('id', post.id);
        } catch (error) {
          console.log(`Post cleanup error: ${error.message}`);
        }
      }
    }
  });

  test('Should create text posts with different content types', async () => {
    const textPosts = [
      {
        user: alice,
        content: 'Just shipped a new feature! 🚀 #development #coding',
        visibility: 'public',
        type: 'text'
      },
      {
        user: bob,
        content: 'Thoughts on the new product roadmap:\n\n1. User feedback integration\n2. Performance improvements\n3. Mobile app enhancements\n\nWhat do you think?',
        visibility: 'public', 
        type: 'text'
      },
      {
        user: charlie,
        content: 'New tutorial series coming soon! Will cover:\n• React Hooks deep dive\n• State management patterns\n• Performance optimization\n\nAny specific topics you\'d like me to cover? @alice @bob',
        visibility: 'public',
        type: 'text'
      }
    ];

    const createdPosts = [];
    
    for (const postData of textPosts) {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${postData.user.token}`)
        .send({
          content: postData.content,
          visibility: postData.visibility,
          post_type: postData.type
        })
        .expect(201);
      
      expect(response.body.content).toBe(postData.content);
      expect(response.body.author_id).toBe(postData.user.id);
      expect(response.body.post_type).toBe(postData.type);
      
      createdPosts.push(response.body);
    }
    
    global.textPosts = createdPosts;
    expect(createdPosts).toHaveLength(3);
  }, 20000);

  test('Should retrieve text posts in feed', async () => {
    const response = await request(app)
      .get('/api/posts/feed')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    
    expect(response.body.posts).toBeInstanceOf(Array);
    expect(response.body.posts.length).toBeGreaterThan(0);
    
    // Verify posts contain required fields
    response.body.posts.forEach(post => {
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('author_id');
      expect(post).toHaveProperty('created_at');
      expect(post).toHaveProperty('reaction_count');
      expect(post).toHaveProperty('comment_count');
    });
  }, 15000);

  test('Should extract hashtags and mentions from posts', async () => {
    expect(global.textPosts).toBeDefined();
    expect(global.textPosts.length).toBeGreaterThan(0);

    // Check Alice's post for hashtags
    const alicePost = global.textPosts.find(post => post.author_id === alice.id);
    expect(alicePost).toBeDefined();
    expect(alicePost.hashtags).toContain('#development');
    expect(alicePost.hashtags).toContain('#coding');

    // Check Charlie's post for mentions
    const charliePost = global.textPosts.find(post => post.author_id === charlie.id);
    expect(charliePost).toBeDefined();
    expect(charliePost.mentions).toContain('alice');
    expect(charliePost.mentions).toContain('bob');
  }, 10000);

  test('Should validate post content requirements', async () => {
    // Test empty content
    const emptyContentResponse = await apiCall('posts', 'POST', {
      content: '',
      visibility: 'public',
      post_type: 'text'
    }, alice.token);
    
    expect(emptyContentResponse.status).toBe(400);
    expect(emptyContentResponse.body.error).toContain('Content is required');

    // Test missing content
    const missingContentResponse = await apiCall('posts', 'POST', {
      visibility: 'public',
      post_type: 'text'
    }, alice.token);
    
    expect(missingContentResponse.status).toBe(400);
    expect(missingContentResponse.body.error).toContain('Content is required');
  }, 10000);

  test('Should support different visibility levels', async () => {
    const visibilityTests = [
      { visibility: 'public', content: 'This is a public post' },
      { visibility: 'connections', content: 'This is for connections only' },
      { visibility: 'private', content: 'This is a private post' }
    ];

    for (const testData of visibilityTests) {
      const response = await apiCall('posts', 'POST', {
        content: testData.content,
        visibility: testData.visibility,
        post_type: 'text'
      }, alice.token);
      
      expect(response.status).toBe(201);
      expect(response.body.visibility).toBe(testData.visibility);
      expect(response.body.content).toBe(testData.content);
      
      // Clean up
      await supabase.from('posts').delete().eq('id', response.body.id);
    }
  }, 15000);
});