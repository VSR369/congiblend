import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = 'https://cmtehutbazgfjoksmkly.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdGVodXRiYXpnZmpva3Nta2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDc3MzcsImV4cCI6MjA2NzIyMzczN30.N_pjYJGlpV8cIENLeRcVyYiHGxiR_WCv669MKOxXJRA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to make API calls to edge functions
const apiCall = async (endpoint, method = 'GET', data = null, token = null) => {
  const url = `${supabaseUrl}/functions/v1/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
  };
};

describe('Multi-User Registration Tests', () => {
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

  // Clean up before tests
  beforeAll(async () => {
    console.log('Setting up multi-user registration tests...');
    
    // Clean up any existing test users
    for (const userData of testUsers) {
      try {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('email', userData.email)
          .single();
        
        if (data) {
          // Delete from user tables first
          await supabase.from('user_skill_profiles').delete().eq('user_id', data.id);
          await supabase.from('user_roles').delete().eq('user_id', data.id);
          await supabase.from('users').delete().eq('id', data.id);
        }
      } catch (error) {
        // Ignore cleanup errors
        console.log(`Cleanup for ${userData.email}: ${error.message}`);
      }
    }
  });

  // Clean up after tests
  afterAll(async () => {
    console.log('Cleaning up after multi-user registration tests...');
    
    if (global.testUsers) {
      for (const user of global.testUsers) {
        try {
          await supabase.from('user_skill_profiles').delete().eq('user_id', user.id);
          await supabase.from('user_roles').delete().eq('user_id', user.id);
          await supabase.from('users').delete().eq('id', user.id);
        } catch (error) {
          console.log(`Final cleanup for ${user.email}: ${error.message}`);
        }
      }
    }
  });

  test('Should register multiple users successfully', async () => {
    const registeredUsers = [];
    
    for (const userData of testUsers) {
      const response = await apiCall('auth/register', 'POST', userData);
      
      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeTruthy();
      
      // Verify in database
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .single();
      
      expect(error).toBeNull();
      expect(dbUser).toBeTruthy();
      expect(dbUser.username).toBe(userData.username);
      
      registeredUsers.push({
        ...userData,
        id: response.body.user.id,
        token: response.body.token
      });
    }
    
    // Store for other tests
    global.testUsers = registeredUsers;
    expect(registeredUsers).toHaveLength(4);
  }, 30000);

  test('Should login all registered users', async () => {
    expect(global.testUsers).toBeDefined();
    expect(global.testUsers.length).toBe(4);

    for (const user of global.testUsers) {
      const response = await apiCall('auth/login', 'POST', {
        email: user.email,
        password: user.password
      });
      
      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user.id).toBe(user.id);
      
      // Update the token for profile tests
      user.token = response.body.token;
    }
  }, 20000);

  test('Should create complete profiles for all users', async () => {
    expect(global.testUsers).toBeDefined();
    expect(global.testUsers.length).toBe(4);

    const profileData = [
      {
        userId: global.testUsers[0].id,
        bio: 'Software Engineer passionate about AI and Machine Learning',
        location: 'San Francisco, CA',
        skills: ['JavaScript', 'Python', 'React', 'Node.js'],
        headline: 'Senior Software Engineer at TechCorp'
      },
      {
        userId: global.testUsers[1].id, 
        bio: 'Product Manager with 5 years experience in SaaS',
        location: 'New York, NY',
        skills: ['Product Management', 'Agile', 'Data Analysis'],
        headline: 'Product Manager at StartupXYZ'
      },
      {
        userId: global.testUsers[2].id,
        bio: 'Full-stack developer and content creator',
        location: 'Austin, TX', 
        skills: ['React', 'Vue.js', 'DevOps', 'Content Creation'],
        headline: 'Freelance Developer & YouTuber'
      },
      {
        userId: global.testUsers[3].id,
        bio: 'Business development and strategy consultant',
        location: 'Chicago, IL',
        skills: ['Business Strategy', 'Sales', 'Marketing', 'Leadership'],
        headline: 'Business Development Manager'
      }
    ];

    for (let i = 0; i < profileData.length; i++) {
      const profile = profileData[i];
      const user = global.testUsers[i];
      
      const response = await apiCall(
        `profiles/${user.id}`, 
        'PUT',
        {
          bio: profile.bio,
          location: profile.location,
          headline: profile.headline,
          skills: profile.skills
        },
        user.token
      );
      
      expect(response.status).toBe(200);
      expect(response.body.bio).toBe(profile.bio);
      expect(response.body.skills).toEqual(expect.arrayContaining(profile.skills));
    }
  }, 30000);

  test('Should retrieve user profiles with all data', async () => {
    expect(global.testUsers).toBeDefined();
    expect(global.testUsers.length).toBe(4);

    for (const user of global.testUsers) {
      const response = await apiCall(`profiles/${user.id}`, 'GET', null, user.token);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
      expect(response.body.email).toBe(user.email);
      expect(response.body.username).toBe(user.username);
      expect(response.body.bio).toBeTruthy();
      expect(response.body.location).toBeTruthy();
      expect(response.body.headline).toBeTruthy();
      expect(Array.isArray(response.body.skills)).toBe(true);
      expect(response.body.skills.length).toBeGreaterThan(0);
    }
  }, 20000);

  test('Should verify user roles are assigned correctly', async () => {
    expect(global.testUsers).toBeDefined();
    expect(global.testUsers.length).toBe(4);

    const expectedRoles = ['user', 'user', 'creator', 'business'];

    for (let i = 0; i < global.testUsers.length; i++) {
      const user = global.testUsers[i];
      const expectedRole = expectedRoles[i];
      
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      expect(error).toBeNull();
      expect(roleData.role).toBe(expectedRole);
    }
  }, 15000);
});