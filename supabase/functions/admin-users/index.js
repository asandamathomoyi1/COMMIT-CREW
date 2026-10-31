// Supabase Edge Function: admin-users   (plain JavaScript, runs on Deno)
//
// Server-side admin actions that need the SERVICE ROLE key (which must never ship inside the app):
//   { action: 'delete_user', userId }   permanently removes an account and its data
//
// Suspending / restoring users and changing roles do NOT need this function: they are done by the
// admin_* SQL functions from supabase/admin_setup.sql.
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Deploy:  supabase functions deploy admin-users

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return json({ error: 'Missing authorization.' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL');

    // Client acting as the caller: used ONLY to prove the caller is an admin.
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Your session has expired.' }, 401);
    }

    const { data: isAdmin, error: adminError } = await caller.rpc('is_admin');

    if (adminError || isAdmin !== true) {
      return json({ error: 'Admin access required.' }, 403);
    }

    const body = await req.json().catch(() => ({}));

    if (body.action !== 'delete_user') {
      return json({ error: 'Unknown action.' }, 400);
    }

    const userId = String(body.userId ?? '');

    if (!UUID_RE.test(userId)) {
      return json({ error: 'A valid userId is required.' }, 400);
    }

    if (userId === user.id) {
      return json({ error: 'You cannot delete your own account here.' }, 400);
    }

    // Service-role client: full access, so everything above must stay strict.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: target } = await admin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (target?.role === 'admin') {
      return json({ error: 'Demote this admin to a normal user before deleting them.' }, 400);
    }

    // Remove the user's data first so accounts delete cleanly even without ON DELETE CASCADE.
    const { data: ownPosts } = await admin.from('community_posts').select('id').eq('user_id', userId);
    const postIds = (ownPosts ?? []).map((p) => p.id);

    if (postIds.length > 0) {
      await admin.from('community_likes').delete().in('post_id', postIds);
      await admin.from('community_comments').delete().in('post_id', postIds);
      await admin.from('community_reports').delete().in('post_id', postIds);
    }

    const byUser = [
      'dose_logs',
      'medication_schedules',
      'medications',
      'notification_preferences',
      'emergency_contacts',
      'community_likes',
      'community_comments',
      'community_reports',
      'community_posts',
    ];

    for (const table of byUser) {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      if (error) console.log(`cleanup ${table}:`, error.message);
    }

    await admin.from('caregiver_relationships').delete().eq('owner_user_id', userId);
    await admin.from('caregiver_relationships').delete().eq('caregiver_user_id', userId);
    await admin.from('profiles').delete().eq('id', userId);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('deleteUser error:', deleteError);
      return json({ error: `Could not delete the account: ${deleteError.message}` }, 500);
    }

    await admin.from('app_logs').insert({
      category: 'admin',
      event: 'user_deleted',
      actor_id: user.id,
      actor_label: user.email ?? user.id,
      target_type: 'user',
      target_id: userId,
      message: `Deleted account ${target?.email ?? target?.full_name ?? userId}`,
      details: {},
    });

    return json({ ok: true });
  } catch (error) {
    console.error('admin-users error:', error);
    return json({ error: 'Something went wrong.' }, 500);
  }
});
