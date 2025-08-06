import { supabase } from '@/integrations/supabase/client';

const testUsers = [
  {
    email: 'alice@test.com',
    password: 'AlicePass123!',
    username: 'alice_chen',
    full_name: 'Alice Chen',
    role: 'user'
  },
  {
    email: 'bob@test.com', 
    password: 'BobPass123!',
    username: 'bob_smith',
    full_name: 'Bob Smith',
    role: 'user'
  },
  {
    email: 'charlie@test.com',
    password: 'CharliePass123!',
    username: 'charlie_dev',
    full_name: 'Charlie Developer',
    role: 'creator'
  },
  {
    email: 'diana@test.com',
    password: 'DianaPass123!',
    username: 'diana_manager',
    full_name: 'Diana Manager',
    role: 'business'
  }
];

export const createTestUsers = async () => {
  console.log('Creating test users...');
  
  for (const user of testUsers) {
    try {
      // Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            username: user.username,
            full_name: user.full_name,
            role: user.role
          }
        }
      });

      if (signUpError) {
        console.error(`Error creating user ${user.email}:`, signUpError);
        continue;
      }

      console.log(`Created user: ${user.email}`);
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Failed to create user ${user.email}:`, error);
    }
  }
  
  console.log('Finished creating test users');
};

// For easy access in console
(window as any).createTestUsers = createTestUsers;