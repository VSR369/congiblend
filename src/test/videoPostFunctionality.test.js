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

// Helper function to upload a video file
const uploadVideo = async (filename, token) => {
  const videoBuffer = fs.readFileSync(`test/fixtures/${filename}`);
  
  // Create FormData for file upload
  const formData = new FormData();
  const blob = new Blob([videoBuffer], { type: 'video/mp4' });
  formData.append('file', blob, filename);
  formData.append('type', 'video');
  
  return await apiCall('media/upload', 'POST', formData, token);
};

// Mock request object for compatibility with the test structure
const request = (app) => ({
  post: (path) => ({
    set: (header, value) => ({
      attach: async (fieldName, buffer, filename) => {
        const token = value.split(' ')[1];
        
        // Create FormData for file upload
        const formData = new FormData();
        const blob = new Blob([buffer], { type: 'video/mp4' });
        formData.append('file', blob, filename);
        
        return {
          field: (name, value) => ({
            expect: async (expectedStatus) => {
              formData.append(name, value);
              const response = await apiCall('media/upload', 'POST', formData, token);
              
              expect(response.status).toBe(expectedStatus);
              return { body: response.body };
            }
          }),
          expect: async (expectedStatus) => {
            const response = await apiCall('media/upload', 'POST', formData, token);
            
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

describe('Video Post Functionality', () => {
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
    console.log('Cleaning up video posts and uploaded files...');
    
    if (global.videoPosts) {
      for (const post of global.videoPosts) {
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
          
          // Delete thumbnail if exists
          if (post.thumbnail_url) {
            try {
              const thumbnailFilename = post.thumbnail_url.split('/').pop();
              if (thumbnailFilename) {
                await supabase.storage.from('post-media').remove([thumbnailFilename]);
              }
            } catch (error) {
              console.log(`Thumbnail cleanup error: ${error.message}`);
            }
          }
          
          // Delete processing record
          await supabase.from('media_processing').delete().eq('user_id', post.user_id || post.author_id);
        } catch (error) {
          console.log(`Post cleanup error: ${error.message}`);
        }
      }
    }
  });

  test('Should create video post with thumbnail', async () => {
    const videoBuffer = fs.readFileSync('test/fixtures/test-video.mp4');
    
    // Upload video
    const uploadResponse = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${charlie.token}`)
      .attach('file', videoBuffer, 'test-video.mp4')
      .field('type', 'video')
      .expect(200);
    
    expect(uploadResponse.body.video_url).toBeTruthy();
    expect(uploadResponse.body.thumbnail_url).toBeTruthy();
    expect(uploadResponse.body.media_type).toBe('video');
    
    // Create video post
    const postResponse = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${charlie.token}`)
      .send({
        content: 'New coding tutorial: Advanced React Patterns 🎥',
        post_type: 'video',
        media_urls: [uploadResponse.body.video_url],
        thumbnail_url: uploadResponse.body.thumbnail_url,
        visibility: 'public'
      })
      .expect(201);
    
    expect(postResponse.body.post_type).toBe('video');
    expect(postResponse.body.thumbnail_url).toBeTruthy();
    expect(postResponse.body.media_urls).toContain(uploadResponse.body.video_url);
    
    global.videoPosts = global.videoPosts || [];
    global.videoPosts.push(postResponse.body);
  }, 45000);

  test('Should handle video processing status', async () => {
    // Ensure we have a video post from the previous test
    expect(global.videoPosts).toBeDefined();
    expect(global.videoPosts.length).toBeGreaterThan(0);
    
    const videoPost = global.videoPosts[0];
    
    // Check video processing status
    const statusResponse = await request(app)
      .get(`/api/media/status/${videoPost.id}`)
      .set('Authorization', `Bearer ${charlie.token}`)
      .expect(200);
    
    expect(statusResponse.body.processing_status).toMatch(/processing|completed|failed/);
    expect(statusResponse.body).toHaveProperty('processing_progress');
    expect(statusResponse.body).toHaveProperty('video_url');
  }, 20000);

  test('Should validate video file size limits', async () => {
    // Test video file size limit (100MB+)
    const largeVideoBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB
    
    const response = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${charlie.token}`)
      .attach('file', largeVideoBuffer, 'large-video.mp4')
      .field('type', 'video')
      .expect(400);
    
    expect(response.body.error).toContain('File too large');
    expect(response.body.error).toContain('100MB');
  }, 30000);

  test('Should validate video file types', async () => {
    // Test invalid video file type
    const invalidBuffer = Buffer.from('This is not a video file');
    
    // Create FormData for file upload with wrong MIME type
    const formData = new FormData();
    const blob = new Blob([invalidBuffer], { type: 'text/plain' });
    formData.append('file', blob, 'not-a-video.txt');
    formData.append('type', 'video');
    
    const response = await apiCall('media/upload', 'POST', formData, charlie.token);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid file type');
  }, 15000);

  test('Should create processing record for video uploads', async () => {
    const videoBuffer = fs.readFileSync('test/fixtures/test-video.mp4');
    
    // Upload another video
    const formData = new FormData();
    const blob = new Blob([videoBuffer], { type: 'video/mp4' });
    formData.append('file', blob, 'test-video-2.mp4');
    formData.append('type', 'video');
    
    const uploadResponse = await apiCall('media/upload', 'POST', formData, charlie.token);
    
    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.video_url).toBeTruthy();
    
    // Check that processing record was created
    const { data: processingRecord } = await supabase
      .from('media_processing')
      .select('*')
      .eq('user_id', charlie.id)
      .eq('media_type', 'video')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    expect(processingRecord).toBeTruthy();
    expect(processingRecord.media_type).toBe('video');
    expect(processingRecord.video_url).toBeTruthy();
    expect(processingRecord.processing_status).toBe('completed');
    
    // Clean up the uploaded file
    try {
      const filename = uploadResponse.body.filename;
      await supabase.storage.from('post-media').remove([filename]);
      
      if (uploadResponse.body.thumbnail_url) {
        const thumbnailFilename = uploadResponse.body.thumbnail_url.split('/').pop();
        await supabase.storage.from('post-media').remove([thumbnailFilename]);
      }
      
      await supabase.from('media_processing').delete().eq('id', processingRecord.id);
    } catch (error) {
      console.log(`Cleanup error: ${error.message}`);
    }
  }, 30000);

  test('Should include video posts with thumbnails in feed', async () => {
    // Ensure we have video posts from previous tests
    expect(global.videoPosts).toBeDefined();
    expect(global.videoPosts.length).toBeGreaterThan(0);
    
    // Get feed
    const response = await apiCall('posts/feed', 'GET', null, charlie.token);
    
    expect(response.status).toBe(200);
    expect(response.body.posts).toBeInstanceOf(Array);
    
    // Find our video posts in the feed
    const videoPostsInFeed = response.body.posts.filter(post => 
      post.post_type === 'video'
    );
    
    expect(videoPostsInFeed.length).toBeGreaterThan(0);
    
    // Verify video posts have required fields
    videoPostsInFeed.forEach(post => {
      expect(post.media_urls).toBeDefined();
      expect(Array.isArray(post.media_urls)).toBe(true);
      expect(post.media_urls.length).toBeGreaterThan(0);
      expect(post.thumbnail_url).toBeTruthy();
    });
  }, 20000);
});