import React, { createContext, useContext, useEffect, useState, Component } from 'react';
import { supabase } from '../supabase';
import { UserProfile } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface SupabaseContextType {
  user: any | null;
  userProfile: Partial<UserProfile> | null;
  loading: boolean;
  isSigningIn: boolean;
  emailConfirmationPending: boolean;
  pendingEmail: string;
  signIn: (email: string, password: md5OrString) => Promise<{ error?: string }>;
  signUp: (email: string, password: md5OrString, name: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearEmailConfirmationPending: () => void;
}

type md5OrString = string;

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) throw new Error('useSupabase must be used within a SupabaseProvider');
  return context;
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // Helper helper to fetch/create state with localStorage fallback if table isn't created in Supabase yet
  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        console.warn("Could not load database profile, trying to initialize one. Error details:", error.message);
        
        // Let's check if the table exists or not. If fail, load from local storage fallback
        const localData = localStorage.getItem(`lokey_profile_${uid}`);
        if (localData) {
          const parsed = JSON.parse(localData);
          setUserProfile(parsed);
          return;
        }

        const freshProfile: Partial<UserProfile> = {
          id: uid,
          uid: uid,
          name: user?.email ? user.email.split('@')[0] : 'User',
          age: 18,
          onboardingComplete: false,
          hasConfirmedNameAge: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          matchingPower: 0,
          level: 1,
          streak: 0,
          currentQuestionIndex: 0,
          isPremium: false,
        };

        // Try adding it to supabase
        const { error: insertError } = await supabase.from('profiles').insert([{
          id: uid,
          name: freshProfile.name,
          age: freshProfile.age,
          onboarding_complete: false,
          has_confirmed_name_age: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        if (insertError) {
          console.warn("Insert in postgres profiles failed. Using browser local storage fallback:", insertError.message);
        }

        localStorage.setItem(`lokey_profile_${uid}`, JSON.stringify(freshProfile));
        setUserProfile(freshProfile);
      } else if (data) {
        // Map postgres snake_case to camelCase attributes
        const mappedProfile: Partial<UserProfile> = {
          id: data.id,
          uid: data.id,
          name: data.name || '',
          age: data.age || 18,
          gender: data.gender,
          interestedIn: data.interested_in,
          hobbies: data.hobbies,
          relationshipGoal: data.relationship_goal,
          attachmentStyle: data.attachment_style,
          personalityType: data.personality_type,
          lifestyle: data.lifestyle,
          interests: data.interests || [],
          school: data.school,
          job: data.job,
          mbti: data.mbti,
          dob: data.dob,
          photos: data.photos,
          isVerified: data.is_verified,
          onboardingComplete: data.onboarding_complete,
          hasConfirmedNameAge: data.has_confirmed_name_age,
          imageUrl: data.image_url,
          matchingPower: data.matching_power || 0,
          level: data.level || 1,
          streak: data.streak || 0,
          currentQuestionIndex: data.current_question_index || 0,
          isPremium: data.is_premium || false,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setUserProfile(mappedProfile);
        localStorage.setItem(`lokey_profile_${uid}`, JSON.stringify(mappedProfile));
      }
    } catch (e) {
      console.error("Critical Profile Fetch Error:", e);
      // fallback
      const localData = localStorage.getItem(`lokey_profile_${uid}`);
      if (localData) {
        setUserProfile(JSON.parse(localData));
      }
    }
  };

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: md5OrString) => {
    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        await fetchProfile(data.user.id);
      }
      return {};
    } catch (error: any) {
      console.error("Sign in failed:", error.message);
      return { error: error.message };
    } finally {
      setIsSigningIn(false);
    }
  };

  const signUp = async (email: string, password: md5OrString, name: string) => {
    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.hostname === 'localhost' ? 'http://localhost:5173' : window.location.origin,
        }
      });
      if (error) throw error;
      if (data.user) {
        // Force inserting profile immediately
        const freshProfile: Partial<UserProfile> = {
          id: data.user.id,
          uid: data.user.id,
          name: name || email.split('@')[0],
          age: 18,
          onboardingComplete: false,
          hasConfirmedNameAge: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          matchingPower: 0,
          level: 1,
          streak: 0,
          currentQuestionIndex: 0,
          isPremium: false,
        };

        // Try writing in Postgres profiles
        await supabase.from('profiles').insert([{
          id: data.user.id,
          name: freshProfile.name,
          age: freshProfile.age,
          onboarding_complete: false,
          has_confirmed_name_age: false,
        }]);

        localStorage.setItem(`lokey_profile_${data.user.id}`, JSON.stringify(freshProfile));

        // If email confirmation is required (no session returned), show pending screen
        if (!data.session) {
          setPendingEmail(email);
          setEmailConfirmationPending(true);
        } else {
          setUserProfile(freshProfile);
        }
      }
      return {};
    } catch (error: any) {
      console.error("Sign up failed:", error.message);
      return { error: error.message };
    } finally {
      setIsSigningIn(false);
    }
  };

  const clearEmailConfirmationPending = () => {
    setEmailConfirmationPending(false);
    setPendingEmail('');
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const uid = user.id;
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.interestedIn !== undefined) dbUpdates.interested_in = updates.interestedIn;
      if (updates.hobbies !== undefined) dbUpdates.hobbies = updates.hobbies;
      if (updates.relationshipGoal !== undefined) dbUpdates.relationship_goal = updates.relationshipGoal;
      if (updates.attachmentStyle !== undefined) dbUpdates.attachment_style = updates.attachmentStyle;
      if (updates.personalityType !== undefined) dbUpdates.personality_type = updates.personalityType;
      if (updates.lifestyle !== undefined) dbUpdates.lifestyle = updates.lifestyle;
      if (updates.interests !== undefined) dbUpdates.interests = updates.interests;
      if (updates.school !== undefined) dbUpdates.school = updates.school;
      if (updates.job !== undefined) dbUpdates.job = updates.job;
      if (updates.mbti !== undefined) dbUpdates.mbti = updates.mbti;
      if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
      if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
      if (updates.isVerified !== undefined) dbUpdates.is_verified = updates.isVerified;
      if (updates.onboardingComplete !== undefined) dbUpdates.onboarding_complete = updates.onboardingComplete;
      if (updates.hasConfirmedNameAge !== undefined) dbUpdates.has_confirmed_name_age = updates.hasConfirmedNameAge;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.matchingPower !== undefined) dbUpdates.matching_power = updates.matchingPower;
      if (updates.level !== undefined) dbUpdates.level = updates.level;
      if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
      if (updates.currentQuestionIndex !== undefined) dbUpdates.current_question_index = updates.currentQuestionIndex;
      if (updates.isPremium !== undefined) dbUpdates.is_premium = updates.isPremium;

      // Local storage merge first so UI reflects instantly without latency!
      const mergedLocal = { ...userProfile, ...updates, id: uid, uid, updatedAt: new Date().toISOString() };
      setUserProfile(mergedLocal);
      localStorage.setItem(`lokey_profile_${uid}`, JSON.stringify(mergedLocal));

      // Attempt Supabase request
      await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', uid);

    } catch (e) {
      console.warn("Supabase profile update warning (updating locally):", e);
    }
  };

  return (
    <SupabaseContext.Provider value={{ user, userProfile, loading, isSigningIn, emailConfirmationPending, pendingEmail, signIn, signUp, logout, updateProfile, clearEmailConfirmationPending }}>
      {children}
    </SupabaseContext.Provider>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
            <p className="text-zinc-600 mb-6">{this.state.error?.message || "Something went wrong."}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
