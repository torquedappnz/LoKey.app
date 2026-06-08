import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Match } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const FALLBACK_MATCHES: Match[] = [
  {
    id: 'fallback-1',
    name: 'Bella',
    age: 21,
    isVerified: true,
    bio: 'Design student at Otago. Love deep house, vintage cameras, and finding the best coffee spots in Dunedin.',
    school: 'University of Otago',
    job: 'Creative',
    mbti: 'ENFP (Campaigner)',
    compatibilityScore: 94,
    reason: 'Shared creative energy and complementary attachment styles.',
    icebreaker: 'I saw you’re into professional growth—what’s the most interesting project you’ve worked on lately at Otago?',
    attachmentStyle: 'Secure',
    values: ['Creativity', 'Growth'],
    personalityType: 'Extrovert',
    lifestyle: 'Active',
    interests: ['Photography', 'Music'],
    imageUrl: `https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&h=800&q=80`,
    order: 0
  },
  {
    id: 'fallback-2',
    name: 'Jessica',
    age: 22,
    isVerified: true,
    bio: 'Med student. When I’m not studying, I’m probably at the gym or planning my next hiking trip.',
    school: 'University of Otago',
    job: 'Student',
    mbti: 'INTJ (Architect)',
    compatibilityScore: 88,
    reason: 'Your stability-focused values align perfectly with her disciplined lifestyle.',
    icebreaker: 'Hiking or gym? Or both? I’m curious what your favorite trail around Dunedin is.',
    attachmentStyle: 'Secure',
    values: ['Stability', 'Health'],
    personalityType: 'Introvert',
    lifestyle: 'Disciplined',
    interests: ['Hiking', 'Fitness'],
    imageUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=800&q=80`,
    order: 1
  },
  {
    id: 'fallback-3',
    name: 'Alyson',
    age: 20,
    isVerified: true,
    bio: 'Hospitality legend. I love people, good food, and spontaneous road trips.',
    school: 'Otago Polytechnic',
    job: 'Hospitality',
    mbti: 'ESFP (Entertainer)',
    compatibilityScore: 82,
    reason: 'Her high social energy balances your focused professional drive.',
    icebreaker: 'Working in hospo is a wild ride—what’s the funniest customer story you have?',
    attachmentStyle: 'Anxious',
    values: ['Social Connection', 'Adventure'],
    personalityType: 'Extrovert',
    lifestyle: 'Social',
    interests: ['Cooking', 'Travel'],
    imageUrl: `https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&h=800&q=80`,
    order: 2
  },
  {
    id: 'fallback-4',
    name: 'Stella',
    age: 23,
    isVerified: true,
    bio: 'Law grad. Passionate about social impact and sustainable living.',
    school: 'University of Otago',
    job: 'Professional',
    mbti: 'INFJ (Advocate)',
    compatibilityScore: 91,
    reason: 'Deep alignment on social impact values and long-term goals.',
    icebreaker: 'I love that you value social impact. Is there a specific cause you’re most passionate about right now?',
    attachmentStyle: 'Secure',
    values: ['Social Impact', 'Sustainability'],
    personalityType: 'Introvert',
    lifestyle: 'Mindful',
    interests: ['Reading', 'Volunteering'],
    imageUrl: `https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&h=800&q=80`,
    order: 3
  },
  {
    id: 'fallback-5',
    name: 'Cassidy',
    age: 19,
    isVerified: true,
    bio: 'First year arts. Just here for the vibes and meeting cool people.',
    school: 'University of Otago',
    job: 'Student',
    mbti: 'INFP (Mediator)',
    compatibilityScore: 79,
    reason: 'Shared values in adventure and growth.',
    icebreaker: 'First year can be a lot! What’s been your favorite part of Dunedin so far?',
    attachmentStyle: 'Avoidant',
    values: ['Adventure', 'Growth'],
    personalityType: 'Introvert',
    lifestyle: 'Relaxed',
    interests: ['Art', 'Music'],
    imageUrl: `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&h=800&q=80`,
    order: 4
  }
];

export async function generateMatches(userProfile: Partial<UserProfile>): Promise<Match[]> {
  const valuesStr = Array.isArray(userProfile.values) 
    ? userProfile.values.join(", ") 
    : userProfile.values || "Not specified";

  const prompt = `
    You are the LoKey Matching Engine. Your goal is to find 5 highly compatible matches for a user based on their psychological profile.
    
    User Profile:
    - Age: ${userProfile.age}
    - School: ${userProfile.school}
    - Job: ${userProfile.job}
    - MBTI: ${userProfile.mbti}
    - Attachment Style: ${userProfile.attachmentStyle}
    - Values: ${valuesStr}
    
    Generate 5 fictional users who would be compatible with this person. 
    Crucially, all generated profiles MUST be female.
    Focus on:
    1. Complementary attachment styles.
    2. Shared core values.
    3. Lifestyle alignment.
    
    For each match, provide:
    - Name (female names)
    - Age (between 18-30)
    - Bio (engaging, Gen Z tone, emphasizing personality and values)
    - School
    - Job
    - MBTI
    - Compatibility Score (0-100)
    - A brief "Why we matched you" reason.
    - An "icebreaker": A unique, AI-guided conversation starter based on your shared values and personality types. It should be low-pressure and specific.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              age: { type: Type.NUMBER },
              bio: { type: Type.STRING },
              compatibilityScore: { type: Type.NUMBER },
              reason: { type: Type.STRING },
              icebreaker: { type: Type.STRING },
              attachmentStyle: { type: Type.STRING },
              values: { type: Type.ARRAY, items: { type: Type.STRING } },
              personalityType: { type: Type.STRING },
              lifestyle: { type: Type.STRING },
              interests: { type: Type.ARRAY, items: { type: Type.STRING } },
              school: { type: Type.STRING },
              job: { type: Type.STRING },
              mbti: { type: Type.STRING },
            },
            required: ["name", "age", "bio", "compatibilityScore", "reason", "icebreaker"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    
    const unsplashIds = [
      '1494790108377-be9c29b29330', // Attractive woman 1
      '1534528741775-53994a69daeb', // Attractive woman 2
      '1517841905240-472988babdf9', // Attractive woman 3
      '1524504388940-b1c1722653e1', // Attractive woman 4
      '1506794778202-cad84cf45f1d'  // Attractive woman 5
    ];

    const aiMatches = data.map((m: any, i: number) => ({
      ...m,
      id: `match-${Date.now()}-${i}`,
      isVerified: true,
      imageUrl: `https://images.unsplash.com/photo-${unsplashIds[i % unsplashIds.length]}?auto=format&fit=crop&w=600&h=800&q=80`,
      order: i + 5
    }));

    // Return fallback matches first, then AI matches
    return [...FALLBACK_MATCHES, ...aiMatches];
  } catch (error) {
    console.error("Error generating matches, using fallback:", error);
    return FALLBACK_MATCHES;
  }
}

export async function generateIntroVideo(): Promise<string> {
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: 'A cinematic, warm-toned video of two young adults meeting at a cozy outdoor cafe, laughing and talking deeply, no phones in sight, focusing on genuine human connection and compatibility. High quality, 1080p.',
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  return operation.response?.generatedVideos?.[0]?.video?.uri || "";
}
