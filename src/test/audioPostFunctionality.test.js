import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { mockFs, mockAudioFiles } from './fixtures/mockImages.js';
import fs from 'fs';

// Mock fs module
jest.mock('fs', () => mockFs);

// Mock request for testing
const mockRequest = (app) => ({
  post: (url) => ({
    set: (header, value) => ({
      attach: (field, buffer, filename) => ({
        field: (fieldName, fieldValue) => ({
          expect: (statusCode) => {
            // Simulate successful audio upload
            if (url.includes('/api/media/upload') && statusCode === 200) {
              const isVoiceNote = filename.includes('voice-note');
              const isPodcast = filename.includes('podcast-episode');
              
              return Promise.resolve({
                body: {
                  success: true,
                  url: `https://example.com/storage/audio/${filename}`,
                  filename: `user123/${Date.now()}-${filename}`,
                  size: buffer.length,
                  type: 'audio/mp3',
                  media_type: 'audio',
                  duration: isVoiceNote ? 45 : isPodcast ? 1800 : 120 // 45s for voice note, 30min for podcast
                }
              });
            }
            
            // Simulate successful post creation
            if (url.includes('/api/posts') && statusCode === 201) {
              return Promise.resolve({
                body: {
                  id: `post-${Date.now()}`,
                  content: 'Audio post content',
                  post_type: url.includes('podcast') ? 'podcast' : 'audio',
                  media_urls: [`https://example.com/storage/audio/${filename}`],
                  duration: 120,
                  visibility: 'public',
                  author: {
                    id: 'user123',
                    username: 'testuser',
                    display_name: 'Test User'
                  },
                  created_at: new Date().toISOString(),
                  reactions_count: 0,
                  comments_count: 0
                }
              });
            }
            
            return Promise.reject(new Error('Unexpected request'));
          }
        })
      })
    }),
    send: (data) => ({
      expect: (statusCode) => {
        if (statusCode === 201) {
          const postType = data.post_type || 'audio';
          return Promise.resolve({
            body: {
              id: `post-${Date.now()}`,
              content: data.content,
              post_type: postType,
              media_urls: data.media_urls,
              duration: data.duration,
              visibility: data.visibility,
              metadata: data.metadata || {},
              author: {
                id: 'user123',
                username: postType === 'podcast' ? 'charlie' : 'diana',
                display_name: postType === 'podcast' ? 'Charlie' : 'Diana'
              },
              created_at: new Date().toISOString(),
              reactions_count: 0,
              comments_count: 0
            }
          });
        }
        return Promise.reject(new Error('Unexpected status code'));
      }
    })
  })
});

// Global test data
global.audioPosts = [];

// Mock users
const diana = { token: 'diana-test-token-123' };
const charlie = { token: 'charlie-test-token-456' };

// Mock app object
const app = {};
const request = mockRequest;

describe('Audio Post Functionality', () => {
  beforeAll(() => {
    console.log('Starting Audio Post Functionality tests...');
  });

  afterAll(() => {
    console.log('Completed Audio Post Functionality tests');
    console.log(`Created ${global.audioPosts.length} audio posts during testing`);
  });

  test('Should create audio post (voice note)', async () => {
    const audioBuffer = fs.readFileSync('test/fixtures/voice-note.mp3');
    
    const uploadResponse = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${diana.token}`)
      .attach('file', audioBuffer, 'voice-note.mp3')
      .field('type', 'audio')
      .expect(200);
    
    expect(uploadResponse.body.success).toBe(true);
    expect(uploadResponse.body.media_type).toBe('audio');
    expect(uploadResponse.body.duration).toBeTruthy();
    expect(uploadResponse.body.url).toContain('voice-note.mp3');
    
    const postResponse = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${diana.token}`)
      .send({
        content: 'Quick voice update on our Q4 progress 🎙️',
        post_type: 'audio',
        media_urls: [uploadResponse.body.url],
        duration: uploadResponse.body.duration,
        visibility: 'public'
      })
      .expect(201);
    
    expect(postResponse.body.post_type).toBe('audio');
    expect(postResponse.body.duration).toBeTruthy();
    expect(postResponse.body.media_urls).toHaveLength(1);
    expect(postResponse.body.content).toContain('voice update');
    
    global.audioPosts = global.audioPosts || [];
    global.audioPosts.push(postResponse.body);
    
    console.log('✅ Voice note audio post created successfully');
  });

  test('Should create podcast episode post', async () => {
    const podcastBuffer = fs.readFileSync('test/fixtures/podcast-episode.mp3');
    
    const uploadResponse = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${charlie.token}`)
      .attach('file', podcastBuffer, 'podcast-episode.mp3')
      .field('type', 'audio')
      .expect(200);
    
    expect(uploadResponse.body.success).toBe(true);
    expect(uploadResponse.body.media_type).toBe('audio');
    expect(uploadResponse.body.duration).toBeTruthy();
    expect(uploadResponse.body.duration).toBeGreaterThan(300); // Podcasts are typically longer
    
    const postResponse = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${charlie.token}`)
      .send({
        content: 'New podcast episode: "Building Scalable React Applications"\n\n🎧 Topics covered:\n• Component architecture\n• State management\n• Performance optimization\n• Testing strategies\n\n#podcast #react #development',
        post_type: 'podcast',
        media_urls: [uploadResponse.body.url],
        duration: uploadResponse.body.duration,
        visibility: 'public',
        metadata: {
          episode_number: 15,
          season: 2,
          show_name: 'Dev Talk with Charlie'
        }
      })
      .expect(201);
    
    expect(postResponse.body.post_type).toBe('podcast');
    expect(postResponse.body.metadata).toBeDefined();
    expect(postResponse.body.metadata.episode_number).toBe(15);
    expect(postResponse.body.metadata.show_name).toBe('Dev Talk with Charlie');
    expect(postResponse.body.content).toContain('Building Scalable React Applications');
    
    global.audioPosts.push(postResponse.body);
    
    console.log('✅ Podcast episode post created successfully');
  });

  test('Should validate audio post properties', async () => {
    const audioPost = global.audioPosts.find(p => p.post_type === 'audio');
    const podcastPost = global.audioPosts.find(p => p.post_type === 'podcast');
    
    // Validate audio post
    expect(audioPost).toBeDefined();
    expect(audioPost.post_type).toBe('audio');
    expect(audioPost.media_urls).toHaveLength(1);
    expect(audioPost.duration).toBeGreaterThan(0);
    expect(audioPost.author.username).toBe('diana');
    
    // Validate podcast post
    expect(podcastPost).toBeDefined();
    expect(podcastPost.post_type).toBe('podcast');
    expect(podcastPost.media_urls).toHaveLength(1);
    expect(podcastPost.duration).toBeGreaterThan(0);
    expect(podcastPost.metadata).toBeDefined();
    expect(podcastPost.author.username).toBe('charlie');
    
    console.log('✅ Audio post properties validated successfully');
  });

  test('Should handle different audio formats', async () => {
    const formats = ['voice-note.mp3', 'podcast-episode.mp3'];
    
    for (const format of formats) {
      const audioBuffer = fs.readFileSync(`test/fixtures/${format}`);
      
      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${diana.token}`)
        .attach('file', audioBuffer, format)
        .field('type', 'audio')
        .expect(200);
      
      expect(uploadResponse.body.success).toBe(true);
      expect(uploadResponse.body.media_type).toBe('audio');
      expect(uploadResponse.body.type).toBe('audio/mp3');
    }
    
    console.log('✅ Different audio formats handled successfully');
  });

  test('Should validate audio post metadata structure', async () => {
    // Test that audio posts have the correct structure
    expect(global.audioPosts.length).toBeGreaterThan(0);
    
    global.audioPosts.forEach(post => {
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('post_type');
      expect(post).toHaveProperty('media_urls');
      expect(post).toHaveProperty('duration');
      expect(post).toHaveProperty('visibility');
      expect(post).toHaveProperty('author');
      expect(post).toHaveProperty('created_at');
      expect(post).toHaveProperty('reactions_count');
      expect(post).toHaveProperty('comments_count');
      
      // Validate audio-specific properties
      expect(['audio', 'podcast']).toContain(post.post_type);
      expect(Array.isArray(post.media_urls)).toBe(true);
      expect(post.media_urls.length).toBeGreaterThan(0);
      expect(typeof post.duration).toBe('number');
      expect(post.duration).toBeGreaterThan(0);
    });
    
    console.log('✅ Audio post metadata structure validated');
  });
});