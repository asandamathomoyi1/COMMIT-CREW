import { supabase } from './supabase';

/*
|--------------------------------------------------------------------------
| ADMIN SERVICE
|--------------------------------------------------------------------------
| Thin wrappers around the admin_* SQL functions created by
| supabase/admin_setup.sql. Every function re-checks on the server that the
| caller is an admin, so hiding the screens in the app is only for convenience;
| a normal user cannot call these successfully.
|--------------------------------------------------------------------------
*/

async function call(name, args) {
  const { data, error } = await supabase.rpc(name, args);

  if (error) {
    throw error;
  }

  return data;
}

export function friendlyAdminError(error) {
  const message = error?.message ?? '';

  if (
    error?.code === 'PGRST202' ||
    /could not find the function|schema cache|does not exist/i.test(message)
  ) {
    return 'The admin tools are not installed in your database yet. Run supabase/admin_setup.sql in the Supabase SQL Editor, then try again.';
  }

  if (error?.code === '42501' || /admin access required/i.test(message)) {
    return 'Your account does not have admin access.';
  }

  return message || 'Something went wrong. Please try again.';
}

export const getAdminStats = () => call('admin_get_stats');

export const listUsers = ({ search = '', limit = 50, offset = 0 } = {}) =>
  call('admin_list_users', { p_search: search || null, p_limit: limit, p_offset: offset });

export const setUserSuspended = (userId, suspended, reason = null) =>
  call('admin_set_user_suspended', {
    p_user_id: userId,
    p_suspended: suspended,
    p_reason: reason,
  });

export const setUserRole = (userId, role) =>
  call('admin_set_user_role', { p_user_id: userId, p_role: role });

export async function deleteUserAccount(userId) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete_user', userId },
  });

  if (error) {
    // Surface the function's own message when there is one.
    let message = error.message;

    try {
      const body = await error.context?.json?.();
      if (body?.error) {
        message = body.error;
      }
    } catch (parseError) {
      // keep generic message
    }

    throw new Error(
      /not found|failed to send|relay/i.test(message ?? '')
        ? 'The admin-users function is not deployed yet. Run: supabase functions deploy admin-users'
        : message
    );
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export const listReports = (status = 'open') => call('admin_list_reports', { p_status: status });

export const resolveReport = (reportId, action, note = null) =>
  call('admin_resolve_report', { p_report_id: reportId, p_action: action, p_note: note });

export const listPosts = ({ search = '', limit = 50, offset = 0 } = {}) =>
  call('admin_list_posts', { p_search: search || null, p_limit: limit, p_offset: offset });

export const listComments = (postId) => call('admin_list_comments', { p_post_id: postId });

export const deletePost = (postId, reason = null) =>
  call('admin_delete_post', { p_post_id: postId, p_reason: reason });

export const deleteComment = (commentId, reason = null) =>
  call('admin_delete_comment', { p_comment_id: commentId, p_reason: reason });

export const listLogs = ({ category = 'all', limit = 100, before = null } = {}) =>
  call('admin_list_logs', { p_category: category, p_limit: limit, p_before: before });

export function timeAgo(value) {
  if (!value) {
    return '—';
  }

  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)} d ago`;

  return new Date(value).toLocaleDateString();
}
