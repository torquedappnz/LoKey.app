export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  age: number;
  bio: string;
  attachmentStyle: string;
  values: string | string[];
  personalityType: string;
  lifestyle: string;
  interests: string[];
  imageUrl: string;
  school?: string;
  job?: string;
  mbti?: string;
  isVerified?: boolean;
  gender?: string;
  interestedIn?: string[];
  hobbies?: string[];
  relationshipGoal?: string;
  dob?: string;
  photos?: string[];
  onboardingComplete?: boolean;
  hasConfirmedNameAge?: boolean;
  matchingPower?: number;
  level?: number;
  streak?: number;
  currentQuestionIndex?: number;
  isPremium?: boolean;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
}

export interface Match extends UserProfile {
  compatibilityScore: number;
  reason: string;
  icebreaker?: string;
  order?: number;
}

export interface Event {
  id: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  description: string;
  price: number;
  creditValue: number;
  imageUrl: string;
  attendeesCount: number;
}

export interface Message {
  sender: 'me' | 'them';
  text: string;
  isRead: boolean;
  timestamp: number;
}

export type AppState = 
  | 'onboarding-name-age' 
  | 'onboarding-photo' 
  | 'onboarding' 
  | 'profile-review' 
  | 'id-verification' 
  | 'matches' 
  | 'events' 
  | 'profile' 
  | 'messages';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
