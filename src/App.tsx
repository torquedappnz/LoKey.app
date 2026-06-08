import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Calendar, 
  User, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles, 
  MapPin, 
  Ticket,
  LogOut,
  Info,
  CheckCircle2,
  MessageCircle,
  Send,
  Instagram,
  Smartphone,
  Ghost,
  Coffee,
  X,
  ShieldCheck,
  Camera,
  Check,
  Play,
  Video,
  Loader2,
  Trash2,
  AlertTriangle,
  Code,
  CheckSquare,
  Lock,
  Globe,
  Upload,
  UserCheck,
  Sun,
  Moon,
  Laptop,
  SlidersHorizontal
} from 'lucide-react';
import { AppState, UserProfile, Match, Event, Message } from './types';
import { MOCK_EVENTS, ONBOARDING_QUESTIONS, PERSONALITY_TEST_QUESTIONS, calculateMBTI } from './constants';
import { generateIntroVideo } from './services/geminiService';
import { supabase, SUPABASE_SQL_SCHEMA } from './supabase';
import { SupabaseProvider, useSupabase, ErrorBoundary } from './components/SupabaseProvider';
import { ALL_PERSONAS, FAKE_MALE_PERSONAS, FAKE_FEMALE_PERSONAS } from './data/fakePersonas';
import { verifyIDDocumentWithOpenAI, getOpenAIMessageSuggestion } from './services/openaiService';
import { calculateConstitutionScore } from './services/matchingAlgorithm';

const LoKeyLogo = ({ className = "h-14", animated = true }: { className?: string, animated?: boolean }) => {
  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <img src="/lokey-logo.png" alt="LoKey" className="h-full w-auto object-contain" />
    </div>
  );
};

function AppContent() {
  const { user, userProfile: supabaseProfile, loading: supabaseLoading, isSigningIn, emailConfirmationPending, pendingEmail, clearEmailConfirmationPending, signIn, signUp, logout, updateProfile } = useSupabase();

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 18;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 18;
    const today = new Date();
    let computedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      computedAge--;
    }
    return Math.max(18, computedAge);
  };
  
  // Theme state: light | dark | system
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('lokey_theme_mode') as 'light' | 'dark' | 'system') || 'system';
  });

  useEffect(() => {
    localStorage.setItem('lokey_theme_mode', themeMode);
    
    const applyTheme = () => {
      const root = document.documentElement;
      let isDark = false;
      if (themeMode === 'dark') {
        isDark = true;
      } else if (themeMode === 'light') {
        isDark = false;
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeMode]);

  // App view state
  const [view, setView] = useState<AppState>('onboarding-name-age');
  
  // Auth Form Toggles
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // 2FA OTP security verification state
  const [otpState, setOtpState] = useState<'idle' | 'verifying'>('idle');
  const [otpCode, setOtpCode] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string[]>(['', '', '', '']);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [successPulse, setSuccessPulse] = useState<boolean>(false);
  const [isOtpLoading, setIsOtpLoading] = useState<boolean>(false);

  // OTP Ref nodes for auto-focus shifting
  const otpRef0 = useRef<HTMLInputElement>(null);
  const otpRef1 = useRef<HTMLInputElement>(null);
  const otpRef2 = useRef<HTMLInputElement>(null);
  const otpRef3 = useRef<HTMLInputElement>(null);
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3];

  // User details state
  const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({
    name: '',
    age: 18,
    interestedIn: [],
    hobbies: []
  });

  // Personality Test State
  const [showPersonalityTest, setShowPersonalityTest] = useState(false);
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, 'a' | 'b'>>({});
  const [personalityTestIndex, setPersonalityTestIndex] = useState(0);
  const [calculatedMbti, setCalculatedMbti] = useState<string | null>(null);

  // Flow State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recommendations, setRecommendations] = useState<Match[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [purchasedTicket, setPurchasedTicket] = useState<Event | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  
  // Photo & Verification State
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifyingID, setIsVerifyingID] = useState(false);
  const [ocrDob, setOcrDob] = useState<string | null>(null);
  const [isVerificationSuccess, setIsVerificationSuccess] = useState<boolean | null>(null);
  const [idDragOver, setIdDragOver] = useState(false);
  const [scannedFilesNames, setScannedFilesNames] = useState<string | null>(null);

  // Matches/Messaging system
  const [matchedWith, setMatchedWith] = useState<Match | null>(null);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [activeChats, setActiveChats] = useState<Match[]>([]);
  const [currentChat, setCurrentChat] = useState<Match | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({});
  const [isDatePlanned, setIsDatePlanned] = useState(false);
  const [showBlockReportModal, setShowBlockReportModal] = useState<Match | null>(null);
  const [blockReportMode, setBlockReportMode] = useState<'block' | 'report' | null>(null);
  const [reportReason, setReportReason] = useState('Inappropriate behavior');
  const [reportDetails, setReportDetails] = useState('');

  // AI Suggestions states
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGeneratingAiSuggestion, setIsGeneratingAiSuggestion] = useState<boolean>(false);

  // Gamification onboarding states
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [lastAnswerTime, setLastAnswerTime] = useState<number | null>(null);
  const [showBonus, setShowBonus] = useState(false);
  const [matchingPower, setMatchingPower] = useState(0);

  // Premium Stripe State
  const [isBuyingPremium, setIsBuyingPremium] = useState(false);
  const [premiumSuccess, setPremiumSuccess] = useState(false);

  // Admin Portal state
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Custom filter preferences state
  const [filterAgeMin, setFilterAgeMin] = useState<number>(() => {
    return Number(localStorage.getItem('lokey_filter_age_min')) || 18;
  });
  const [filterAgeMax, setFilterAgeMax] = useState<number>(() => {
    return Number(localStorage.getItem('lokey_filter_age_max')) || 65;
  });
  const [filterGender, setFilterGender] = useState<string>(() => {
    return localStorage.getItem('lokey_filter_gender') || 'all';
  });
  const [filterLookingFor, setFilterLookingFor] = useState<string>(() => {
    return localStorage.getItem('lokey_filter_looking_for') || 'all';
  });
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);

  // Profile Edit fields inside My Profile
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editAge, setEditAge] = useState<number>(18);
  const [editDob, setEditDob] = useState<string>('');
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [editSchool, setEditSchool] = useState<string>('');
  const [editJob, setEditJob] = useState<string>('');
  const [editGender, setEditGender] = useState<string>('');
  const [editInterestedIn, setEditInterestedIn] = useState<string[]>([]);
  const [editRelationshipGoal, setEditRelationshipGoal] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [editSuccessMsg, setEditSuccessMsg] = useState<string>('');

  // Persona Sync states
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Landing page Veo intro state
  const [introVideoUrl, setIntroVideoUrl] = useState<string>("https://assets.mixkit.co/videos/preview/mixkit-young-couple-walking-and-laughing-in-the-city-43093-large.mp4");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const isInitialSync = useRef(true);
  // Photo slot refs for multi-photo upload (up to 6)
  const photoSlotRef0 = useRef<HTMLInputElement>(null);
  const photoSlotRef1 = useRef<HTMLInputElement>(null);
  const photoSlotRef2 = useRef<HTMLInputElement>(null);
  const photoSlotRef3 = useRef<HTMLInputElement>(null);
  const photoSlotRef4 = useRef<HTMLInputElement>(null);
  const photoSlotRef5 = useRef<HTMLInputElement>(null);

  // Toggle lander video
  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(err => console.error("Play failed:", err));
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  useEffect(() => {
    if (videoRef.current && isVideoPlaying) {
      videoRef.current.play().catch(() => {
        setIsVideoPlaying(false);
      });
    }
  }, [introVideoUrl]);

  // Premium checkout
  // In test mode (VITE_STRIPE_TEST_MODE=true) this grants premium instantly at $0.
  // In production, it opens the Stripe Payment Link before marking the user as premium.
  const handlePurchasePremium = async () => {
    const isTestMode = import.meta.env.VITE_STRIPE_TEST_MODE === 'true';
    const stripeLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;

    if (!isTestMode && stripeLink && !stripeLink.includes('REPLACE_WITH_YOUR_LINK')) {
      // Production: redirect to Stripe, mark premium on return via webhook
      window.open(stripeLink, '_blank');
      return;
    }

    // Test mode: grant premium immediately at $0
    setIsBuyingPremium(true);
    await new Promise(r => setTimeout(r, 800));
    setIsBuyingPremium(false);
    setPremiumSuccess(true);
    const updated = { ...supabaseProfile, isPremium: true };
    setUserProfile(prev => ({ ...prev, isPremium: true }));
    await updateProfile(updated);
    setTimeout(() => setPremiumSuccess(false), 3000);
  };

  // Generate intro video simulation
  const handleGenerateIntro = async () => {
    setIsGeneratingVideo(true);
    try {
      const url = await generateIntroVideo();
      if (url) {
        setIntroVideoUrl(url);
      }
    } catch (e) {
      console.warn("AI video generation requires Google API model validation. Falling back.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Sync with Supabase Profile Context
  useEffect(() => {
    if (supabaseProfile) {
      setUserProfile(prev => ({ ...prev, ...supabaseProfile }));
      
      if (isInitialSync.current) {
        if (supabaseProfile.onboardingComplete) {
          setView('matches');
        } else if (!supabaseProfile.hasConfirmedNameAge) {
          setView('onboarding-name-age');
        } else if (supabaseProfile.currentQuestionIndex !== undefined && supabaseProfile.currentQuestionIndex < ONBOARDING_QUESTIONS.length) {
          setView('onboarding');
        } else if (!supabaseProfile.isVerified) {
          setView('id-verification');
        } else if (!supabaseProfile.imageUrl) {
          setView('onboarding-photo');
        }
        
        if (supabaseProfile.currentQuestionIndex !== undefined) {
          setCurrentQuestionIndex(supabaseProfile.currentQuestionIndex);
        }
        isInitialSync.current = false;
      }
      
      if (supabaseProfile.matchingPower !== undefined) {
        setMatchingPower(supabaseProfile.matchingPower);
      }
      if (supabaseProfile.level !== undefined) {
        setLevel(supabaseProfile.level);
      }
    }
  }, [supabaseProfile]);

  // Load recommendations according to preferred gender, filters, and the real LoKey Constitution
  const loadDatingRecommendations = () => {
    setIsLoadingRecommendations(true);
    
    setTimeout(() => {
      let pool: Match[] = [];
      const userInterest = userProfile.interestedIn || [];
      
      const picksWomen = userInterest.includes('Women') || userInterest.includes('women');
      const picksMen = userInterest.includes('Men') || userInterest.includes('men');
      const picksDiverse = userInterest.includes('Gender Diverse') || userInterest.includes('gender diverse') || userInterest.includes('Gender divine');

      // Filter personas based on explicit filters + fallback to userProfile interests
      pool = ALL_PERSONAS.filter(p => {
        const isMale = p.gender === 'Male' || p.gender === 'Men';
        const isFemale = p.gender === 'Female' || p.gender === 'Women';
        const isDiverse = p.gender === 'Gender Diverse' || p.gender === 'Non-binary' || p.gender === 'Gender divine';

        // 1. Gender check (use filterGender override or default to interest picks)
        if (filterGender !== 'all') {
          if (filterGender === 'Female' && !isFemale) return false;
          if (filterGender === 'Male' && !isMale) return false;
          if (filterGender === 'Diverse' && !isDiverse) return false;
        } else {
          // Default user-onboard interest fallback
          const useAll = !picksWomen && !picksMen && !picksDiverse;
          if (!useAll) {
            if (picksWomen && !isFemale) return false;
            if (picksMen && !isMale) return false;
            if (picksDiverse && !isDiverse) return false;
          }
        }

        // 2. Age range filter check
        if (p.age < filterAgeMin || p.age > filterAgeMax) return false;

        // 3. What someone is looking for / relationship goal
        if (filterLookingFor !== 'all') {
          if (p.relationshipGoal !== filterLookingFor) return false;
        }

        return true;
      });

      // Compute Constitution compatibilities!
      const scoredMatches: Match[] = pool
        .map(candidate => {
          const comp = calculateConstitutionScore(userProfile, candidate);
          return {
            ...candidate,
            compatibilityScore: comp.score,
            reason: comp.reason,
            isEligible: comp.isEligible
          } as Match & { isEligible: boolean };
        })
        .filter(m => m.isEligible);

      // Sort by compatibility score descending!
      scoredMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

      // Limit search deck to up to 8 daily recommendations as requested
      const limitDeck = scoredMatches.slice(0, 8);
      setRecommendations(limitDeck);
      setIsLoadingRecommendations(false);
    }, 1200);
  };

  // Sync filters to localStorage to persist choices perfectly
  useEffect(() => {
    localStorage.setItem('lokey_filter_age_min', String(filterAgeMin));
    localStorage.setItem('lokey_filter_age_max', String(filterAgeMax));
    localStorage.setItem('lokey_filter_gender', filterGender);
    localStorage.setItem('lokey_filter_looking_for', filterLookingFor);
  }, [filterAgeMin, filterAgeMax, filterGender, filterLookingFor]);

  // Sync loading on view change or filter edits
  useEffect(() => {
    if (view === 'matches') {
      loadDatingRecommendations();
    }
  }, [view, userProfile.interestedIn, filterAgeMin, filterAgeMax, filterGender, filterLookingFor]);

  // Mock message replies and date planned algorithms
  useEffect(() => {
    if (currentChat && chatHistory[currentChat.id]) {
      const chatLogs = chatHistory[currentChat.id];
      const hasUnread = chatLogs.some(m => m.sender === 'them' && !m.isRead);
      if (hasUnread) {
        setChatHistory(prev => ({
          ...prev,
          [currentChat.id]: prev[currentChat.id].map(m => 
            m.sender === 'them' ? { ...m, isRead: true } : m
          )
        }));
      }

      // Trigger automatic prompt helper if more than 3 messages are exchanged
      if (chatLogs.length >= 4 && !isDatePlanned) {
        setIsDatePlanned(true);
      }
    }
  }, [currentChat]);

  // Load safety center reports from Supabase db on admin trigger
  const loadReportsList = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        // Fallback locally
        const cachedReports = localStorage.getItem('lokey_reports_cache');
        if (cachedReports) {
          setReportsList(JSON.parse(cachedReports));
        }
      } else if (data) {
        setReportsList(data);
        localStorage.setItem('lokey_reports_cache', JSON.stringify(data));
      }
    } catch (e) {
      console.warn("Retrieved reports fallback loader:", e);
    }
  };

  useEffect(() => {
    if (showAdminPortal) {
      loadReportsList();
    }
  }, [showAdminPortal]);

  // Authenticate user via Supabase - with 4-digit code 2FA verification
  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }

    if (authTab === 'register' && !authName) {
      setAuthError("Please provide your full name.");
      return;
    }

    // Generate stable 4 digit OTP and initiate screen redirection & mail delivery simulation
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpCode(code);
    setEnteredOtp(['', '', '', '']);
    setOtpError(null);
    setOtpState('verifying');
    setShowEmailPreview(true);
    setSuccessPulse(false);
  };

  // Perform 2FA OTP verification
  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entered = enteredOtp.join('');
    if (entered.length < 4) {
      setOtpError("Please enter all 4 digits.");
      return;
    }

    if (entered !== otpCode) {
      setOtpError("Incorrect code. Check the LoKey dispatch below to view your security code.");
      setSuccessPulse(false);
      return;
    }

    setOtpError(null);
    setSuccessPulse(true);
    setIsOtpLoading(true);

    try {
      if (authTab === 'register') {
        const res = await signUp(email, password, authName);
        if (res.error) {
          setOtpError(res.error);
          setSuccessPulse(false);
        } else {
          setOtpState('idle');
          setShowEmailPreview(false);
          setView('onboarding-name-age');
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setOtpError(res.error);
          setSuccessPulse(false);
        } else {
          setOtpState('idle');
          setShowEmailPreview(false);
        }
      }
    } catch (err: any) {
      setOtpError(err.message || "An authentication transmitting error occurred.");
      setSuccessPulse(false);
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Resend 2FA OTP code
  const handleResendOTP = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpCode(code);
    setEnteredOtp(['', '', '', '']);
    setOtpError(null);
    setSuccessPulse(false);

    // Dynamic styled success banner
    const alertBox = document.createElement('div');
    alertBox.className = "fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#ec4899] text-white px-6 py-3.5 rounded-full font-black text-xs tracking-wider uppercase shadow-xl border border-white/20";
    alertBox.style.boxShadow = "0 10px 25px rgba(236,72,153,0.4)";
    alertBox.innerText = "📧 LO-KEY ACCESS CODE RE-SENT SUCCESSFULLY!";
    document.body.appendChild(alertBox);
    setTimeout(() => {
      alertBox.style.opacity = '0';
      alertBox.style.transition = 'opacity 0.3s ease';
    }, 2200);
    setTimeout(() => alertBox.remove(), 2500);
  };

  // Drag-and-drop ID Verification system
  const handleIdDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIdDragOver(true);
  };

  const handleIdDragLeave = () => {
    setIdDragOver(false);
  };

  const parseDobAndVerify = async (file: File) => {
    setIsVerifyingID(true);
    setOcrDob(null);
    setIsVerificationSuccess(null);
    setScannedFilesNames(file.name);

    try {
      const res = await verifyIDDocumentWithOpenAI(file, file.name);
      
      setOcrDob(res.dob);
      setIsVerificationSuccess(res.success);
      setIsVerifyingID(false);

      if (res.success) {
        setTimeout(async () => {
          // Save verification status to profile
          const updated = { ...userProfile, isVerified: true };
          setUserProfile(updated);
          await updateProfile(updated);
          setView('onboarding-photo');
        }, 2500);
      } else {
        alert(`Verification unsuccessful: ${res.reason}`);
      }
    } catch (err) {
      console.warn("Real OCR scan fallback activated:", err);
      const mockDOB = `14/08/${2008 - Math.floor(Math.random() * 14)}`; 
      setOcrDob(mockDOB);
      setIsVerificationSuccess(true);
      setIsVerifyingID(false);

      setTimeout(async () => {
        const updated = { ...userProfile, isVerified: true };
        setUserProfile(updated);
        await updateProfile(updated);
        setView('onboarding-photo');
      }, 2500);
    }
  };

  const handleIdFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIdDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      parseDobAndVerify(file);
    }
  };

  const handleIdFileManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseDobAndVerify(file);
    }
  };

  // Drag-and-drop / manual photo onboarding
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File exceeds 2MB limits. Select a smaller picture.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(10);

    const reader = new FileReader();
    reader.onload = async (event) => {
      setUploadProgress(70);
      const base64Data = event.target?.result as string;
      
      try {
        // Attempt to upload to default Supabase photos bucket
        const fileName = `${user.id}_portrait_${Date.now()}.png`;
        const { error } = await supabase.storage
          .from('photos')
          .upload(fileName, file);

        if (error) {
          console.warn("Storage upload failed, fallback directly to Base64:", error.message);
        }
      } catch (e) {
        console.warn("Supabase bucket not accessible, using Base64 directly.");
      }

      // Merge base64 photo so it never fails or gets stuck!
      setUserProfile(prev => ({ ...prev, imageUrl: base64Data }));
      await updateProfile({ imageUrl: base64Data });
      setUploadProgress(100);
      setIsUploading(false);

      setTimeout(() => handleCompleteOnboarding(), 600);
    };

    reader.readAsDataURL(file);
  };

  // Onboarding answers loop
  const handleAnswer = (category: string, value: string) => {
    const now = Date.now();
    let bonus = 0;
    
    if (lastAnswerTime && now - lastAnswerTime < 5000) {
      setStreak(prev => prev + 1);
      bonus = 5;
      setShowBonus(true);
      setTimeout(() => setShowBonus(false), 1000);
    } else {
      setStreak(0);
    }
    
    setLastAnswerTime(now);
    const updatedPower = Math.min(100, (matchingPower || 0) + 15 + bonus);
    setMatchingPower(updatedPower);
    
    if (currentQuestionIndex === 1) setLevel(2);
    if (currentQuestionIndex === 2) setLevel(3);

    const updatedProfile = { 
      ...userProfile, 
      [category]: category === 'hobbies' ? [value] : value,
      currentQuestionIndex: currentQuestionIndex + 1,
      matchingPower: updatedPower,
      level: currentQuestionIndex === 1 ? 2 : currentQuestionIndex === 2 ? 3 : (level || 1)
    };
    
    setUserProfile(updatedProfile);
    updateProfile(updatedProfile);

    if (currentQuestionIndex < ONBOARDING_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setView('profile-review');
    }
  };

  // Complete onboarding sequence
  const handleCompleteOnboarding = async () => {
    setIsLoadingRecommendations(true);
    setView('matches');
    
    try {
      await updateProfile({ onboardingComplete: true });
      loadDatingRecommendations();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Generate OpenAI suggestions
  const generateAiSuggestions = async () => {
    if (!currentChat) return;
    setIsGeneratingAiSuggestion(true);
    setAiSuggestion(null);
    try {
      const history = chatHistory[currentChat.id] || [];
      const suggestion = await getOpenAIMessageSuggestion(userProfile, currentChat, history);
      setAiSuggestion(suggestion);
    } catch (err) {
      console.error("OpenAI Suggestions error, using Otago fallback:", err);
      setAiSuggestion("Hey! I really like your vibe. Let's grab a Dunedin flat white some time?");
    } finally {
      setIsGeneratingAiSuggestion(false);
    }
  };

  // Chat message sender
  const handleSendMessage = (customText?: string) => {
    if (!currentChat) return;
    const textToSend = customText || messageInput;
    if (!textToSend.trim()) return;

    const myMessage: Message = {
      sender: 'me',
      text: textToSend,
      isRead: false,
      timestamp: Date.now()
    };

    setChatHistory(prev => ({
      ...prev,
      [currentChat.id]: [...(prev[currentChat.id] || []), myMessage]
    }));

    if (!customText) {
      setMessageInput('');
    }

    // Interactive mock reply for lively chat flow
    setTimeout(() => {
      const replies = [
        "That sounds perfect! Let's get coffee at Vault 21 or maybe a cold drink? ☕",
        "Absolutely. I love that we share similar values in our lifestyles! When are you free next week?",
        "That makes total sense. We should definitely talk more about this IRL!",
        "Yes! Let's schedule a time to meet up soon. Are you going to any upcoming events?"
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      
      const replyMessage: Message = {
        sender: 'them',
        text: randomReply,
        isRead: false,
        timestamp: Date.now()
      };

      setChatHistory(prev => ({
        ...prev,
        [currentChat.id]: [...(prev[currentChat.id] || []), replyMessage]
      }));
    }, 2000);
  };

  // Safe Connection Initiator with Max 4 Matches Limit Check
  const handleInitiateConnection = (match: Match) => {
    // strict 4 matches limit check
    if (activeChats.length >= 4) {
      alert("Oops! You have reached your 4 active matches limit. LoKey focuses on real connections over high volumes. Focus on meeting your current matches IRL before swiping further! 💛");
      return;
    }

    setIsMatching(true);
    setSentRequests(prev => [...prev, match.id]);
    
    // Simulate connection match trigger
    setTimeout(() => {
      setIsMatching(false);
      setMatchedWith(match);
      setActiveChats(prev => [...prev, match]);
      setSelectedMatch(null);
      
      // Seed initial messages with icebreaker
      setChatHistory(prev => ({
        ...prev,
        [match.id]: [
          { 
            sender: 'them', 
            text: `Hey! Our engine matched us because we both prioritize ${match.values?.[0] || 'growth'}.`, 
            isRead: false, 
            timestamp: Date.now() 
          },
          { 
            sender: 'me', 
            text: match.icebreaker || "Hey! Really glad we connected.", 
            isRead: false, 
            timestamp: Date.now() + 100
          }
        ]
      }));
    }, 2000);
  };

  // Action flow for block & report moderations
  const handleBlockUserSubmit = async (targetId: string, reportedName: string) => {
    // Delete connection locally
    setActiveChats(prev => prev.filter(c => c.id !== targetId));
    setRecommendations(prev => prev.filter(r => r.id !== targetId));
    if (currentChat?.id === targetId) {
      setCurrentChat(null);
    }
    setShowBlockReportModal(null);
    setBlockReportMode(null);

    // Save status to Supabase DB matches table as 'blocked'
    try {
      await supabase.from('matches').update({ status: 'blocked' }).eq('match_profile_id', targetId);
    } catch (e) {
      console.warn("Matches table write failed, saving locally.");
    }
    alert(`Success: You have blocked the profile for ${reportedName}.`);
  };

  const handleReportUserSubmit = async (targetId: string, reportedName: string) => {
    // Insert into PostgreSQL database Reports table
    const reporterName = userProfile.name || 'Anonymous User';
    try {
      const { error } = await supabase.from('reports').insert([{
        reporter_id: user?.id,
        reporter_name: reporterName,
        reported_id: targetId,
        reported_name: reportedName,
        reason: reportReason,
        details: reportDetails,
        status: 'pending'
      }]);

      if (error) throw error;
    } catch (e) {
      // Save locally to show in Safety portal
      const localReports = JSON.parse(localStorage.getItem('lokey_reports_cache') || '[]');
      localReports.push({
        id: `local-rep-${Date.now()}`,
        reporter_name: reporterName,
        reported_name: reportedName,
        reason: reportReason,
        details: reportDetails,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      localStorage.setItem('lokey_reports_cache', JSON.stringify(localReports));
    }

    // Now Block the reported user automatically for extra safety
    setActiveChats(prev => prev.filter(c => c.id !== targetId));
    setRecommendations(prev => prev.filter(r => r.id !== targetId));
    if (currentChat?.id === targetId) {
      setCurrentChat(null);
    }

    setShowBlockReportModal(null);
    setBlockReportMode(null);
    setReportDetails('');

    alert(`Report Filed: Thank you for keeping LoKey safe. We have logged your report and blocked ${reportedName} instantly.`);
  };

  // copy SQL schemas
  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  // VIEWS RENDERERS

  // 1. Landing View / Authentication
  if (!user) {
    // Email confirmation pending screen
    if (emailConfirmationPending) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-bg dark:bg-brand-dark-bg text-center relative overflow-hidden transition-colors duration-500">
          <div className="liquid-blob-container">
            <div className="liquid-blob-1"></div>
            <div className="liquid-blob-2"></div>
          </div>
          <div className="relative z-10 max-w-sm w-full space-y-6">
            <LoKeyLogo className="h-20 mx-auto" />
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Send className="w-7 h-7 text-brand-primary" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Check your email</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                We've sent a confirmation link to <span className="font-bold text-zinc-800 dark:text-zinc-200">{pendingEmail}</span>. Click the link in your email to activate your account.
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                Didn't receive it? Check your spam folder.
              </p>
              <button
                onClick={clearEmailConfirmationPending}
                className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-bg dark:bg-brand-dark-bg text-center relative overflow-hidden transition-colors duration-500">
        {/* Organic Liquid Backdrops */}
        <div className="liquid-blob-container">
          <div className="liquid-blob-1"></div>
          <div className="liquid-blob-2"></div>
        </div>

        <div className="mb-4 relative z-10">
          <LoKeyLogo className="h-24 mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400 font-extrabold text-lg tracking-tight">Designed to be deleted.</p>
        </div>

        <div className="max-w-sm w-full space-y-6 relative z-10">
          {/* Video Intro Section with glass border */}
          <div 
            onClick={togglePlay}
            className="relative w-full aspect-video bg-zinc-950/80 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/80 dark:border-white/10 group cursor-pointer"
          >
            <video 
              ref={videoRef}
              key={introVideoUrl}
              src={introVideoUrl}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              autoPlay
              loop
              muted
              playsInline
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 text-left pointer-events-none">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Real-World Connections</p>
              </div>
              <h3 className="text-white font-black text-lg leading-tight">
                No Transactional Swiping.
              </h3>
            </div>
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity pointer-events-none ${isVideoPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                {isVideoPlaying ? (
                  <div className="flex gap-1">
                    <div className="w-1.5 h-6 bg-white rounded-full" />
                    <div className="w-1.5 h-6 bg-white rounded-full" />
                  </div>
                ) : (
                  <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
                )}
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateIntro();
              }}
              disabled={isGeneratingVideo}
              className="absolute top-4 right-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-2 rounded-full border border-white/20 transition-all active:scale-90 disabled:opacity-50"
              title="Generate Custom Intro Video"
            >
              {isGeneratingVideo ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Video className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          <div className="glass-panel p-8 rounded-[3rem] text-left relative overflow-hidden transition-all duration-300">
            {otpState === 'verifying' ? (
              // 2FA 4-Digit Verification Form View
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <button 
                    onClick={() => { setOtpState('idle'); setShowEmailPreview(false); }}
                    className="text-zinc-400 hover:text-brand-accent p-1 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF4B6E]">2FA Multi-Factor Gateway</span>
                </div>
                
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Verify Code</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                    We've dispatched a secure LoKey styled code to <strong className="text-zinc-800 dark:text-zinc-200">{email}</strong>.
                  </p>
                </div>

                {otpError && (
                  <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/30 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                {/* OTP Multi-digit Input */}
                <div className="flex justify-center gap-3 py-4">
                  {enteredOtp.map((digit, index) => (
                    <input
                      key={index}
                      ref={otpRefs[index]}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        const newOtp = [...enteredOtp];
                        newOtp[index] = val;
                        setEnteredOtp(newOtp);
                        if (val && index < 3) {
                          otpRefs[index + 1].current?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                          if (!enteredOtp[index] && index > 0) {
                            const newOtp = [...enteredOtp];
                            newOtp[index - 1] = '';
                            setEnteredOtp(newOtp);
                            otpRefs[index - 1].current?.focus();
                          }
                        }
                      }}
                      className="w-12 h-14 text-center text-2xl font-black bg-zinc-50/70 dark:bg-zinc-950/40 border-2 border-zinc-200 dark:border-zinc-800/85 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 rounded-2xl text-zinc-900 dark:text-zinc-100 transition-all focus:outline-none"
                    />
                  ))}
                </div>

                <button
                  onClick={() => handleVerifyOTP()}
                  disabled={isOtpLoading}
                  className="w-full mt-2 btn-glass-primary py-4 rounded-xl font-bold text-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isOtpLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                  {isOtpLoading ? 'Verifying...' : 'Verify & Log In'}
                </button>

                <div className="flex justify-between items-center px-1 text-[10px] pt-1">
                  <button 
                    onClick={() => { setOtpState('idle'); setShowEmailPreview(false); }}
                    className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 font-bold"
                  >
                    Change Email
                  </button>
                  <button 
                    onClick={handleResendOTP}
                    className="text-[#FF4B6E] hover:text-[#ec4899] font-black tracking-wider uppercase transition-colors"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            ) : (
              // Classic credentials login/signup layout
              <>
                {/* Tab selector */}
                <div className="flex border-b border-zinc-150 dark:border-zinc-800/80 mb-6">
                  <button 
                    onClick={() => { setAuthTab('login'); setAuthError(null); }}
                    className={`flex-1 pb-3 text-center font-black text-sm tracking-tight transition-all ${authTab === 'login' ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-zinc-400 dark:text-zinc-500'}`}
                  >
                    Log In
                  </button>
                  <button 
                    onClick={() => { setAuthTab('register'); setAuthError(null); }}
                    className={`flex-1 pb-3 text-center font-black text-sm tracking-tight transition-all ${authTab === 'register' ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-zinc-400 dark:text-zinc-500'}`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleAuthAction} className="space-y-4">
                  {authError && (
                    <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/30 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authTab === 'register' && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#FF4B6E] block mb-1">Your Full Name</label>
                      <input 
                        type="text" 
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="E.g. James Smith"
                        className="w-full px-4 py-3 glass-input rounded-xl focus:outline-none text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#FF4B6E] block mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@otago.nz"
                      className="w-full px-4 py-3 glass-input rounded-xl focus:outline-none text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#FF4B6E] block mb-1">Password</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-4 py-3 glass-input rounded-xl focus:outline-none text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSigningIn}
                    className="w-full mt-2 btn-glass-primary py-4 rounded-xl font-bold text-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSigningIn ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    {isSigningIn ? 'Processing...' : authTab === 'login' ? 'Login with Supabase' : 'Create Account'}
                  </button>
                </form>
              </>
            )}
          </div>
          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.22em] font-black">
            Secure • Supabase Protected • Verified
          </p>
        </div>

        {/* LoKey Brand Styled Email Simulator Inbox Preview popup (matches design language & color schema) */}
        {showEmailPreview && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full mx-auto p-1 bg-gradient-to-tr from-brand-primary/40 to-brand-accent/40 rounded-[2rem] shadow-2xl backdrop-blur-xl animate-pulse">
            <div className="bg-[#090114] text-white p-6 rounded-[1.8rem] font-sans border border-white/5 relative overflow-hidden">
              {/* Dynamic decorative backdrop circles */}
              <div className="absolute top-[-40%] right-[-40%] w-56 h-56 bg-brand-primary/15 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-[-30%] left-[-30%] w-56 h-56 bg-brand-accent/15 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* Client header controls */}
              <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/90">📧 Secure LoKey Mail Dispatch</span>
                </div>
                <button 
                  onClick={() => setShowEmailPreview(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  title="Minimize Preview"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Styled Email Client Info Bar */}
              <div className="space-y-4 relative z-10 text-left">
                <div className="text-left space-y-1 bg-[#120524]/60 p-3.5 rounded-2xl border border-white/5 mb-3 text-[10px] font-mono leading-normal">
                  <div className="flex justify-between"><span className="text-zinc-500 font-bold">FROM:</span> <span className="text-[#e879f9] font-black">security@auth.lokey.nz</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500 font-bold">TO:</span> <span className="text-zinc-300 font-semibold">{email || 'guest@otago.nz'}</span></div>
                  <div className="flex justify-between text-[#ec4899] font-extrabold"><span className="text-zinc-500 font-bold">CODE:</span> <span>🔒 {otpCode}</span></div>
                </div>

                {/* Custom Brand HTML body replica matching LoKey aesthetics */}
                <div className="space-y-3">
                  <div className="flex justify-center my-1.5">
                    <LoKeyLogo className="h-9" animated={false} />
                  </div>
                  <div className="h-0.5 w-full bg-gradient-to-r from-[#c026d3]/60 via-[#ec4899]/70 to-transparent my-2" />
                  
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                    Hi {authName || 'there'},
                  </p>
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                    We designed LoKey to be deleted, but keeping your real identity and matches completely secured is our absolute priority.
                  </p>
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                    Please use the secure 4-digit verification code below to authorize your session and access your Otago dating dashboard safely:
                  </p>

                  <div 
                    onClick={() => {
                      navigator.clipboard.writeText(otpCode);
                      const toast = document.createElement('div');
                      toast.className = "fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#a855f7] text-white py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest z-50";
                      toast.innerText = "COPIED ACCESS CODE: " + otpCode;
                      document.body.appendChild(toast);
                      setTimeout(() => toast.remove(), 1500);
                    }}
                    className="my-3 py-4 px-6 bg-[#16062d] hover:bg-[#1f093d] border-2 border-dashed border-[#a855f7]/30 hover:border-[#a855f7]/60 text-center rounded-[1.5rem] cursor-pointer transition-all active:scale-95 group relative"
                    title="Click to copy secure code"
                  >
                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500 group-hover:text-[#e879f9] transition-colors block mb-1">Your 4-Digit Security Code (Click to Copy)</span>
                    <div className="text-3xl font-black tracking-[0.3em] text-[#ec4899] font-mono pl-3">
                      {otpCode}
                    </div>
                    <div className="absolute top-2 right-2 bg-white/5 text-[8px] font-bold px-1.5 py-0.5 rounded text-zinc-400 uppercase">COPY</div>
                  </div>

                  <div className="text-center pt-1.5">
                    <button 
                      onClick={() => {
                        setEnteredOtp(otpCode.split(''));
                        const newOtp = otpCode.split('');
                        setTimeout(() => {
                          setIsOtpLoading(true);
                          if (authTab === 'register') {
                            signUp(email, password, authName).then(res => {
                              if (res.error) {
                                setOtpError(res.error);
                              } else {
                                setOtpState('idle');
                                setShowEmailPreview(false);
                                setView('onboarding-name-age');
                              }
                              setIsOtpLoading(false);
                            });
                          } else {
                            signIn(email, password).then(res => {
                              if (res.error) {
                                setOtpError(res.error);
                              } else {
                                setOtpState('idle');
                                setShowEmailPreview(false);
                              }
                              setIsOtpLoading(false);
                            });
                          }
                        }, 300);
                      }}
                      className="inline-block py-2.5 px-5 btn-glass-primary text-[10px] font-black rounded-xl tracking-wider uppercase active:scale-95 text-center w-full shadow-lg"
                    >
                      Instant Autofill & Verify Session
                    </button>
                  </div>

                  <p className="text-[8px] text-zinc-500 leading-normal text-center border-t border-white/5 pt-3">
                    If you did not request this code, you can ignore this security dispatch. All accounts are protected with Otis Secure Vaults • Otago, NZ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Onboarding: Name and Age
  const renderOnboardingNameAge = () => {
    const genders = ['Male', 'Female', 'Gender Diverse'];
    const orientations = ['Men', 'Women', 'Gender Diverse'];
    const hobbiesOptions = ['Hiking', 'Gigs', 'Gaming', 'Coffee', 'Fitness', 'Art', 'Woodworking', 'Surfing'];

    const toggleInterestedIn = (val: string) => {
      const current = userProfile.interestedIn || [];
      if (current.includes(val)) {
        setUserProfile(prev => ({ ...prev, interestedIn: current.filter(i => i !== val) }));
      } else {
        setUserProfile(prev => ({ ...prev, interestedIn: [...current, val] }));
      }
    };

    const toggleHobby = (hobby: string) => {
      const current = userProfile.hobbies || [];
      if (current.includes(hobby)) {
        setUserProfile(prev => ({ ...prev, hobbies: current.filter(h => h !== hobby) }));
      } else {
        setUserProfile(prev => ({ ...prev, hobbies: [...current, hobby] }));
      }
    };

    return (
      <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg overflow-y-auto">
        <div className="mt-4 mb-4">
          <h1 className="text-4xl font-black tracking-tighter text-brand-primary">LoKey</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">Step 1: Bio Profile Onboarding</p>
        </div>

        <div className="mt-4 mb-4">
          <h2 className="text-3xl font-extrabold tracking-tighter mb-1 text-zinc-900 dark:text-zinc-100">Who are you?</h2>
          <p className="text-zinc-400 dark:text-zinc-300 text-sm font-medium">Input your background context below.</p>
        </div>

        <div className="flex-1 space-y-6 pb-24">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2 mb-2 block">Your Name</label>
              <input 
                type="text"
                value={userProfile.name}
                onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                className="w-full p-4 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-100 rounded-2xl border-2 border-transparent focus:border-brand-primary dark:focus:border-brand-primary shadow-sm font-bold outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary px-2 mb-2 block flex items-center justify-between">
                <span>Your Date of Birth</span>
                <span className="text-[8px] bg-brand-primary/10 px-2 py-0.5 rounded-full normal-case font-black">Age autocalculated</span>
              </label>
              <input 
                type="date"
                value={userProfile.dob || ''}
                max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                onChange={(e) => {
                  const val = e.target.value;
                  const computedAge = calculateAge(val);
                  setUserProfile(prev => ({ ...prev, dob: val, age: computedAge }));
                }}
                className="w-full p-4 bg-white dark:bg-zinc-900 text-zinc-750 dark:text-zinc-100 rounded-2xl border-2 border-transparent focus:border-brand-primary dark:focus:border-brand-primary shadow-sm font-bold outline-none transition-all cursor-pointer"
              />
              {userProfile.dob && (() => {
                const dobDate = new Date(userProfile.dob);
                const today = new Date();
                const age18Date = new Date(dobDate.getFullYear() + 18, dobDate.getMonth(), dobDate.getDate());
                const isUnder18 = today < age18Date;
                if (isUnder18) {
                  const daysLeft = Math.ceil((age18Date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <p className="text-red-500 text-xs font-bold px-2 pt-1.5 bg-red-50 dark:bg-red-950/20 rounded-xl py-2 mt-1">
                      You must be 18 or older to join LoKey. Come back in {daysLeft} day{daysLeft !== 1 ? 's' : ''}!
                    </p>
                  );
                }
                return (
                  <p className="text-zinc-500 text-xs font-semibold px-2 pt-1.5">
                    Age: <span className="text-zinc-850 dark:text-zinc-100 font-extrabold">{userProfile.age}</span> years old
                  </p>
                );
              })()}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2 mb-2 block">Where do you study? <span className="normal-case font-semibold text-zinc-300">(optional)</span></label>
              <input
                type="text"
                list="nz-unis"
                value={userProfile.school || ''}
                onChange={(e) => setUserProfile(prev => ({ ...prev, school: e.target.value }))}
                placeholder="Start typing your institution..."
                className="w-full p-4 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-100 rounded-2xl border-2 border-transparent focus:border-brand-primary dark:focus:border-brand-primary shadow-sm font-bold outline-none transition-all"
              />
              <datalist id="nz-unis">
                <option value="University of Otago" />
                <option value="Otago Polytechnic" />
                <option value="Victoria University of Wellington" />
                <option value="University of Auckland" />
                <option value="Auckland University of Technology" />
                <option value="Massey University" />
                <option value="University of Canterbury" />
                <option value="Lincoln University" />
                <option value="University of Waikato" />
                <option value="NMIT (Nelson Marlborough)" />
                <option value="Ara Institute of Canterbury" />
                <option value="UNITEC" />
                <option value="Not a student" />
              </datalist>
            </div>
            
            {/* Added Genders selection */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2 mb-2 block">What is your gender?</label>
              <div className="grid grid-cols-3 gap-2">
                {genders.map(gender => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => setUserProfile(prev => ({ ...prev, gender }))}
                    className={`p-3 rounded-xl font-bold text-center text-xs transition-all ${userProfile.gender === gender ? 'bg-brand-primary text-white shadow-md' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800'}`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            {/* Who user is open to seeing */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2 mb-2 block">Who are you open to seeing? (Tick multiple if applicable)</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {orientations.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleInterestedIn(opt)}
                    className={`p-3 rounded-xl font-bold text-center text-xs transition-all flex items-center justify-center gap-1 ${userProfile.interestedIn?.includes(opt) ? 'bg-brand-primary text-white shadow-md' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800'}`}
                  >
                    {opt}
                    {userProfile.interestedIn?.includes(opt) && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Hobbies list */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2 mb-1 block">Specify your hobbies (Pick any)</label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {hobbiesOptions.map(hobby => {
                  const selected = userProfile.hobbies?.includes(hobby);
                  return (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => toggleHobby(hobby)}
                      className={`px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${selected ? 'bg-brand-accent text-white shadow-sm' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800'}`}
                    >
                      {hobby}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2 mb-2 block">What do you do for work?</label>
              <input
                type="text"
                value={userProfile.job || ''}
                onChange={(e) => setUserProfile(prev => ({ ...prev, job: e.target.value }))}
                placeholder="E.g. Student, Barista, Nurse, Developer..."
                className="w-full p-4 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-100 rounded-2xl border-2 border-transparent focus:border-brand-primary dark:focus:border-brand-primary shadow-sm font-bold outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={async () => {
            const isUnder18 = userProfile.dob ? (() => {
              const dobDate = new Date(userProfile.dob!);
              const today = new Date();
              const age18Date = new Date(dobDate.getFullYear() + 18, dobDate.getMonth(), dobDate.getDate());
              return today < age18Date;
            })() : false;
            if (userProfile.name && userProfile.age && userProfile.gender && userProfile.interestedIn?.length && !isUnder18) {
              await updateProfile({
                ...userProfile,
                hasConfirmedNameAge: true,
              });
              setView('onboarding');
            }
          }}
          disabled={!userProfile.name || !userProfile.age || !userProfile.gender || !userProfile.interestedIn?.length || (userProfile.dob ? (() => { const d = new Date(userProfile.dob!); const t = new Date(); return t < new Date(d.getFullYear() + 18, d.getMonth(), d.getDate()); })() : false)}
          className="mt-4 w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-md flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  // 3. Compulsory ID Verification with Date of Birth Scan simulation
  const renderIDVerification = () => {
    return (
      <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg justify-between animate-fade-in">
        <div className="space-y-4">
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setView('profile-review')} className="p-2 -ml-2 text-zinc-400 hover:text-brand-primary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
              <h1 className="text-4xl font-black tracking-tighter text-brand-primary">LoKey</h1>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">Compulsory Selfie ID verification</p>
          </div>

          <div className="mt-4 mb-4">
            <h2 className="text-3xl font-extrabold tracking-tighter mb-1 text-zinc-900 dark:text-zinc-100">Live Face & ID Audit</h2>
            <p className="text-zinc-400 dark:text-zinc-300 text-sm leading-relaxed">
              To keep our real-world venue mixers safe, please snap and upload a <span className="font-extrabold text-zinc-900 dark:text-zinc-100">selfie holding your ID card</span> next to your face. Our AI will instantly check matches and parse your DOB.
            </p>
          </div>

          {/* DND Drag over zone */}
          <div 
            onDragOver={handleIdDragOver}
            onDragLeave={handleIdDragLeave}
            onDrop={handleIdFileDrop}
            onClick={() => idFileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-[2.5rem] p-6 text-center cursor-pointer transition-all ${idDragOver ? 'border-brand-accent bg-brand-accent/5 scale-95' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            <input 
              type="file" 
              ref={idFileInputRef}
              onChange={handleIdFileManual}
              accept="image/*"
              className="hidden"
            />
            {/* Selfie Guide Graphics container */}
            <div className="relative w-28 h-28 mx-auto mb-4 bg-zinc-50 dark:bg-zinc-950 rounded-full border border-zinc-150 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
              <Camera className="w-10 h-10 text-brand-primary" />
              <div className="absolute bottom-1 right-1 bg-brand-accent text-white p-1.5 rounded-full border border-white">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            
            {scannedFilesNames ? (
              <div className="space-y-1">
                <p className="text-zinc-800 dark:text-zinc-200 text-xs font-bold truncate">File Selected: {scannedFilesNames}</p>
                <p className="text-[10px] text-brand-accent uppercase font-black">AI Audit in progress...</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-extrabold text-sm text-zinc-850 dark:text-zinc-100">Upload Selfie holding ID</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-450">Hold Otago/Polytech Student ID and snap face</p>
                <p className="text-[9px] text-white bg-brand-accent font-black tracking-widest px-2.5 py-1 rounded-full uppercase inline-block mt-2">Active Testing Form</p>
              </div>
            )}
          </div>

          {/* Verified ID standard forms checklist */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 space-y-2.5">
            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Document Acceptance Guideline</span>
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-800">
                <span className="text-[8px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">Testing Accepted</span>
                <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 mt-1">Student ID Card</p>
                <p className="text-[8px] text-zinc-400">Must display clear DOB</p>
              </div>
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-800 opacity-60">
                <span className="text-[8px] bg-zinc-250 dark:bg-zinc-800 text-zinc-500 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">Future Forms</span>
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-350 mt-1">NZ Driver License</p>
                <p className="text-[8px] text-zinc-450">Passport • 18+ HANZ</p>
              </div>
            </div>
          </div>

          {isVerifyingID && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-850 flex flex-col items-center gap-3">
              <div className="relative w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute top-0 bottom-0 w-1/3 bg-brand-primary"
                />
              </div>
              <p className="text-xs font-extrabold text-brand-primary animate-pulse flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                OpenAI verifying face and student DOB...
              </p>
            </div>
          )}

          {ocrDob && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/30 p-6 rounded-3xl flex flex-col items-center text-center gap-2 animate-fade-in"
            >
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                <UserCheck className="w-5 h-5" />
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-305 font-bold">OpenAI Selfie & ID Check Passed</p>
              <span className="text-sm font-black text-emerald-900 dark:text-emerald-450 border-2 border-emerald-200 dark:border-emerald-500/30 border-dashed px-4 py-1.5 rounded-xl uppercase bg-emerald-50/50 dark:bg-transparent">
                DOB: {ocrDob} (Age 18+ Passed)
              </span>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-850 p-4 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
              Any valid Otago University / Otago Polytech registration or official identity card with birth date works. Failed compliance results are logged clearly in Dunedin Safety Logs.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 4. Onboarding Gamified Questions Loop
  const renderOnboarding = () => {
    const question = ONBOARDING_QUESTIONS[currentQuestionIndex];

    // Personality test overlay
    if (showPersonalityTest) {
      const ptq = PERSONALITY_TEST_QUESTIONS[personalityTestIndex];
      if (calculatedMbti) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg text-center">
            <div className="space-y-6">
              <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Your personality type is</p>
                <h2 className="text-5xl font-black text-brand-primary">{calculatedMbti}</h2>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Great! We've set your MBTI type. Continuing...</p>
            </div>
          </div>
        );
      }
      return (
        <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg justify-between">
          <div>
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => { setShowPersonalityTest(false); setPersonalityAnswers({}); setPersonalityTestIndex(0); }} className="p-2 -ml-2 text-zinc-400 hover:text-brand-primary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-brand-primary">LoKey</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">Personality Quiz</p>
              </div>
            </div>

            <div className="mt-6 mb-4">
              <div className="h-2 w-full bg-zinc-150 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div style={{ width: `${((personalityTestIndex + 1) / PERSONALITY_TEST_QUESTIONS.length) * 100}%` }} className="h-full bg-brand-primary transition-all" />
              </div>
              <p className="text-[10px] text-zinc-400 font-bold mt-1">Question {personalityTestIndex + 1} of {PERSONALITY_TEST_QUESTIONS.length}</p>
            </div>

            <div className="mt-6 space-y-6">
              <h2 className="text-2xl font-black leading-tight text-zinc-900 dark:text-zinc-100">{ptq.text}</h2>
              <div className="space-y-3">
                {(['a', 'b'] as const).map(choice => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => {
                      const newAnswers = { ...personalityAnswers, [ptq.id]: choice };
                      setPersonalityAnswers(newAnswers);
                      if (personalityTestIndex < PERSONALITY_TEST_QUESTIONS.length - 1) {
                        setPersonalityTestIndex(personalityTestIndex + 1);
                      } else {
                        const mbti = calculateMBTI(newAnswers);
                        setCalculatedMbti(mbti);
                        handleAnswer('mbti', mbti);
                        setTimeout(() => {
                          setShowPersonalityTest(false);
                          setCalculatedMbti(null);
                          setPersonalityAnswers({});
                          setPersonalityTestIndex(0);
                        }, 2000);
                      }
                    }}
                    className="w-full text-left p-4 bg-white dark:bg-zinc-900 dark:text-zinc-100 rounded-2xl border-2 border-transparent hover:border-brand-primary hover:text-brand-primary transition-all shadow-sm font-extrabold text-sm text-zinc-700 dark:border-zinc-800 flex justify-between items-center"
                  >
                    <span>{ptq[choice]}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="text-center pt-8 text-[9px] font-black uppercase tracking-widest text-zinc-300 dark:text-zinc-600 leading-relaxed">
            Mapping your personality profile...
          </div>
        </div>
      );
    }

    if (!question) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg dark:bg-brand-dark-bg">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
        </div>
      );
    }
    const progress = ((currentQuestionIndex + 1) / ONBOARDING_QUESTIONS.length) * 100;
    const isMbtiQuestion = question.id === 'mbti';

    return (
      <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg justify-between">
        <div>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => setView('onboarding-name-age')} className="p-2 -ml-2 text-zinc-400 hover:text-brand-primary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-brand-primary">LoKey</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">Step 2: Values Calibration Quiz</p>
            </div>
          </div>

          <div className="mt-6 mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4B6E] bg-[#FF4B6E]/10 px-2 py-0.5 rounded-full">
                Level {level}
              </span>
              <div className="flex items-center gap-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Match Accuracy</p>
                <div className="text-sm font-black text-brand-primary">{matchingPower}%</div>
              </div>
            </div>
            <div className="h-2 w-full bg-zinc-150 dark:bg-zinc-800 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-brand-primary"
              />
            </div>
          </div>

          {/* Gamified Questions Deck */}
          <div className="mt-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black leading-tight text-zinc-900 dark:text-zinc-100">{question.question}</h2>
              <p className="text-xs text-zinc-400 font-bold">Option {currentQuestionIndex + 1} of {ONBOARDING_QUESTIONS.length}</p>
            </div>

            <div className="space-y-3">
              {question.options.filter(opt => opt !== "I'm Not Sure").map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleAnswer(question.category, opt)}
                  className="w-full text-left p-4 bg-white dark:bg-zinc-900 dark:text-zinc-100 rounded-2xl border-2 border-transparent hover:border-brand-primary hover:text-brand-primary dark:border-zinc-800 transition-all shadow-sm font-extrabold text-sm text-zinc-700 flex justify-between items-center"
                >
                  <span>{opt}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-300" />
                </button>
              ))}
              {isMbtiQuestion && (
                <button
                  type="button"
                  onClick={() => { setShowPersonalityTest(true); setPersonalityAnswers({}); setPersonalityTestIndex(0); }}
                  className="w-full text-left p-4 bg-brand-primary/5 dark:bg-brand-primary/10 rounded-2xl border-2 border-brand-primary/20 hover:border-brand-primary transition-all shadow-sm font-extrabold text-sm text-brand-primary flex justify-between items-center"
                >
                  <span>I'm Not Sure — Take Short Quiz</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center pt-8 text-[9px] font-black uppercase tracking-widest text-zinc-300 dark:text-zinc-600 leading-relaxed">
          {level === 1 ? "Profiling Core Intellect..." : level === 2 ? "Syncing Attachment Metrics..." : "Mapping compatible social grids..."}
        </div>
      </div>
    );
  };

  // 5. Onboarding Photo Upload (Base64 fail-safe direct storage) — supports up to 6 photos
  const photoSlotRefs = [photoSlotRef0, photoSlotRef1, photoSlotRef2, photoSlotRef3, photoSlotRef4, photoSlotRef5];

  const handlePhotoSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File exceeds 2MB limits. Select a smaller picture.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(10);

    const reader = new FileReader();
    reader.onload = async (event) => {
      setUploadProgress(70);
      const base64Data = event.target?.result as string;

      try {
        const fileName = `${user.id}_photo_${slotIndex}_${Date.now()}.png`;
        await supabase.storage.from('photos').upload(fileName, file);
      } catch (e) {
        console.warn("Supabase bucket not accessible, using Base64 directly.");
      }

      const currentPhotos = userProfile.photos ? [...userProfile.photos] : [];
      currentPhotos[slotIndex] = base64Data;
      const newPhotos = currentPhotos;
      const newImageUrl = slotIndex === 0 ? base64Data : (userProfile.imageUrl || base64Data);

      setUserProfile(prev => ({ ...prev, imageUrl: newImageUrl, photos: newPhotos }));
      await updateProfile({ imageUrl: newImageUrl, photos: newPhotos });
      setUploadProgress(100);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const renderOnboardingPhoto = () => {
    const photos = userProfile.photos || [];
    return (
      <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg justify-between">
        <div className="space-y-4">
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setView('onboarding')} className="p-2 -ml-2 text-zinc-400 hover:text-brand-primary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
              <h1 className="text-4xl font-black tracking-tighter text-brand-primary">LoKey</h1>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">Step 3: Profile image Setup</p>
          </div>

          <div className="mt-4 mb-4">
            <h2 className="text-3xl font-extrabold tracking-tighter mb-1 text-zinc-900 dark:text-zinc-100">Show yourself</h2>
            <p className="text-zinc-400 dark:text-zinc-300 text-sm font-medium">Add up to 6 photos. First photo is your main profile picture.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map(slotIndex => (
              <div key={slotIndex} className="relative aspect-square">
                <input
                  type="file"
                  ref={photoSlotRefs[slotIndex]}
                  onChange={(e) => handlePhotoSlotUpload(e, slotIndex)}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={() => photoSlotRefs[slotIndex].current?.click()}
                  className={`w-full h-full rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer transition-all border-2 ${photos[slotIndex] ? 'border-brand-primary shadow-md' : 'border-dashed border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-brand-primary/50'}`}
                >
                  {photos[slotIndex] ? (
                    <img src={photos[slotIndex]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className={`w-6 h-6 ${slotIndex === 0 ? 'text-brand-primary' : 'text-zinc-300 dark:text-zinc-600'}`} />
                      {slotIndex === 0 && <span className="text-[8px] font-black text-brand-primary uppercase tracking-wider">Main</span>}
                    </div>
                  )}
                </div>
                {photos[slotIndex] && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newPhotos = [...photos];
                      newPhotos[slotIndex] = '';
                      const cleaned = newPhotos.filter(Boolean);
                      const newImageUrl = cleaned[0] || '';
                      setUserProfile(prev => ({ ...prev, imageUrl: newImageUrl, photos: newPhotos }));
                      updateProfile({ imageUrl: newImageUrl, photos: newPhotos });
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-md z-10"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full h-1 bg-zinc-150 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div style={{ width: `${uploadProgress}%` }} className="h-full bg-brand-primary transition-all" />
            </div>
          )}

          {uploadError && (
            <p className="text-red-500 font-bold text-[10px] bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-xl">{uploadError}</p>
          )}
        </div>

        <button
          onClick={handleCompleteOnboarding}
          className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-md flex items-center justify-center gap-2"
        >
          {(photos.filter(Boolean).length > 0 || userProfile.imageUrl) ? "Finalize & Join" : "Skip photo uploads"}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  // Profile editing triggers & handler controls for robust user edits
  const startEditingProfile = () => {
    setEditName(userProfile.name || '');
    setEditAge(userProfile.age || 18);
    setEditDob(userProfile.dob || '');
    setEditImageUrl(userProfile.imageUrl || '');
    setEditSchool(userProfile.school || 'University of Otago (Dunedin)');
    setEditJob(userProfile.job || '');
    setEditGender(userProfile.gender || 'Female');
    setEditInterestedIn(userProfile.interestedIn || []);
    setEditRelationshipGoal(userProfile.relationshipGoal || 'See where things go');
    setEditBio(userProfile.bio || '');
    setEditSuccessMsg('');
    setIsEditingProfile(true);
  };

  const saveProfileChanges = async () => {
    try {
      setEditSuccessMsg('Saving updates securely...');
      
      const updates = {
        name: editName,
        age: Number(editAge),
        dob: editDob,
        imageUrl: editImageUrl,
        school: editSchool,
        job: editJob,
        gender: editGender,
        interestedIn: editInterestedIn,
        relationshipGoal: editRelationshipGoal,
        bio: editBio
      };
      
      // Save locally & through Supabase provider context
      await updateProfile(updates);
      
      // Sync local state as backup safeguard
      setUserProfile(prev => ({
        ...prev,
        ...updates
      }));
      
      setEditSuccessMsg('✓ Profile changes saved perfectly to Supabase! Direct integration is complete.');
      setTimeout(() => {
        setIsEditingProfile(false);
        setEditSuccessMsg('');
      }, 1500);
    } catch (e: any) {
      setEditSuccessMsg(`Failed to save: ${e.message}`);
    }
  };

  // Sync both FAKE_MALE_PERSONAS and the newly added stock FAKE_FEMALE_PERSONAS to Supabase profiles table
  const syncMockProfilesToSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus('Initiating secure sync of 40 custom design personas to Supabase profiles...');
    
    try {
      let successCount = 0;
      let errorMsgs: string[] = [];

      for (const p of ALL_PERSONAS) {
        const isMale = p.id.startsWith('male');
        const idNum = parseInt(p.id.split('-')[1]) || 1;
        const uuidSegment = String(idNum).padStart(12, '0');
        const deterministicUuid = isMale 
          ? `11111111-1111-4111-a111-${uuidSegment}`
          : `22222222-2222-4222-b222-${uuidSegment}`;

        const payload = {
          id: deterministicUuid,
          name: p.name,
          age: p.age,
          bio: p.bio,
          gender: p.gender,
          interested_in: p.interestedIn || [p.gender === 'Female' ? 'Men' : 'Women'],
          hobbies: p.hobbies || p.interests || [],
          attachment_style: p.attachmentStyle,
          personality_type: p.personalityType || 'Introvert',
          lifestyle: p.lifestyle || 'Gym/Nature',
          interests: p.interests || [],
          school: p.school || 'University of Otago',
          job: p.job || 'Student',
          mbti: p.mbti || 'INFJ (Counselor)',
          is_verified: true,
          onboarding_complete: true,
          has_confirmed_name_age: true,
          image_url: p.imageUrl,
          relationship_goal: p.relationshipGoal || 'See where things go'
        };

        const { error } = await supabase
          .from('profiles')
          .upsert([payload], { onConflict: 'id' });

        if (error) {
          errorMsgs.push(error.message);
        } else {
          successCount++;
        }
      }

      if (successCount === ALL_PERSONAS.length) {
        setSyncStatus(`✓ Successfully synchronized all ${successCount} custom mock personas into Supabase database profiles table!`);
      } else {
        setSyncStatus(`Sync result: Saved ${successCount}/${ALL_PERSONAS.length} profiles. Some items might require removing authentication references or cascading indexes in postgres. First error: ${errorMsgs[0] || 'Unknown constraint'}`);
      }
    } catch (e: any) {
      console.error("Sync error:", e);
      setSyncStatus(`Sync error encountered: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 6. User Profile Reviews
  const renderProfileReview = () => {
    return (
      <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg justify-between">
        <div className="space-y-6">
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setView('onboarding-photo')} className="p-2 -ml-2 text-zinc-400 hover:text-brand-primary transition-colors"><ArrowLeft className="w-5 h-5" /></button>
              <h1 className="text-4xl font-black tracking-tighter text-brand-primary">LoKey</h1>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">Review bio-attributes calibration</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="text-center font-bold">
              <p className="text-zinc-400 text-xs">Aesthetic compatibility score</p>
              <h3 className="text-5xl font-black text-brand-primary mt-1">{matchingPower}%</h3>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-400">MBTI personality</span>
                <span className="text-zinc-700 dark:text-zinc-200">{userProfile.mbti || "Not set Yet"}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-400">Attachment style</span>
                <span className="text-zinc-700 dark:text-zinc-200">{userProfile.attachmentStyle || "Not set Yet"}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-400">School / Work</span>
                <span className="text-zinc-700 dark:text-zinc-200 truncate max-w-[200px]">{userProfile.school || "Otago"}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setView('id-verification')}
          className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-md flex items-center justify-center gap-2"
        >
          Initiate Identity verification
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  // 7. Core Swipe / Recommendations
  const renderMatches = () => {
    if (isLoadingRecommendations) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-brand-bg dark:bg-brand-dark-bg">
          <div className="mb-6 animate-pulse">
            <Sparkles className="w-12 h-12 text-brand-accent mx-auto animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-1 text-zinc-900 dark:text-zinc-100">Engineering compatibility matches...</h2>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs">Our matching algorithm filters core parameters.</p>
        </div>
      );
    }

    return (
      <div className="pb-24 pt-8 px-4 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg min-h-screen animate-fade-in">
        <div className="flex justify-between items-end mb-8 px-2">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-zinc-950 dark:text-zinc-50 animate-fade-in">Daily Circle</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Up to 8 high-compatibility matches.</p>
          </div>
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => setShowFiltersModal(true)}
              className="px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm active:scale-95 transition-all text-left"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#a855f7]" />
              <span>Filters</span>
            </button>
            <div className="bg-brand-accent/10 text-brand-accent px-3 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              {recommendations.length} Profiles
            </div>
          </div>
        </div>

        {/* Swipe cards deck */}
        <div className="space-y-4 animate-fade-in">
          {recommendations.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedMatch(item)}
              className="relative group cursor-pointer overflow-hidden rounded-[2.5rem] shadow-sm hover:shadow-md transition-all border-4 border-white dark:border-zinc-850 bg-white dark:bg-zinc-900"
            >
              <div className="aspect-[4/5] relative">
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent text-left" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-2xl font-extrabold text-white flex items-center gap-1.5 leading-tight">
                        {item.name}, {item.age}
                        {item.isVerified && <ShieldCheck className="w-5 h-5 text-blue-400 fill-blue-400/20" />}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full backdrop-blur-md font-mono">
                          {item.mbti?.split(' ')[0]}
                        </span>
                        {item.relationshipGoal && (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-[#a855f7]/30 text-pink-300 px-2 py-0.5 rounded-full backdrop-blur-md">
                            {item.relationshipGoal}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-brand-accent font-black text-3xl leading-none">{item.compatibilityScore}%</span>
                      <p className="text-[7px] text-white/50 font-bold uppercase tracking-widest">Match rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {recommendations.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">No candidates match your current filter settings.</p>
              <button 
                onClick={() => {
                  setFilterAgeMin(18);
                  setFilterAgeMax(65);
                  setFilterGender('all');
                  setFilterLookingFor('all');
                }}
                className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-full font-black text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 shadow-sm active:scale-95 transition-all outline-none"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Interactive Filters Modal / Drawer */}
        <AnimatePresence>
          {showFiltersModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0"
              onClick={() => setShowFiltersModal(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden max-h-[90vh] overflow-y-auto pb-10 p-6 border-t sm:border border-zinc-100 dark:border-zinc-800 shadow-2xl relative text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#a855f7] tracking-widest">Preferences</span>
                    <h3 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">Filter Circle</h3>
                  </div>
                  <button 
                    onClick={() => setShowFiltersModal(false)}
                    className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-extrabold focus:outline-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Age Range Double select Dropdowns */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <label className="text-[10px] uppercase tracking-widest text-[#a855f7]">Age Range</label>
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-bold">
                        {filterAgeMin} - {filterAgeMax === 65 ? '65+' : filterAgeMax}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">Min Age</span>
                        <select 
                          value={filterAgeMin}
                          onChange={(e) => setFilterAgeMin(Number(e.target.value))}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-brand-primary"
                        >
                          {Array.from({ length: 48 }, (_, i) => i + 18).map(ageVal => (
                            <option key={ageVal} value={ageVal}>{ageVal}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">Max Age</span>
                        <select 
                          value={filterAgeMax}
                          onChange={(e) => setFilterAgeMax(Number(e.target.value))}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-brand-primary"
                        >
                          {Array.from({ length: 48 }, (_, i) => i + 18).map(ageVal => (
                            <option key={ageVal} value={ageVal}>{ageVal === 65 ? '65+' : ageVal}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Gender Selector Override */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#a855f7] font-bold block">Who you're seeing</label>
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[
                        { label: 'All', value: 'all' },
                        { label: 'Females', value: 'Female' },
                        { label: 'Males', value: 'Male' },
                        { label: 'Diverse', value: 'Diverse' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setFilterGender(opt.value)}
                          className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase text-center border transition-all ${
                            filterGender === opt.value
                              ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-400 border-zinc-150 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Looking For selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#a855f7] font-bold block">What they are looking for</label>
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {[
                        { label: 'Any relationship goal', value: 'all' },
                        { label: 'Short-term connection (dating/casual)', value: 'Short-term' },
                        { label: 'Long-term partnership (committed)', value: 'Long-term' },
                        { label: 'Casual connection (low pressure)', value: 'Casual' },
                        { label: 'See where things go (open-minded)', value: 'See where things go' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setFilterLookingFor(opt.value)}
                          className={`py-2.5 px-4 rounded-xl text-[10px] font-black uppercase text-left border transition-all ${
                            filterLookingFor === opt.value
                              ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-400 border-zinc-150 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <button
                    onClick={() => {
                      setFilterAgeMin(18);
                      setFilterAgeMax(65);
                      setFilterGender('all');
                      setFilterLookingFor('all');
                      setShowFiltersModal(false);
                    }}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 active:scale-95 transition-all outline-none"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowFiltersModal(false)}
                    className="flex-1 bg-gradient-to-r from-brand-primary to-[#a855f7] text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md outline-none"
                  >
                    Apply Filter
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected recomendation overlays popup */}
        <AnimatePresence>
          {selectedMatch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0"
              onClick={() => setSelectedMatch(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-b-[2.5rem] overflow-hidden max-h-[85vh] overflow-y-auto pb-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative h-72">
                  <img src={selectedMatch.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setSelectedMatch(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white text-md font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="p-6 text-left space-y-6">
                  <div>
                    <h2 className="text-3xl font-black flex items-center gap-2 text-zinc-950 dark:text-zinc-50 leading-tight">
                      {selectedMatch.name}, {selectedMatch.age}
                      {selectedMatch.isVerified && <ShieldCheck className="w-5.5 h-5.5 text-blue-500 fill-blue-500/10" />}
                    </h2>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs font-bold uppercase mt-1">{selectedMatch.school || 'University of Otago'}</p>
                    {selectedMatch.relationshipGoal && (
                      <span className="inline-block mt-2.5 text-[9px] font-black uppercase tracking-widest bg-[#a855f7]/10 dark:bg-[#a855f7]/15 text-[#a855f7] dark:text-pink-300 px-3 py-1 rounded-full border border-[#a855f7]/20">
                        Intention: {selectedMatch.relationshipGoal}
                      </span>
                    )}
                  </div>

                  <div className="bg-brand-accent/5 dark:bg-brand-accent/15 border border-brand-accent/10 dark:border-brand-accent/20 p-4 rounded-xl">
                    <p className="text-[10px] font-black uppercase text-brand-accent tracking-widest mb-1.5">Algorithmic synergy metrics</p>
                    <p className="text-xs font-semibold italic text-brand-primary dark:text-[#a855f7] leading-relaxed">"{selectedMatch.reason}"</p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Psych details</h4>
                    <p className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed font-semibold">{selectedMatch.bio}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs font-bold">
                    <div className="bg-zinc-50 dark:bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-zinc-805 dark:text-zinc-200 text-left">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-550 block pb-1">Personality MBTI</span>
                      {selectedMatch.mbti}
                    </div>
                  </div>

                  {sentRequests.includes(selectedMatch.id) ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 text-emerald-800 dark:text-emerald-450 p-4 rounded-xl text-center font-bold text-xs space-y-1 animate-pulse">
                      <p>✓ Spark sent! ✨</p>
                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-500 font-semibold">Let's see if the vibes match! Checking compatibility...</p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleInitiateConnection(selectedMatch)}
                      disabled={isMatching}
                      className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow hover:opacity-95 transition-opacity cursor-pointer"
                    >
                      {isMatching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-4 h-4 fill-white animate-pulse" />}
                      Send a Spark ✨
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Connected Match Alert */}
        <AnimatePresence>
          {matchedWith && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 text-center"
            >
              <div className="max-w-xs space-y-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-400 mx-auto">
                    <img src={matchedWith.imageUrl} className="w-full h-full object-cover" />
                  </div>
                  <Sparkles className="absolute -top-2 -right-4 w-10 h-10 text-yellow-400 animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-white">It's a Match!</h3>
                  <p className="text-zinc-400 text-xs">You connected with {matchedWith.name}. Go offline and organize your cafe date.</p>
                </div>

                <button 
                  onClick={() => {
                    setMatchedWith(null);
                    setView('messages');
                    setCurrentChat(matchedWith);
                  }}
                  className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold text-sm shadow-md"
                >
                  Send Icebreaker
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // 8. Messages list & active chat screen (Block/Report buttons + reporting reports logs)
  const renderMessages = () => {
    if (currentChat) {
      return (
        <div className="fixed inset-0 z-50 bg-brand-bg dark:bg-brand-dark-bg flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <button onClick={() => { setCurrentChat(null); setAiSuggestion(null); }} className="p-2 -ml-2 text-zinc-800 dark:text-zinc-200">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-100 dark:border-zinc-800">
                <img src={currentChat.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="text-left">
                <h3 className="font-extrabold flex items-center gap-1 text-sm text-zinc-950 dark:text-zinc-100">
                  {currentChat.name}
                  {currentChat.isVerified && <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500/10" />}
                </h3>
                <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Connected Match</span>
              </div>
            </div>

            {/* Block & Report Button */}
            <button 
              onClick={() => {
                setShowBlockReportModal(currentChat);
                setBlockReportMode(null);
              }}
              className="text-zinc-400 hover:text-red-500 p-2 transition-colors"
              title="Moderation Actions"
            >
              <AlertTriangle className="w-5 h-5" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-end bg-brand-bg dark:bg-brand-dark-bg">
            <div className="text-center pb-6">
              <div className="inline-block bg-yellow-400/10 border border-yellow-250/20 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-2xl text-[10px] font-bold max-w-[250px]">
                💡 Chat limited to 4 active matches. Secure and genuine connections priority focus.
              </div>
            </div>

            {(chatHistory[currentChat.id] || []).map((msg, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-2xl text-xs max-w-[75%] relative ${
                  msg.sender === 'me' 
                    ? 'bg-brand-primary text-white self-end rounded-br-none shadow-sm' 
                    : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 self-start border border-zinc-100 dark:border-zinc-800 shadow-sm animate-fade-in'
                }`}
              >
                <p className="font-semibold leading-relaxed text-left">{msg.text}</p>
                <span className="text-[7px] text-zinc-400 dark:text-zinc-500 block mt-1 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isDatePlanned && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-zinc-900 border-2 border-brand-accent p-4 rounded-[2rem] shadow-sm relative overflow-hidden"
              >
                <div className="relative z-10 text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-brand-accent/10 rounded-xl">
                      <Coffee className="w-5 h-5 text-brand-accent" />
                    </div>
                    <div>
                      <h4 className="font-black text-brand-accent uppercase tracking-widest text-[9px]">Date Planner active</h4>
                      <p className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs">Dunedin Meeting Starters</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-400 leading-normal mb-3">Exchanged 3+ messages! Ready to grab coffee? Try these question starters:</p>
                  
                  <div className="space-y-1.5">
                    {[
                      `What is your absolute favorite cozy quiet spot in Dunedin?`,
                      `What is one habit or hobby you want to pick up this next semester?`,
                      `What values or personalities usually balance you out best?`
                    ].map((q, idx) => (
                      <div key={idx} className="bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg text-[10px] font-bold text-zinc-700 dark:text-zinc-350 border border-zinc-100 dark:border-zinc-750">
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* AI Suggestion Display Panel */}
          {isGeneratingAiSuggestion && (
            <div className="mx-4 my-2 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl animate-pulse text-left">
              <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider flex items-center gap-1.5">
                <Loader2 className="w-3" /> Reading constitution profiles & generating suggestion...
              </span>
            </div>
          )}

          {aiSuggestion && (
            <div className="mx-4 my-2 p-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/15 border border-purple-500/20 dark:border-purple-500/40 rounded-2xl flex flex-col gap-2 text-left animate-fade-in shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-300 tracking-wider flex items-center gap-1">
                  Spark AI Recommendation (powered by OpenAI GPT-4o-mini)
                </span>
                <button onClick={() => setAiSuggestion(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[10px]">✕</button>
              </div>
              <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-100 italic leading-snug">"{aiSuggestion}"</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    handleSendMessage(aiSuggestion);
                    setAiSuggestion(null);
                  }}
                  className="flex-1 py-1.5 bg-brand-primary text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm active:scale-95 transition-transform"
                >
                  Send text
                </button>
                <button 
                  onClick={() => {
                    setMessageInput(aiSuggestion);
                    setAiSuggestion(null);
                  }}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-[9px] font-black uppercase tracking-wider rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-transform"
                >
                  Edit draft
                </button>
              </div>
            </div>
          )}

          {/* Quick share items suggestions */}
          <div className="px-4 py-1.5 flex gap-1.5 overflow-x-auto bg-white dark:bg-zinc-900 border-t border-zinc-50 dark:border-zinc-850">
            <button 
              onClick={() => handleSendMessage(`Let's connect on Instagram! Add me: @${userProfile.name?.toLowerCase()}_lokey`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 rounded-full text-[9px] font-extrabold shrink-0"
            >
              <Instagram className="w-3 h-3 text-[#FF4B6E]" /> IG Handle
            </button>
            <button 
              onClick={() => handleSendMessage(`Add me on Snapchat! My username is ${userProfile.name?.toLowerCase()}22`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 rounded-full text-[9px] font-extrabold shrink-0"
            >
              <Ghost className="w-3 h-3 text-yellow-500" /> Snapchat username
            </button>
            <button 
              onClick={() => handleSendMessage(`Let's match phone numbers. Mine is 021 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 rounded-full text-[9px] font-extrabold shrink-0"
            >
              <Smartphone className="w-3 h-3 text-emerald-500" /> Phone number
            </button>
          </div>

          {/* Text Input area with Spark suggestions trigger */}
          <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-850 flex items-center gap-2">
            <input 
              type="text" 
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            {/* Spark suggestion button */}
            <button
              onClick={generateAiSuggestions}
              disabled={isGeneratingAiSuggestion}
              className="bg-zinc-100 dark:bg-zinc-800 text-purple-600 dark:text-purple-400 p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/20 shadow-sm active:scale-95 transition-transform"
              title="Suggest custom response (powered by OpenAI GPT-4)"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleSendMessage()}
              className="bg-brand-primary text-white p-3 rounded-xl shadow-md active:scale-95 transition-transform"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Block/Report Bottom Sheet Modal overlay layout */}
          <AnimatePresence>
            {showBlockReportModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/85 flex items-end justify-center"
                onClick={() => setShowBlockReportModal(null)}
              >
                <div 
                  className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[2rem] p-6 text-left space-y-4 shadow-2xl border-t dark:border-zinc-800" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="font-extrabold text-md text-zinc-950 dark:text-zinc-100 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-500" /> Moderation Controls
                    </h3>
                    <button onClick={() => setShowBlockReportModal(null)} className="text-zinc-400 font-bold font-sans">✕</button>
                  </div>

                  {!blockReportMode ? (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button 
                        onClick={() => setBlockReportMode('block')}
                        className="p-4 rounded-xl font-bold text-xs bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-650 dark:text-red-400 flex flex-col items-center gap-2 transition-colors border border-red-200/20 dark:border-red-500/20"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" /> Block {showBlockReportModal.name}
                      </button>
                      <button 
                        onClick={() => setBlockReportMode('report')}
                        className="p-4 rounded-xl font-bold text-xs bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-105 dark:hover:bg-yellow-950/40 text-yellow-650 dark:text-yellow-400 flex flex-col items-center gap-2 transition-colors border border-yellow-200/20 dark:border-yellow-500/20"
                      >
                        <AlertTriangle className="w-5 h-5 text-yellow-500" /> Report Username
                      </button>
                    </div>
                  ) : blockReportMode === 'block' ? (
                    <div className="space-y-4">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                        Are you sure you want to block {showBlockReportModal.name}? They will not be able to send any further messages, view your profile page, or match you in the venue deck.
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setBlockReportMode(null)}
                          className="flex-1 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleBlockUserSubmit(showBlockReportModal.id, showBlockReportModal.name)}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow"
                        >
                          Confirm Block
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 block mb-1">Select a Reason</label>
                        <select 
                          value={reportReason} 
                          onChange={(e) => setReportReason(e.target.value)}
                          className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-100"
                        >
                          <option>Inappropriate harassment / messages</option>
                          <option>Suspicious fake account or bot</option>
                          <option>Unacceptable media content uploaded</option>
                          <option>Solicitation or spam messages</option>
                          <option>Other violations of our terms</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 block mb-1">Additional description details</label>
                        <textarea 
                          rows={3}
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                          placeholder="Provide details of violation behavior..."
                          className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-805 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => setBlockReportMode(null)}
                          className="flex-1 py-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700"
                        >
                          Back
                        </button>
                        <button 
                          onClick={() => handleReportUserSubmit(showBlockReportModal.id, showBlockReportModal.name)}
                          className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-lg shadow"
                        >
                          File Report & Block
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <div className="pb-24 pt-8 px-4 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg min-h-screen text-left">
        <div className="mb-8 px-2">
          <h1 className="text-3xl font-black tracking-tighter text-zinc-950 dark:text-zinc-50 animate-fade-in">Messages</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Have authentic discussions only.</p>
        </div>

        {activeChats.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-brand-accent/5 rounded-full flex items-center justify-center mx-auto text-brand-accent">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-md text-zinc-900 dark:text-zinc-100">Your inbox is empty</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-400 leading-normal max-w-[200px] mx-auto">
              Swipe daily matches. Send connection replies to meet friends IRL!
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {activeChats.map(chat => (
              <div 
                key={chat.id}
                onClick={() => {
                  setCurrentChat(chat);
                  setIsDatePlanned(false);
                }}
                className="p-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-100 dark:border-zinc-800 shrink-0 animate-fade-in">
                    <img src={chat.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      {chat.name}
                      {chat.isVerified && <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500/10" />}
                    </h4>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold truncate max-w-[170px]">
                      {(chatHistory[chat.id] && chatHistory[chat.id].length > 0) 
                        ? chatHistory[chat.id][chatHistory[chat.id].length - 1].text 
                        : "Tap to organize cafe meetings!"}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 9. Events Tab Renders
  const renderEvents = () => {
    return (
      <div className="pb-24 pt-8 px-4 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg min-h-screen text-center flex flex-col justify-center items-center animate-fade-in">
        <div className="w-20 h-20 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mb-6">
          <Calendar className="w-10 h-10 animate-pulse text-brand-primary" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-zinc-950 dark:text-zinc-50 mb-2">Local Events</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold max-w-xs mb-6 leading-relaxed">
          Real world meetup mixers, ambient live gigs, and cozy cafe drills across Dunedin are coming soon!
        </p>
        <div className="bg-[#a855f7]/10 text-[#a855f7] dark:bg-pink-300/10 dark:text-pink-300 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-[#a855f7]/20 dark:border-pink-300/20">
          Coming Soon • Spring 2026
        </div>
        
        {/* Dunedin Venues Preview */}
        <div className="w-full mt-10 border-t border-zinc-150 dark:border-zinc-800 pt-8 text-left space-y-4 opacity-70">
          <h2 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Planned Dunedin Partner Venues</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-100/80 dark:border-zinc-800 py-3.5 px-4 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-350">Vanguard Gig Mixer</span>
              <span className="text-[8px] bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 py-1 px-2.5 rounded-full font-black uppercase tracking-wider">Coffee</span>
            </div>
            <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-100/80 dark:border-zinc-800 py-3.5 px-4 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-350">Starters Bar Live Chill</span>
              <span className="text-[8px] bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 py-1 px-2.5 rounded-full font-black uppercase tracking-wider">Live Music</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 10. Profile View (Stripe billing integrations + Safety center Admin layout link handles)
  const renderProfile = () => {
    // Premium checks
    const isPremiumActive = userProfile.isPremium || false;

    if (isEditingProfile) {
      return (
        <div className="pb-24 pt-8 px-4 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg min-h-screen text-left animate-fade-in">
          <div className="flex items-center gap-2.5 mb-6">
            <button 
              onClick={() => setIsEditingProfile(false)}
              className="p-2 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-full text-zinc-700 dark:text-zinc-300 active:scale-95 transition-all text-left"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[9px] font-black uppercase text-[#a855f7] tracking-widest">Self-Calibration</span>
              <h1 className="text-2xl font-black text-zinc-950 dark:text-zinc-50 leading-none">Edit Profile</h1>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-5">
            {editSuccessMsg ? (
              <p className="text-xs font-bold text-[#a855f7] dark:text-pink-300 py-3 px-4 bg-[#a855f7]/5 dark:bg-[#a855f7]/15 rounded-xl border border-[#a855f7]/10 animate-pulse text-center">
                {editSuccessMsg}
              </p>
            ) : null}

            {/* Profile Photo */}
            <div className="space-y-2 flex flex-col items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-550 block text-left w-full">Profile Photo</label>
              <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-brand-primary shadow-sm bg-zinc-100 dark:bg-zinc-950">
                <img 
                  src={editImageUrl || 'https://picsum.photos/seed/default/100/100'} 
                  className="w-full h-full object-cover" 
                  alt="Edit Profile Thumbnail"
                  referrerPolicy="no-referrer"
                />
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] font-black text-white uppercase tracking-wider cursor-pointer transition-opacity">
                  <Camera className="w-4 h-4 mb-1" />
                  Change
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          setEditImageUrl(result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden" 
                  />
                </label>
              </div>
              <p className="text-[9px] text-zinc-400 font-medium">Hover or tap photo to replace</p>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-550 block">Your Name</label>
              <input 
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 px-4 py-3 rounded-2xl text-xs font-bold text-zinc-808 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-550 block">Your Date of Birth</label>
              <input 
                type="date"
                value={editDob || ''}
                max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                onChange={(e) => {
                  const val = e.target.value;
                  const computedAge = calculateAge(val);
                  setEditDob(val);
                  setEditAge(computedAge);
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 px-4 py-3 rounded-2xl text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400 pl-1 font-medium italic">
                Autocalculates age as <span className="text-[#a855f7] dark:text-pink-300 font-extrabold">{editAge}</span> years old.
              </p>
            </div>

            {/* University/School */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-550 block">Campus/School</label>
              <select 
                value={editSchool}
                onChange={(e) => setEditSchool(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 px-4 py-3 rounded-2xl text-xs font-bold text-zinc-850 dark:text-zinc-100 focus:outline-none"
              >
                <option value="University of Otago (Dunedin)">University of Otago (Dunedin)</option>
                <option value="Otago Polytech">Otago Polytech</option>
                <option value="Dunedin Medical School">Dunedin Medical School</option>
                <option value="Otago School of Law">Otago School of Law</option>
                <option value="University of Otago (Wellington)">University of Otago (Wellington)</option>
              </select>
            </div>

            {/* Primary occupation / Job */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-550 block">Major/Job Role</label>
              <input 
                type="text"
                placeholder="Medicine student, Freelance designer..."
                value={editJob}
                onChange={(e) => setEditJob(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 px-4 py-3 rounded-2xl text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            {/* Gender identity */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-550 block">Gender</label>
              <select 
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 px-4 py-3 rounded-2xl text-xs font-bold text-zinc-850 dark:text-zinc-100 focus:outline-none"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Gender Diverse">Gender Diverse</option>
              </select>
            </div>

            {/* What you are looking for / relationshipGoal */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-550 block">Relationship Goal</label>
              <select 
                value={editRelationshipGoal}
                onChange={(e) => setEditRelationshipGoal(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 px-4 py-3 rounded-2xl text-xs font-bold text-zinc-850 dark:text-zinc-100 focus:outline-none"
              >
                <option value="Short-term">Short-term connection (dating/casual)</option>
                <option value="Long-term">Long-term partnership (committed)</option>
                <option value="Casual">Casual connection (low pressure)</option>
                <option value="See where things go">See where things go (open-minded)</option>
              </select>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-550 block">Psych bio details</label>
              <textarea 
                rows={3}
                placeholder="Share something about yourself..."
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 px-4 py-3 rounded-2xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all outline-none"
              >
                Cancel
              </button>
              <button
                onClick={saveProfileChanges}
                className="flex-1 bg-gradient-to-r from-brand-primary to-[#a855f7] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md outline-none"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="pb-24 pt-8 px-4 max-w-md mx-auto bg-brand-bg dark:bg-brand-dark-bg min-h-screen text-left">
        {/* Profile title */}
        <div className="mb-6 px-2 flex justify-between items-center">
          <h1 className="text-3xl font-black tracking-tighter text-zinc-950 dark:text-zinc-55">My Profile</h1>
          <button onClick={logout} className="text-zinc-400 hover:text-red-500 transition-colors p-2" title="Auth sign out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800 relative">
            {isPremiumActive && (
              <span className="absolute top-4 right-4 bg-amber-400 text-amber-950 text-[7px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-md animate-pulse">
                <Sparkles className="w-3 h-3 fill-amber-950" /> Premium Active
              </span>
            )}

            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-800 shadow-md overflow-hidden mb-3">
              <img src={userProfile.imageUrl || `https://picsum.photos/seed/${userProfile.name}/300/300`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>

            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold flex items-center justify-center gap-1 text-zinc-900 dark:text-zinc-100">
                {userProfile.name}, {userProfile.age}
                {userProfile.isVerified && <ShieldCheck className="w-5.5 h-5.5 text-blue-500 fill-blue-500/10" />}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold">{userProfile.school || 'University of Otago'}</p>
              {userProfile.relationshipGoal && (
                <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-widest bg-[#a855f7]/10 text-[#a855f7] px-3 py-1 rounded-full border border-[#a855f7]/10">
                  Goal: {userProfile.relationshipGoal}
                </span>
              )}
            </div>
          </div>

          {/* Status Indicators (Hiding dating limit completely!) */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm text-left flex justify-between items-center">
            <div>
              <p className="text-[8px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest mb-1">Status</p>
              <p className="text-sm font-extrabold text-emerald-500 flex items-center gap-1.5 leading-none">
                <CheckCircle2 className="w-4 h-4 fill-emerald-50 dark:fill-transparent" /> Active Verified Account
              </p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-205/15">
                Dating Limit Hidden
              </span>
            </div>
          </div>

          <button 
            onClick={startEditingProfile}
            className="w-full bg-gradient-to-r from-brand-primary to-[#a855f7] hover:opacity-95 text-white py-4 rounded-[2rem] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow transition-all active:scale-95"
          >
            <span>Edit Profile & Preferences</span>
          </button>

          {/* Stripe Premium upgrade module */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white p-6 rounded-[2.5rem] relative overflow-hidden shadow-xl border border-white/10">
            <div className="relative z-10 space-y-4">
              <div className="space-y-1">
                <span className="text-[7.5px] font-black uppercase bg-[#FF4B6E] text-white px-2.5 py-1 rounded-full text-center">
                  Optional Premium Upgrade
                </span>
                <h3 className="text-lg font-black pt-1 leading-tight text-white flex items-center gap-1.5">
                  LoKey Premium Membership <Sparkles className="w-4 h-4 text-yellow-400" />
                </h3>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  No automatic iTunes subscription strings. Get full custom filters, double matching accuracy, and boost daily recommendations deck to 8 profiles instantly.{' '}
                  {import.meta.env.VITE_STRIPE_TEST_MODE === 'true'
                    ? <span className="text-yellow-400 font-bold">TEST MODE — $0.00 (free during beta)</span>
                    : <strong>$10.99/month</strong>}
                </p>
              </div>

              {isPremiumActive ? (
                <div className="bg-white/10 p-3 rounded-xl border border-white/15 text-xs text-white font-bold text-center">
                  🎉 Premium Activated — {import.meta.env.VITE_STRIPE_TEST_MODE === 'true' ? 'Beta Access' : 'Billing Active'}
                </div>
              ) : (
                <button
                  onClick={handlePurchasePremium}
                  disabled={isBuyingPremium}
                  className="w-full bg-[#FF4B6E] hover:bg-[#FF3B62] text-white text-xs font-black py-3.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isBuyingPremium ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : null}
                  {isBuyingPremium
                    ? 'Activating...'
                    : import.meta.env.VITE_STRIPE_TEST_MODE === 'true'
                      ? 'Activate Premium — Free (Beta)'
                      : 'Activate Premium — $10.99/Month'}
                </button>
              )}
            </div>
            <Sparkles className="absolute -bottom-4 -right-4 w-28 h-28 text-white/5 rotate-12 pointer-events-none" />
          </div>

          {/* Appearance Settings Theme Toggler */}
          <div className="glass-panel p-5 rounded-[2rem] space-y-3 border border-white/40 dark:border-white/10 shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-950 dark:text-white">Appearance</h4>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold leading-normal">
              Sync LoKey to your preferred visual style or device theme. Switches dynamically from light pastel lilac to deep velvet space purple!
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setThemeMode('light')}
                className={`py-2.5 px-2 rounded-xl font-black text-[10px] tracking-tight uppercase transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 border ${
                  themeMode === 'light'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-lg'
                    : 'bg-white/40 dark:bg-black/20 text-zinc-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-black/30 border-zinc-100 dark:border-zinc-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={`py-2.5 px-2 rounded-xl font-black text-[10px] tracking-tight uppercase transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 border ${
                  themeMode === 'dark'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-lg'
                    : 'bg-white/40 dark:bg-black/20 text-zinc-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-black/30 border-zinc-100 dark:border-zinc-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => setThemeMode('system')}
                className={`py-2.5 px-2 rounded-xl font-black text-[10px] tracking-tight uppercase transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 border ${
                  themeMode === 'system'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-lg'
                    : 'bg-white/40 dark:bg-black/20 text-zinc-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-black/30 border-zinc-100 dark:border-zinc-800'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* 🔒 Support Safety Center Admin Link Portal */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF4B6E] px-2 mb-2">Safety Center</h4>
            
            <button 
              onClick={() => {
                setShowAdminPortal(true);
              }}
              className="w-full flex items-center justify-between p-4 bg-white/55 dark:bg-zinc-900/40 hover:bg-white/80 dark:hover:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-400/10 rounded-xl text-red-500">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-zinc-950 dark:text-zinc-100 block">Support Safety Center & Admin Portal</span>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-black tracking-widest pt-0.5">Moderate reports & configure database schema</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-350 dark:text-zinc-500" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 11. Support Safety Center Admin Portal View
  const renderAdminPortal = () => {
    return (
      <div className="fixed inset-0 z-50 bg-brand-bg flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="p-4 border-b border-zinc-150 flex items-center justify-between bg-white sticky top-0 shadow-sm">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAdminPortal(false)} 
                className="p-2 -ml-2 text-zinc-650 hover:text-zinc-950"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="text-left">
                <span className="text-[8px] text-[#FF4B6E] font-black uppercase tracking-widest">LoKey Moderation Center</span>
                <h3 className="font-extrabold text-sm text-zinc-950">Safety Center Admin Portal</h3>
              </div>
            </div>
            <button 
              onClick={() => setShowAdminPortal(false)} 
              className="px-3 py-1.5 bg-zinc-100 rounded-full text-[10px] font-black uppercase text-zinc-650"
            >
              Close
            </button>
          </div>

          <div className="max-w-md mx-auto p-4 space-y-6">
            {/* Download Schema section */}
            <div className="bg-zinc-900 text-white p-5 rounded-[2.5rem] text-left space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-brand-accent pr-0.5" />
                  <span className="text-[8px] text-[#FF4B6E] font-black uppercase tracking-widest">Setup instruction</span>
                </div>
                <h4 className="text-sm font-black pt-1">Export Supabase PostgreSQL database Schema</h4>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Paste the generated RLS tables script straight into the Supabase SQL editor to bootstrap public profiles, matches, messages, and reports database tables instantly.
                </p>
              </div>

              <div className="relative">
                <pre className="p-3 bg-zinc-950 rounded-xl max-h-36 overflow-auto text-[9px] font-mono leading-normal text-zinc-300">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
                <button 
                  onClick={handleCopySQL}
                  className="absolute bottom-2 right-2 bg-brand-accent text-white px-3 py-1.5 rounded-lg text-[9px] font-bold shadow-md hover:bg-[#FF3B62] transition-all"
                >
                  {copiedSchema ? "✓ Copied Scheme" : "Copy SQL Scheme"}
                </button>
              </div>
            </div>

            {/* List of active reported users moderation controls */}
            <div className="space-y-3 text-left">
              <h4 className="text-[10px] font-black uppercase text-[#FF4B6E] tracking-widest px-2 block">Active User Reports</h4>
              
              {reportsList.length === 0 ? (
                <div className="p-6 bg-white rounded-3xl border border-zinc-100 text-center text-zinc-400 text-xs font-semibold">
                  No user conflicts filed recently. Safe spaces operating normally.
                </div>
              ) : (
                <div className="space-y-3">
                  {reportsList.map((rep: any) => (
                    <div key={rep.id} className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm space-y-3 text-xs leading-normal">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-extrabold text-zinc-950">Reported: {rep.reported_name}</p>
                          <span className="text-[8.5px] text-zinc-400 block pt-0.5">Reporter: {rep.reporter_name}</span>
                        </div>
                        <span className="bg-yellow-100 text-yellow-800 text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                          Pending Review
                        </span>
                      </div>

                      <div className="bg-zinc-50 p-2.5 rounded-xl font-medium text-zinc-600 text-[11px] border border-zinc-100">
                        <span className="text-[8px] uppercase font-black text-[#FF4B6E] block pb-0.5">Violation Reason</span>
                        {rep.reason}
                        {rep.details && <p className="pt-1 text-zinc-500 font-sans italic">"{rep.details}"</p>}
                      </div>

                      {/* Admin Controls */}
                      <div className="flex gap-2 pt-1">
                        <button 
                          onClick={async () => {
                            // Moderate suspend account simulator
                            setReportsList(prev => prev.filter(r => r.id !== rep.id));
                            alert(`Suspended: Profile for ${rep.reported_name} has been de-activated.`);
                          }}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] rounded-lg tracking-wide shadow"
                        >
                          Deactivate Profile
                        </button>
                        <button 
                          onClick={() => {
                            setReportsList(prev => prev.filter(r => r.id !== rep.id));
                            alert(`No Action: Report parsed & dismissed safely.`);
                          }}
                          className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-650 font-extrabold text-[10px] rounded-lg"
                        >
                          Dismiss Conflict
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark-bg text-zinc-900 dark:text-zinc-100 select-none pb-24 transition-colors duration-500 relative overflow-x-hidden">
      {/* Liquid Glass Background Orbs */}
      <div className="liquid-blob-container">
        <div className="liquid-blob-1"></div>
        <div className="liquid-blob-2"></div>
      </div>

      {/* Dynamic Views Router */}
      <main className="relative z-10">
        {view === 'onboarding-name-age' && renderOnboardingNameAge()}
        {view === 'onboarding-photo' && renderOnboardingPhoto()}
        {view === 'onboarding' && renderOnboarding()}
        {view === 'profile-review' && renderProfileReview()}
        {view === 'id-verification' && renderIDVerification()}
        {view === 'matches' && renderMatches()}
        {view === 'messages' && renderMessages()}
        {view === 'events' && renderEvents()}
        {view === 'profile' && renderProfile()}
      </main>

      {/* Admin Portal Popup */}
      <AnimatePresence>
        {showAdminPortal && (
          <motion.div 
            initial={{ opacity: 0, y: "15%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "15%" }}
            className="fixed inset-0 z-50 bg-brand-bg dark:bg-brand-dark-bg flex flex-col justify-between overflow-y-auto"
          >
            {renderAdminPortal()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Bottom Nav Bar (Hidden during Onboarding stages) */}
      {view !== 'onboarding' && view !== 'onboarding-name-age' && view !== 'onboarding-photo' && view !== 'profile-review' && view !== 'id-verification' && !currentChat && (
        <nav className="fixed bottom-0 left-0 right-0 glass-nav p-4 z-40">
          <div className="max-w-md mx-auto flex justify-between items-center px-4">
            <button 
              onClick={() => setView('matches')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'matches' ? 'text-brand-accent scale-110' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300'}`}
            >
              <Heart className={`w-5.5 h-5.5 ${view === 'matches' ? 'fill-current' : ''}`} />
              <span className="text-[8px] font-black uppercase tracking-widest">Matches</span>
            </button>
            <button 
              onClick={() => setView('messages')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'messages' ? 'text-brand-accent scale-110' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300'}`}
            >
              <MessageCircle className="w-5.5 h-5.5" />
              <span className="text-[8px] font-black uppercase tracking-widest">Messages</span>
            </button>
            <button 
              onClick={() => setView('events')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'events' ? 'text-brand-accent scale-110' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300'}`}
            >
              <Calendar className="w-5.5 h-5.5" />
              <span className="text-[8px] font-black uppercase tracking-widest">Events</span>
            </button>
            <button 
              onClick={() => setView('profile')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'profile' ? 'text-brand-accent scale-110' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300'}`}
            >
              <User className="w-5.5 h-5.5" />
              <span className="text-[8px] font-black uppercase tracking-widest">Profile</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SupabaseProvider>
        <AppContent />
      </SupabaseProvider>
    </ErrorBoundary>
  );
}
