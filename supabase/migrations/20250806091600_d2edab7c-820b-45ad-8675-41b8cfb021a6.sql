-- First, add title and company fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS company TEXT;

-- Update existing users with professional information
UPDATE public.users 
SET 
  title = CASE username
    WHEN 'alice_chen' THEN 'Senior UX Designer'
    WHEN 'bob_smith' THEN 'Full Stack Developer'
    WHEN 'charlie_dev' THEN 'DevOps Engineer'
    WHEN 'diana_manager' THEN 'Product Manager'
    WHEN 'vsr' THEN 'Software Architect'
    ELSE 'Professional'
  END,
  company = CASE username
    WHEN 'alice_chen' THEN 'Design Studio Pro'
    WHEN 'bob_smith' THEN 'TechCorp Solutions'
    WHEN 'charlie_dev' THEN 'CloudFirst Inc'
    WHEN 'diana_manager' THEN 'InnovateLab'
    WHEN 'vsr' THEN 'Enterprise Systems'
    ELSE 'Tech Company'
  END
WHERE username IN ('alice_chen', 'bob_smith', 'charlie_dev', 'diana_manager', 'vsr');

-- Create diverse posts from multiple users
INSERT INTO public.posts (user_id, content, post_type, created_at) VALUES
-- Alice Chen posts (UX Designer)
((SELECT id FROM users WHERE username = 'alice_chen'), 'Just finished wireframing a new mobile app interface. The user journey is looking much smoother! 🎨✨ #UXDesign #MobileFirst', 'text', NOW() - INTERVAL '2 hours'),
((SELECT id FROM users WHERE username = 'alice_chen'), 'Sharing some design insights from our latest user research session. Understanding user pain points is crucial for creating meaningful experiences.', 'text', NOW() - INTERVAL '1 day'),

-- Bob Smith posts (Full Stack Developer)  
((SELECT id FROM users WHERE username = 'bob_smith'), 'Finally deployed our new microservices architecture! Performance improvements are incredible. From 2s to 200ms response times 🚀 #DevLife #Performance', 'text', NOW() - INTERVAL '5 hours'),
((SELECT id FROM users WHERE username = 'bob_smith'), 'Working on a React + Node.js project and loving the TypeScript integration. Type safety makes such a difference in large codebases.', 'text', NOW() - INTERVAL '3 days'),

-- Charlie Dev posts (DevOps Engineer)
((SELECT id FROM users WHERE username = 'charlie_dev'), 'Kubernetes deployment went live today! Zero downtime migrations are a thing of beauty ⚙️ #DevOps #Kubernetes #CloudNative', 'text', NOW() - INTERVAL '1 hour'),
((SELECT id FROM users WHERE username = 'charlie_dev'), 'Infrastructure as Code saves the day again. Terraform templates make environment provisioning so much more reliable.', 'text', NOW() - INTERVAL '2 days'),

-- Diana Manager posts (Product Manager)
((SELECT id FROM users WHERE username = 'diana_manager'), 'Excited to announce our Q4 product roadmap! Three major features launching that will revolutionize how teams collaborate 📊 #ProductManagement #Roadmap', 'text', NOW() - INTERVAL '3 hours'),
((SELECT id FROM users WHERE username = 'diana_manager'), 'Great sprint retrospective today. The team identified key blockers and we have clear action items. Love seeing continuous improvement in action!', 'text', NOW() - INTERVAL '4 days'),

-- VSR posts (Software Architect)
((SELECT id FROM users WHERE username = 'vsr'), 'Design patterns discussion: When to use Observer vs Pub/Sub? Context matters more than dogma. Architecture decisions should serve the business goals 🏗️ #SoftwareArchitecture', 'text', NOW() - INTERVAL '4 hours'),
((SELECT id FROM users WHERE username = 'vsr'), 'Reviewing system scalability for our enterprise clients. Sometimes the simplest solution is the most elegant one.', 'text', NOW() - INTERVAL '5 days');

-- Update post metadata for better context
UPDATE public.posts 
SET updated_at = created_at 
WHERE content IN (
  'Just finished wireframing a new mobile app interface. The user journey is looking much smoother! 🎨✨ #UXDesign #MobileFirst',
  'Finally deployed our new microservices architecture! Performance improvements are incredible. From 2s to 200ms response times 🚀 #DevLife #Performance',
  'Kubernetes deployment went live today! Zero downtime migrations are a thing of beauty ⚙️ #DevOps #Kubernetes #CloudNative',
  'Excited to announce our Q4 product roadmap! Three major features launching that will revolutionize how teams collaborate 📊 #ProductManagement #Roadmap',
  'Design patterns discussion: When to use Observer vs Pub/Sub? Context matters more than dogma. Architecture decisions should serve the business goals 🏗️ #SoftwareArchitecture'
);