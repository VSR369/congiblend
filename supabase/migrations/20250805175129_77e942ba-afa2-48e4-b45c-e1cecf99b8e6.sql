-- Database cleanup migration
-- Remove test users (be careful in production!)
DELETE FROM users WHERE username LIKE '%test%' OR display_name LIKE '%test%' OR bio LIKE '%test%';

-- Remove orphaned records from comments table
-- (Note: Posts table may not exist yet, so we'll handle comments cleanup differently)
DELETE FROM comments WHERE post_id IS NULL;

-- Remove orphaned reactions 
DELETE FROM reactions WHERE 
  (target_type = 'comment' AND target_id NOT IN (SELECT id FROM comments));

-- Remove duplicate reactions (keep newest)
DELETE FROM reactions r1 USING reactions r2 
WHERE r1.id < r2.id 
AND r1.user_id = r2.user_id 
AND r1.target_type = r2.target_type 
AND r1.target_id = r2.target_id;

-- Update comment counts to be accurate
UPDATE comments SET replies_count = (
  SELECT COUNT(*) FROM comments c2 WHERE c2.parent_id = comments.id
) WHERE parent_id IS NULL;

-- Reset reaction counts to be accurate
UPDATE comments SET reactions_count = (
  SELECT COUNT(*) FROM reactions WHERE target_type = 'comment' AND target_id = comments.id
);