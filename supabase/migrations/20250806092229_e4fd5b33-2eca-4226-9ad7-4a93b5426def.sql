-- Remove hardcoded sample data and make system fully dynamic
DELETE FROM public.posts WHERE content LIKE '%Just finished wireframing%' 
   OR content LIKE '%Finally deployed our new microservices%'
   OR content LIKE '%Kubernetes deployment went live%'
   OR content LIKE '%Excited to announce our Q4%'
   OR content LIKE '%Design patterns discussion%'
   OR content LIKE '%Sharing some design insights%'
   OR content LIKE '%Working on a React + Node.js%'
   OR content LIKE '%Infrastructure as Code%'
   OR content LIKE '%Great sprint retrospective%'
   OR content LIKE '%Reviewing system scalability%';

-- Reset users to clean state without hardcoded titles/companies
UPDATE public.users 
SET title = NULL, company = NULL 
WHERE username IN ('alice_chen', 'bob_smith', 'charlie_dev', 'diana_manager', 'vsr');