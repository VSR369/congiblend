describe('Sharing System', () => {
  test('Should share posts', async () => {
    const originalPost = global.textPosts[0];
    
    // Bob shares Alice's post
    const shareResponse = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({
        target_type: 'post',
        target_id: originalPost.id,
        share_type: 'share'
      })
      .expect(201);
    
    expect(shareResponse.body.target_id).toBe(originalPost.id);
    expect(shareResponse.body.share_type).toBe('share');
    
    // Verify share appears in Bob's feed
    const bobFeed = await request(app)
      .get('/api/posts/feed')
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(200);
    
    const sharedPost = bobFeed.body.posts.find(p => p.shared_post_id === originalPost.id);
    expect(sharedPost).toBeTruthy();
  });

  test('Should create quote repost', async () => {
    const originalPost = global.videoPosts[0];
    
    const quoteResponse = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${diana.token}`)
      .send({
        target_type: 'post',
        target_id: originalPost.id,
        share_type: 'quote_repost',
        quote_content: 'Excellent tutorial! This is exactly what our team needed for the upcoming project. @charlie you\'ve outdone yourself! 🎯'
      })
      .expect(201);
    
    expect(quoteResponse.body.quote_content).toBeTruthy();
    expect(quoteResponse.body.share_type).toBe('quote_repost');
    
    // Verify quote repost appears as new post
    const dianaFeed = await request(app)
      .get('/api/posts/feed')
      .set('Authorization', `Bearer ${diana.token}`)
      .expect(200);
    
    const quotePost = dianaFeed.body.posts.find(p => p.quote_content && p.shared_post_id === originalPost.id);
    expect(quotePost).toBeTruthy();
  });

  test('Should track share counts', async () => {
    const post = global.imagePosts[0];
    
    // Multiple users share the same post
    const sharers = [bob, charlie, diana];
    
    for (const user of sharers) {
      await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          target_type: 'post',
          target_id: post.id,
          share_type: 'share'
        })
        .expect(201);
    }
    
    // Verify share count
    const updatedPost = await request(app)
      .get(`/api/posts/${post.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    
    expect(updatedPost.body.share_count).toBe(3);
  });
});