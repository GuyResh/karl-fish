import { supabase, Profile } from '../lib/supabase';
import { User, AuthError } from '@supabase/supabase-js';

export class AuthService {
  static async signUp(email: string, password: string, username: string, initials: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          initials: initials.toUpperCase()
        }
      }
    });

    if (error) throw error;

    // Create user profile
    if (data.user) {
      await this.createProfile(data.user.id, username, initials);
    }

    return data;
  }

  static async signIn(username: string, password: string) {
    // Get the user's email by username using a database function
    const { data: emailData, error: emailError } = await supabase
      .rpc('get_user_email_by_username', { username_param: username });

    if (emailError || !emailData) {
      throw new Error('Invalid username or password');
    }

    // Now sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailData,
      password
    });

    if (error) throw error;
    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  static async getCurrentProfile(): Promise<Profile | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  }

  static async createProfile(userId: string, username: string, initials: string) {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username,
        initials: initials.toUpperCase(),
        display_name: username
      });

    if (error) throw error;
  }

  static async updateProfile(updates: Partial<Profile>) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
  }

  static async searchUsers(query: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%, display_name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  static async getAllUsers(): Promise<Profile[]> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUser.id) // Exclude current user
      .order('username');

    if (error) throw error;
    return data || [];
  }

  static onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  }

  static async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }
}
