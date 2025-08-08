-- Clean up unused database tables for better performance and maintainability

-- Drop the comments table since comments functionality is not implemented
DROP TABLE IF EXISTS public.comments CASCADE;

-- Drop conversation-related tables that appear unused
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

-- Drop experience table that appears unused
DROP TABLE IF EXISTS public.experiences CASCADE;

-- Drop member status alerts that appear unused  
DROP TABLE IF EXISTS public.member_status_change_alerts CASCADE;

-- Drop notification table that appears unused
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Drop unused shares table
DROP TABLE IF EXISTS public.shares CASCADE;

-- Drop unused event RSVP table
DROP TABLE IF EXISTS public.event_rsvps CASCADE;

-- Drop unused post interactions table
DROP TABLE IF EXISTS public.post_interactions CASCADE;

-- Drop unused roles table
DROP TABLE IF EXISTS public.roles CASCADE;

-- Drop unused seeking organization roles table
DROP TABLE IF EXISTS public.seeking_organization_roles CASCADE;

-- Drop unused skill profiles table
DROP TABLE IF EXISTS public.user_skill_profiles CASCADE;

-- Drop the view instead of table
DROP VIEW IF EXISTS public.organization_context CASCADE;

-- Drop unused organization documents table
DROP TABLE IF EXISTS public.organization_documents CASCADE;

-- Drop most of the complex master pricing tables that aren't being used
DROP TABLE IF EXISTS public.master_advance_payment_types CASCADE;
DROP TABLE IF EXISTS public.master_billing_frequencies CASCADE;
DROP TABLE IF EXISTS public.master_communication_types CASCADE;
DROP TABLE IF EXISTS public.master_domain_groups CASCADE;
DROP TABLE IF EXISTS public.master_fee_components CASCADE;
DROP TABLE IF EXISTS public.master_membership_statuses CASCADE;
DROP TABLE IF EXISTS public.master_onboarding_types CASCADE;
DROP TABLE IF EXISTS public.master_pricing_parameters CASCADE;
DROP TABLE IF EXISTS public.master_reward_types CASCADE;
DROP TABLE IF EXISTS public.master_seeker_membership_fees CASCADE;
DROP TABLE IF EXISTS public.master_sub_categories CASCADE;
DROP TABLE IF EXISTS public.master_system_configurations CASCADE;
DROP TABLE IF EXISTS public.master_workflow_templates CASCADE;
DROP TABLE IF EXISTS public.pricing_parameters_management_consulting CASCADE;

-- Drop views that are no longer needed
DROP VIEW IF EXISTS public.solution_seekers_comprehensive_view CASCADE;