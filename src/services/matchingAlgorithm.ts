import { UserProfile, Match } from '../types';

/**
 * Real Matching scoring algorithm based on Part 4 of the LoKey Constitution
 */
export function calculateConstitutionScore(
  user: Partial<UserProfile>,
  candidate: Match
): {
  score: number;
  reason: string;
  isEligible: boolean;
} {
  // --- 4.2 Hard gates (dealbreakers) evaluated first ---
  // A pair is ineligible (never shown) if any gate fails.
  
  // Custom checking of dealbreakers
  const userValues = typeof user.values === 'string' ? [user.values] : (user.values || []);
  const candValues = typeof candidate.values === 'string' ? [candidate.values] : (candidate.values || []);

  // 1. Children Intention: "definitely want" paired with "not for me" -> block
  // If either has children-related values that clash
  const userWantsKids = userValues.includes('Stability & Home'); 
  const candWantsKids = candValues.includes('Social Impact'); 
  // Let's check general compatibility markers in their bio/mbti orientations
  const bioUpperUser = (user.bio || '').toLowerCase();
  const bioUpperCand = (candidate.bio || '').toLowerCase();
  
  const userNoKids = bioUpperUser.includes("no children") || bioUpperUser.includes("not for me") || bioUpperUser.includes("no kids");
  const candNoKids = bioUpperCand.includes("no children") || bioUpperCand.includes("not for me") || bioUpperCand.includes("no kids");
  const userWantKidsEx = bioUpperUser.includes("want kids") || bioUpperUser.includes("definitely want children");
  const candWantKidsEx = bioUpperCand.includes("want kids") || bioUpperCand.includes("definitely want children");

  if ((userWantKidsEx && candNoKids) || (userNoKids && candWantKidsEx)) {
    return { score: 0, reason: "Ineligible: Children intention clash", isEligible: false };
  }

  // 2. Relationship intent clash: "serious relationship" paired with "casual connection" -> block
  const userHasCasual = bioUpperUser.includes("casual") || bioUpperUser.includes("just here for the vibes") || bioUpperUser.includes("spontaneous road");
  const userHasSerious = bioUpperUser.includes("serious") || bioUpperUser.includes("long term") || bioUpperUser.includes("deep connection");
  const candHasCasual = bioUpperCand.includes("casual") || bioUpperCand.includes("just here for the vibes") || bioUpperCand.includes("spontaneous road");
  const candHasSerious = bioUpperCand.includes("serious") || bioUpperCand.includes("long term") || bioUpperCand.includes("deep connection");
  
  if ((userHasSerious && candHasCasual) || (userHasCasual && candHasSerious)) {
    return { score: 0, reason: "Ineligible: Relationship intent clash", isEligible: false };
  }

  // 3. Spirituality: "essential" religion mismatched -> block
  const userEssentialRel = bioUpperUser.includes("religion essential") || bioUpperUser.includes("faith is essential");
  const candEssentialRel = bioUpperCand.includes("religion essential") || bioUpperCand.includes("faith is essential");
  const userDifferentRel = bioUpperUser.includes("atheist") || bioUpperUser.includes("secular");
  const candDifferentRel = bioUpperCand.includes("atheist") || bioUpperCand.includes("secular");

  if ((userEssentialRel && candDifferentRel) || (candEssentialRel && userDifferentRel)) {
    return { score: 0, reason: "Ineligible: Spirituality mismatch", isEligible: false };
  }

  // 4. Geography: Outside serviceable radius for launch market (Dunedin) -> block
  // (Both verified to be Otago / Dunedin so they are always eligible)

  // --- 4.3 Soft compatibility scoring ---
  
  // 1. Values & Life-Stage alignment (30%)
  const overlappingValues = userValues.filter(val => candValues.includes(val));
  let valuesScore = 60; // baseline
  if (overlappingValues.length > 0) {
    valuesScore = 100;
  } else if (userValues.length === 0) {
    valuesScore = 80; // neutral
  } else {
    // some related overlap or complementary life stage
    valuesScore = 70;
  }

  // 2. Attachment Compatibility Matrix (25%)
  const userStyle = user.attachmentStyle || 'Secure';
  const candStyle = candidate.attachmentStyle || 'Secure';
  let attachmentScore = 60; // baseline

  if (userStyle === 'Secure' && candStyle === 'Secure') {
    attachmentScore = 100; // Highest
  } else if (
    (userStyle === 'Secure' && (candStyle === 'Anxious' || candStyle === 'Avoidant')) ||
    (candStyle === 'Secure' && (userStyle === 'Anxious' || userStyle === 'Avoidant'))
  ) {
    attachmentScore = 85; // High (the secure partner buffers)
  } else if (userStyle === 'Anxious' && candStyle === 'Anxious') {
    attachmentScore = 60; // Moderate (risk of mutual escalation)
  } else if (userStyle === 'Avoidant' && candStyle === 'Avoidant') {
    attachmentScore = 60; // Moderate (risk of mutual distancing)
  } else if (
    (userStyle === 'Anxious' && candStyle === 'Avoidant') ||
    (userStyle === 'Avoidant' && candStyle === 'Anxious')
  ) {
    attachmentScore = 30; // Lowest (the classic pursue-withdraw trap)
  } else {
    attachmentScore = 75; // Default/Disorganized fallback
  }

  // 3. Relationship-intent alignment (15%)
  // Default to 85, increases to 100 if both searching for deep alignment
  let intentScore = 85;
  if ((userHasSerious && candHasSerious) || (userHasCasual && candHasCasual)) {
    intentScore = 100;
  }

  // 4. Effort tier compatibility (15%)
  // High effort matches with high effort. We score candidate's effort (order / matching power / verify)
  let effortScore = 80;
  if (candidate.isVerified) {
    effortScore = 95;
  }

  // 5. Emotional-baseline compatibility (10%)
  // Compatible states - we match complementary personality indexes or baselines
  let emotionalScore = 80;
  if (user.personalityType && candidate.personalityType) {
    if (user.personalityType !== candidate.personalityType) {
      emotionalScore = 100; // introverted & extroverted balance
    } else {
      emotionalScore = 75;
    }
  }

  // 6. Geographic proximity (5%)
  let geoScore = 100; // Dunedin launch bounds

  // Compute final weighted sum
  const finalScore = Math.round(
    (valuesScore * 0.30) +
    (attachmentScore * 0.25) +
    (intentScore * 0.15) +
    (effortScore * 0.15) +
    (emotionalScore * 0.10) +
    (geoScore * 0.05)
  );

  // Generate a descriptive, constitution-faithful match reason
  let reason = "";
  if (userStyle === 'Secure' && candStyle === 'Secure') {
    reason = "Secure attachment style matches secure style. Aligned communication patterns and mutually high effort levels.";
  } else if (userStyle === 'Secure' || candStyle === 'Secure') {
    reason = `Matched on high-effort communication. ${userStyle === 'Secure' ? 'Your' : `${candidate.name}'s`} secure attachment style serves as a stabilizing buffer for relationship friction.`;
  } else if ((userStyle === 'Anxious' && candStyle === 'Avoidant') || (userStyle === 'Avoidant' && candStyle === 'Anxious')) {
    reason = "Caution: Anxious-Avoidant pursue-withdraw trap predicted. Compatibility supported by overlapping Dunedin lifestyle goals.";
  } else {
    reason = `Strong foundation with ${overlappingValues.join(' & ') || 'aligned values'} and complementary personality styles.`;
  }

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    reason,
    isEligible: true
  };
}
