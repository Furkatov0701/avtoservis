// Never derive an application role from a URL or editable user_metadata.
export async function loadIdentity(client, session) {
  if (!session?.access_token) return { status: 'signedOut', user: null, profile: null, error: '' };
  const { data, error } = await client.auth.getUser(session.access_token);
  if (error) throw error;
  const user = data?.user;
  if (!user?.id || !user.phone_confirmed_at) return { status: 'unverified', user, profile: null, error: 'Telefon raqamingiz tasdiqlanmagan.' };
  const { data: profile, error: profileError } = await client.from('profiles').select('id,first_name,last_name,role,created_at,updated_at').eq('id', user.id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile || profile.id !== user.id || !['user', 'admin'].includes(profile.role)) throw new Error('Profile unavailable');
  return { status: 'ready', user, profile, error: '' };
}
export function canAccess(identity, role) {
  return identity?.status === 'ready' && identity.profile?.id === identity.user?.id && identity.profile?.role === role;
}
