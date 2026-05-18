import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjgflchpovtdtadtpexs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZ2ZsY2hwb3Z0ZHRhZHRwZXhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODcxNDkwMiwiZXhwIjoyMDk0MjkwOTAyfQ.7M_V3a-_WRD4EIn-2-aybpGh9PBTt_o6rGM5jKbgxHE';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const usersToCreate = [
  { email: 'hsoto@grupoalphalab.com', name: 'Adan Soto', role: 'supervisor_planeador' },
  { email: 'mrojas@grupoalphalab.com', name: 'Clara Rojas', role: 'comprador' },
  { email: 'jreyes@grupoalphalab.com', name: 'Jovany Reyes', role: 'comprador' },
  { email: 'jcastro@grupoalphalab.com', name: 'Jose Castro', role: 'comprador' }
];

const TEMP_PASSWORD = 'Temporal123!';

async function run() {
  for (const u of usersToCreate) {
    console.log(`\nProcessing ${u.email}...`);
    
    // 1. Create user in Auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: TEMP_PASSWORD,
      email_confirm: true,
    });
    
    if (createError) {
      if (createError.message.includes('already exists')) {
        console.log(`User ${u.email} already exists. Retrieving ID...`);
      } else {
        console.error(`Error creating user ${u.email}:`, createError);
        continue;
      }
    }

    let userId = userData?.user?.id;

    // If user already existed, fetch their ID
    if (!userId) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(usr => usr.email === u.email);
        if (existing) {
            userId = existing.id;
        }
    }

    if (!userId) {
        console.error(`Could not determine ID for ${u.email}`);
        continue;
    }

    console.log(`User ID for ${u.email}: ${userId}`);

    // 2. Create Profile
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      role: u.role,
      full_name: u.name
    });

    if (profileError) {
      console.error(`Error creating profile for ${u.email}:`, profileError);
    } else {
      console.log(`✅ Profile created for ${u.name} as ${u.role}`);
    }
  }
}

run();
