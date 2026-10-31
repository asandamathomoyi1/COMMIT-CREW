import { supabase } from './supabase';

/*
|--------------------------------------------------------------------------
| FAST CURRENT USER
|--------------------------------------------------------------------------
| supabase.auth.getUser() makes a network round-trip to the Supabase Auth
| server every time it is called. Almost every screen called it before
| loading anything else, which is a big part of why spinners lasted so long.
|
| supabase.auth.getSession() reads the session stored on the phone (and
| refreshes the token only when it has expired), so it returns almost
| instantly. Row Level Security on the database still checks the token on
| every request, so this is just as safe for loading a member's own data.
|
| The return shape is identical to supabase.auth.getUser():
|   { data: { user }, error }
|--------------------------------------------------------------------------
*/
export async function getUserFast() {
  const { data, error } = await supabase.auth.getSession();

  return {
    data: { user: data?.session?.user ?? null },
    error: error ?? null,
  };
}
