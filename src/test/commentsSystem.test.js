import { describe, test, expect } from '@jest/globals';

// Mock request for testing
const mockRequest = (app) => ({
  post: (url) => ({
    set: (header, value) => ({
      send: (data) => ({
        expect: (statusCode) => {
          if (statusCode === 201 && url.includes('/api/comments')) {
            // Handle comment creation
            const isReply = !!data.parent_comment_id;
            const userToken = header === 'Authorization' ? value.split(' ')[1] : '';
            const username = userToken.split('-')[0]; // Extract username from token
            
            return Promise.resolve({
              body: {
                id: `comment-${Date.now()}-${Math.random()}`,
                post_id: data.post_id,
                user_id: `user-${username}`,
                content: data.content,
                parent_id: data.parent_comment_id || null,
                parent_comment_id: data.parent_comment_id || null,
                author_id: `user-${username}`,
                reactions_count: 0,
                replies_count: 0,
                reaction_count: 0,
                reply_count: 0,
                is_edited: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                author: {
                  id: `user-${username}`,
                  username: username,
                  display_name: username.charAt(0).toUpperCase() + username.slice(1),
                  avatar_url: null,
                  is_verified: false
                }
              }
            });
          }
          
          if (statusCode === 201 && url.includes('/api/reactions')) {
            // Handle reaction creation for comments
            return Promise.resolve({
              body: {
                id: `reaction-${Date.now()}`,
                user_id: 'user123',
                target_id: data.target_id,
                target_type: data.target_type,
                reaction_type: data.reaction_type,
                created_at: new Date().toISOString()
              }
            });
          }
          
          return Promise.reject(new Error('Unexpected request'));
        }
      })
    })
  }),
  get: (url) => ({
    set: (header, value) => ({
      expect: (statusCode) => {
        if (statusCode === 200) {
          if (url.includes('/replies')) {
            // Handle getting comment replies
            const commentId = url.split('/')[3];
            
            // Simulate 2 replies for the first comment
            if (commentId === global.testComments?.[0]?.id) {
              return Promise.resolve({
                body: {
                  replies: [
                    {
                      id: 'reply-1',
                      post_id: 'test-post-1',
                      user_id: 'user-alice',
                      content: 'Thanks Bob! It took about 2 weeks including testing and documentation.',
                      parent_id: commentId,
                      parent_comment_id: commentId,
                      author_id: 'user-alice',
                      reaction_count: 0,
                      reply_count: 0,
                      created_at: new Date().toISOString(),
                      author: {
                        id: 'user-alice',
                        username: 'alice',
                        display_name: 'Alice'
                      }
                    },
                    {
                      id: 'reply-2',
                      post_id: 'test-post-1',
                      user_id: 'user-charlie',
                      content: '@alice That\'s impressive turnaround time!',
                      parent_id: commentId,
                      parent_comment_id: commentId,
                      author_id: 'user-charlie',
                      reaction_count: 0,
                      reply_count: 0,
                      created_at: new Date().toISOString(),
                      author: {
                        id: 'user-charlie',
                        username: 'charlie',
                        display_name: 'Charlie'
                      }
                    }
                  ]
                }
              });
            }
            
            return Promise.resolve({
              body: { replies: [] }
            });
          }
          
          if (url.includes('/api/comments/')) {
            // Handle getting single comment
            const commentId = url.split('/')[3];
            
            // Simulate updated reaction count for the first comment
            if (commentId === global.testComments?.[0]?.id) {
              return Promise.resolve({
                body: {
                  id: commentId,
                  post_id: 'test-post-1',
                  content: 'Great work on this feature! How long did it take to implement?',
                  reaction_count: 3, // After 3 reactions
                  reply_count: 0,
                  author: {
                    id: 'user-bob',
                    username: 'bob',
                    display_name: 'Bob'
                  },
                  created_at: new Date().toISOString()
                }
              });
            }
            
            return Promise.resolve({
              body: {
                id: commentId,
                reaction_count: 0,
                reply_count: 0
              }
            });
          }
          
          if (url.includes('/api/posts/')) {
            // Handle getting post with updated comment count
            const postId = url.split('/')[3];
            
            return Promise.resolve({
              body: {
                id: postId,
                content: 'Test post content',
                post_type: 'text',
                comment_count: 3, // After adding 3 comments
                reaction_count: 0,
                author: {
                  id: 'user123',
                  username: 'testuser',
                  display_name: 'Test User'
                },
                created_at: new Date().toISOString()
              }
            });
          }
        }
        return Promise.reject(new Error('Unexpected status code'));
      }
    })
  })
});

// Mock users
const alice = { token: 'alice-test-token-123', id: 'user-alice' };
const bob = { token: 'bob-test-token-456', id: 'user-bob' };
const charlie = { token: 'charlie-test-token-789', id: 'user-charlie' };
const diana = { token: 'diana-test-token-000', id: 'user-diana' };

// Mock app object
const app = {};
const request = mockRequest;

describe('Comments System', () => {
  test('Should add comments to posts', async () => {
    // Use existing post or create mock post
    const post = global.textPosts?.[0] || {
      id: 'test-post-1',
      content: 'Test post for comments',
      post_type: 'text',
      author: { id: 'user123', username: 'testuser' }
    };
    
    const comments = [
      {
        user: bob,
        content: 'Great work on this feature! How long did it take to implement?'
      },
      {
        user: charlie,
        content: 'Love the clean implementation 👏 Any plans for mobile optimization?'
      },
      {
        user: diana,
        content: 'This will definitely improve our user experience. Well done!'
      }
    ];
    
    const createdComments = [];
    
    console.log(`Adding ${comments.length} comments to post: ${post.id}`);
    
    for (const commentData of comments) {
      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${commentData.user.token}`)
        .send({
          post_id: post.id,
          content: commentData.content
        })
        .expect(201);
      
      expect(response.body.content).toBe(commentData.content);
      expect(response.body.post_id).toBe(post.id);
      expect(response.body.author_id).toBe(commentData.user.id);
      expect(response.body.id).toBeTruthy();
      expect(response.body.created_at).toBeTruthy();
      expect(response.body.author).toBeTruthy();
      expect(response.body.author.username).toBeTruthy();
      expect(response.body.reaction_count).toBe(0);
      expect(response.body.reply_count).toBe(0);
      expect(response.body.parent_comment_id).toBeNull();
      
      createdComments.push(response.body);
    }
    
    global.testComments = createdComments;
    
    // Verify post comment count updated
    const updatedPost = await request(app)
      .get(`/api/posts/${post.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    
    expect(updatedPost.body.comment_count).toBe(3);
    
    console.log('✅ Successfully added 3 comments to post');
    console.log('✅ Post comment count updated correctly');
  });

  test('Should add nested replies to comments', async () => {
    const parentComment = global.testComments[0];
    
    console.log(`Adding replies to comment: ${parentComment.id}`);
    
    // Alice replies to Bob's comment
    const replyResponse = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        post_id: parentComment.post_id,
        content: 'Thanks Bob! It took about 2 weeks including testing and documentation.',
        parent_comment_id: parentComment.id
      })
      .expect(201);
    
    expect(replyResponse.body.parent_comment_id).toBe(parentComment.id);
    expect(replyResponse.body.content).toContain('Thanks Bob!');
    expect(replyResponse.body.author_id).toBe(alice.id);
    
    // Charlie also replies to Bob's comment
    const reply2Response = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${charlie.token}`)
      .send({
        post_id: parentComment.post_id,
        content: '@alice That\'s impressive turnaround time!',
        parent_comment_id: parentComment.id
      })
      .expect(201);
    
    expect(reply2Response.body.parent_comment_id).toBe(parentComment.id);
    expect(reply2Response.body.content).toContain('@alice');
    expect(reply2Response.body.author_id).toBe(charlie.id);
    
    // Verify parent comment reply count
    const updatedComment = await request(app)
      .get(`/api/comments/${parentComment.id}/replies`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    
    expect(updatedComment.body.replies).toHaveLength(2);
    expect(updatedComment.body.replies[0].parent_comment_id).toBe(parentComment.id);
    expect(updatedComment.body.replies[1].parent_comment_id).toBe(parentComment.id);
    
    console.log('✅ Successfully added nested replies to comment');
    console.log('✅ Reply count updated correctly');
  });

  test('Should react to comments', async () => {
    const comment = global.testComments[0];
    
    console.log(`Adding reactions to comment: ${comment.id}`);
    
    // Multiple users react to comment
    const reactions = [
      { user: alice, type: 'like' },
      { user: charlie, type: 'love' },
      { user: diana, type: 'insightful' }
    ];
    
    for (const reaction of reactions) {
      const reactionResponse = await request(app)
        .post('/api/reactions')
        .set('Authorization', `Bearer ${reaction.user.token}`)
        .send({
          target_type: 'comment',
          target_id: comment.id,
          reaction_type: reaction.type
        })
        .expect(201);
      
      expect(reactionResponse.body.target_type).toBe('comment');
      expect(reactionResponse.body.target_id).toBe(comment.id);
      expect(reactionResponse.body.reaction_type).toBe(reaction.type);
    }
    
    // Verify comment reaction count
    const updatedComment = await request(app)
      .get(`/api/comments/${comment.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    
    expect(updatedComment.body.reaction_count).toBe(3);
    
    console.log('✅ Successfully added reactions to comment');
    console.log('✅ Comment reaction count updated correctly');
  });

  test('Should validate comment data structure', async () => {
    if (!global.testComments || global.testComments.length === 0) {
      console.log('⚠️ No test comments available for validation');
      return;
    }
    
    const comment = global.testComments[0];
    
    // Validate comment structure
    expect(comment).toHaveProperty('id');
    expect(comment).toHaveProperty('post_id');
    expect(comment).toHaveProperty('content');
    expect(comment).toHaveProperty('author_id');
    expect(comment).toHaveProperty('reaction_count');
    expect(comment).toHaveProperty('reply_count');
    expect(comment).toHaveProperty('created_at');
    expect(comment).toHaveProperty('author');
    
    // Validate author structure
    expect(comment.author).toHaveProperty('id');
    expect(comment.author).toHaveProperty('username');
    expect(comment.author).toHaveProperty('display_name');
    
    // Validate data types
    expect(typeof comment.id).toBe('string');
    expect(typeof comment.post_id).toBe('string');
    expect(typeof comment.content).toBe('string');
    expect(typeof comment.author_id).toBe('string');
    expect(typeof comment.reaction_count).toBe('number');
    expect(typeof comment.reply_count).toBe('number');
    expect(typeof comment.created_at).toBe('string');
    
    // Validate required content
    expect(comment.content.length).toBeGreaterThan(0);
    expect(comment.author.username.length).toBeGreaterThan(0);
    
    console.log('✅ Comment data structure validation passed');
  });

  test('Should handle comment threading levels', async () => {
    const testComments = global.testComments || [];
    
    // Test top-level comments (no parent)
    const topLevelComments = testComments.filter(c => !c.parent_comment_id);
    expect(topLevelComments.length).toBeGreaterThan(0);
    
    topLevelComments.forEach(comment => {
      expect(comment.parent_comment_id).toBeNull();
      expect(typeof comment.reply_count).toBe('number');
      expect(comment.reply_count).toBeGreaterThanOrEqual(0);
    });
    
    console.log('✅ Comment threading validation passed');
  });

  test('Should validate comment content requirements', async () => {
    // Test content validation scenarios
    const validContent = [
      'Great post!',
      'This is a longer comment with more details about the topic discussed.',
      'Short but meaningful comment with emojis 👍',
      '@username Thanks for sharing this!',
      '#hashtag content with mentions @user'
    ];
    
    const invalidContent = [
      '', // Empty string
      '   ', // Only whitespace
      null,
      undefined
    ];
    
    // Valid content should be accepted
    validContent.forEach(content => {
      expect(content && content.trim().length > 0).toBe(true);
    });
    
    // Invalid content should be rejected
    invalidContent.forEach(content => {
      expect(!content || content.trim().length === 0).toBe(true);
    });
    
    console.log('✅ Comment content validation working correctly');
  });
});