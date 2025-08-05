import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { mockFs } from './fixtures/mockImages.js';

// Test configuration
const supabaseUrl = 'https://cmtehutbazgfjoksmkly.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdGVodXRiYXpnZmpva3Nta2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDc3MzcsImV4cCI6MjA2NzIyMzczN30.N_pjYJGlpV8cIENLeRcVyYiHGxiR_WCv669MKOxXJRA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock fs for tests
const fs = mockFs;

// Helper function to make API calls to edge functions
const apiCall = async (endpoint, method = 'GET', data = null, token = null) => {
  const url = `${supabaseUrl}/functions/v1/${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${supabaseKey}`,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data instanceof FormData) {
    // For file uploads, don't set Content-Type (let browser set it with boundary)
    options.body = data;
  } else if (data) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
  };
};

// Helper function to upload a file
const uploadFile = async (filename, token) => {
  const imageBuffer = fs.readFileSync(`test/fixtures/${filename}`);
  
  // Create FormData for file upload
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  formData.append('file', blob, filename);
  
  return await apiCall('media', 'POST', formData, token);
};

// Mock request object for compatibility with the test structure
const request = (app) => ({
  post: (path) => ({
    set: (header, value) => ({
      attach: async (fieldName, buffer, filename) => {
        const token = value.split(' ')[1];
        
        // Create FormData for file upload
        const formData = new FormData();
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        formData.append('file', blob, filename);
        
        const response = await apiCall('media', 'POST', formData, token);
        
        return {
          expect: (expectedStatus) => {
            expect(response.status).toBe(expectedStatus);
            return { body: response.body };
          }
        };
      },
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
  })
});

// Mock app object
const app = {};

describe('Image Post Functionality', () => {
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
    console.log('Cleaning up image posts and uploaded files...');
    
    if (global.imagePosts) {
      for (const post of global.imagePosts) {
        try {
          // Delete post
          await supabase.from('posts').delete().eq('id', post.id);
          
          // Delete associated media files if they exist
          if (post.media_urls && post.media_urls.length > 0) {
            for (const url of post.media_urls) {
              try {
                // Extract filename from URL
                const filename = url.split('/').pop();
                if (filename) {
                  await supabase.storage.from('post-media').remove([filename]);
                }
              } catch (error) {
                console.log(`Media cleanup error: ${error.message}`);
              }
            }
          }
        } catch (error) {
          console.log(`Post cleanup error: ${error.message}`);
        }
      }
    }
  });

  test('Should create single image post', async () => {
    const imageBuffer = fs.readFileSync('test/fixtures/test-image.jpg');
    
    // First upload image
    const uploadResponse = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${alice.token}`)
      .attach('file', imageBuffer, 'test-image.jpg')
      .expect(200);
    
    expect(uploadResponse.body.url).toBeTruthy();
    expect(uploadResponse.body.success).toBe(true);
    
    // Create image post
    const postResponse = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        content: 'Beautiful sunset from my office window! 🌅',
        post_type: 'image',
        media_urls: [uploadResponse.body.url],
        visibility: 'public'
      })
      .expect(201);
    
    expect(postResponse.body.post_type).toBe('image');
    expect(postResponse.body.media_urls).toContain(uploadResponse.body.url);
    
    global.imagePosts = global.imagePosts || [];
    global.imagePosts.push(postResponse.body);
  }, 30000);

  test('Should create multiple image post (carousel)', async () => {
    const imageFiles = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
    const uploadedUrls = [];
    
    for (const filename of imageFiles) {
      const imageBuffer = fs.readFileSync(`test/fixtures/${filename}`);
      
      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${bob.token}`)
        .attach('file', imageBuffer, filename)
        .expect(200);
      
      expect(uploadResponse.body.url).toBeTruthy();
      uploadedUrls.push(uploadResponse.body.url);
    }
    
    const postResponse = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({
        content: 'Our team retreat last week! Amazing memories 📸',
        post_type: 'carousel',
        media_urls: uploadedUrls,
        visibility: 'public'
      })
      .expect(201);
    
    expect(postResponse.body.media_urls).toHaveLength(3);
    expect(postResponse.body.post_type).toBe('carousel');
    
    global.imagePosts = global.imagePosts || [];
    global.imagePosts.push(postResponse.body);
  }, 45000);

  test('Should validate image upload constraints', async () => {
    // Test file size limit (assuming 10MB limit)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    
    const response = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${alice.token}`)
      .attach('file', largeBuffer, 'large-image.jpg')
      .expect(400);
    
    expect(response.body.error).toContain('file too large');
  }, 20000);

  test('Should validate file type restrictions', async () => {
    // Test invalid file type (simulate a text file as image)
    const textBuffer = Buffer.from('This is not an image file');
    
    // Create FormData for file upload with wrong MIME type
    const formData = new FormData();
    const blob = new Blob([textBuffer], { type: 'text/plain' });
    formData.append('file', blob, 'not-an-image.txt');
    
    const response = await apiCall('media', 'POST', formData, alice.token);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid file type');
  }, 15000);

  test('Should require authentication for media upload', async () => {
    const imageBuffer = fs.readFileSync('test/fixtures/test-image.jpg');
    
    // Try to upload without token
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'test-image.jpg');
    
    const response = await apiCall('media', 'POST', formData);
    
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Authorization header required');
  }, 10000);

  test('Should include media URLs in feed posts', async () => {
    // Ensure we have image posts from previous tests
    expect(global.imagePosts).toBeDefined();
    expect(global.imagePosts.length).toBeGreaterThan(0);
    
    // Get feed
    const response = await apiCall('posts/feed', 'GET', null, alice.token);
    
    expect(response.status).toBe(200);
    expect(response.body.posts).toBeInstanceOf(Array);
    
    // Find our image posts in the feed
    const imagePostsInFeed = response.body.posts.filter(post => 
      post.post_type === 'image' || post.post_type === 'carousel'
    );
    
    expect(imagePostsInFeed.length).toBeGreaterThan(0);
    
    // Verify image posts have media_urls
    imagePostsInFeed.forEach(post => {
      expect(post.media_urls).toBeDefined();
      expect(Array.isArray(post.media_urls)).toBe(true);
      expect(post.media_urls.length).toBeGreaterThan(0);
    });
  }, 15000);
});