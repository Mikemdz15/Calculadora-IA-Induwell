import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjgflchpovtdtadtpexs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZ2ZsY2hwb3Z0ZHRhZHRwZXhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODcxNDkwMiwiZXhwIjoyMDk0MjkwOTAyfQ.7M_V3a-_WRD4EIn-2-aybpGh9PBTt_o6rGM5jKbgxHE';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const email = 'mmendez@induwell.com';
  
  // 1. Get user from Auth
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  let user = usersData.users.find(u => u.email === email);

  // 2. If user doesn't exist, create them
  if (!user) {
    console.log(`User ${email} not found. Creating...`);
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'Password123!',
      email_confirm: true,
    });
    
    if (createError) {
      console.error('Error creating user:', createError);
      return;
    }
    user = newUserData.user;
    console.log('User created successfully:', user.id);
  } else {
    console.log(`User ${email} found with ID:`, user.id);
  }

  // 3. Upsert profile
  console.log('Upserting director profile...');
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: user.id,
    role: 'director',
    full_name: 'Miguel Méndez'
  });

  if (profileError) {
    console.error('Error creating profile:', profileError);
  } else {
    console.log('✅ Success! The director profile was created.');
  }
}

run();
