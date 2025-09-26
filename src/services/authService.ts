import { supabase, Profile } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

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

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
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

  static onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  }
}
