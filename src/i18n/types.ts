/**
 * Isomorphic i18n Types and Interfaces (src/i18n/types.ts)
 */

export type SupportedLocale = "zh-CN" | "en-US";
export const DEFAULT_LOCALE: SupportedLocale = "zh-CN";

export function normalizeLocale(raw?: string | null): SupportedLocale {
  if (!raw) return DEFAULT_LOCALE;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.startsWith("zh")) return "zh-CN";
  if (trimmed.startsWith("en")) return "en-US";
  return DEFAULT_LOCALE;
}

export interface SkillItemTranslation {
  name: string;
  type: string;
  desc: string;
}

export interface ArchetypeTranslation {
  role_title: string;
  praise_tagline: string;
  strength_tags: string[];
  empowering_feedback: string;
  growth_advice: string;
  clinical_summary: string;
  critical_weakness: string;
  skills: SkillItemTranslation[];
}

export interface AppDictionary {
  appTitle: string;
  appSubtitle: string;
  voyageProgress: string;
  welcomeBadge: string;
  welcomeTitle: string;
  welcomeDesc: string;
  explorerNameLabel: string;
  randomCodenameBtn: string;
  placeholderCodename: string;
  voyageScaleLabel: string;
  scale30: string;
  scale16: string;
  startVoyageBtn: string;
  startingVoyage: string;
  clue1Title: string;
  clue2Title: string;
  cost1Pt: string;
  cost2Pt: string;
  hintHint0: string;
  hintHintN: string;
  buyClue1Btn: string;
  buyClue2Btn: string;
  cluesAllUnlocked: string;
  instinctPrompt: string;
  instinctShortcuts: string;
  highBetTitle: string;
  highBetDesc: string;
  safeBetTitle: string;
  safeBetDesc: string;
  selectOptionFirst: string;
  recordingImpression: string;
  castingCard: string;
  finishVoyageBtn: string;
  nextTrialBtn: string;
  shortcutsGuide: string;
  archetypeCardHeader: string;
  explorerPrefix: string;
  soulResonance: string;
  innateSkills: string;
  arsenalSubtitle: string;
  strategicAdvice: string;
  restartVoyage: string;
  orientalPosterBtn: string;
  shareBtn: string;
  posterModalTitle: string;
  copyCard: string;
  copiedAlert: string;
  footerText: string;
  startErrorFallback: string;
  networkErrorFallback: string;
  buyHintErrorFallback: string;
  selectOptionWarning: string;
  recordChoiceError: string;
  confirmDecisionError: string;
  generateReportError: string;
  fetchNextTrialError: string;
  permanentLinkTitle: string;
  permanentLinkDesc: string;
  copyReportLinkBtn: string;
  reportLinkCopiedToast: string;
  resumeLastReportBtn: string;
  resumeLastReportDesc: string;
  reportNotFoundTitle: string;
  reportNotFoundDesc: string;
  backToHomeBtn: string;
  reportLoadingText: string;
}

export interface I18nDictionary {
  locale: SupportedLocale;
  common: {
    systemTitle: string;
    confirm: string;
    cancel: string;
    loading: string;
    save: string;
    delete: string;
    back: string;
    close: string;
    score: string;
    trial: string;
    hints: string;
    language: string;
    zhCN: string;
    enUS: string;
  };
  archetypes: {
    SOVEREIGN: ArchetypeTranslation;
    ADAPTIVE_LEARNER: ArchetypeTranslation;
    VIGILANT_SENTINEL: ArchetypeTranslation;
    AUDACIOUS_PIONEER: ArchetypeTranslation;
    ANXIOUS_RETREATER: ArchetypeTranslation;
    BLIND_GAMBLER: ArchetypeTranslation;
    PRAGMATIC_ARBITRAGEUR: ArchetypeTranslation;
    STOCHASTIC_DRIFTER: ArchetypeTranslation;
  };
  manifolds: {
    baguaTitle: string;
    baguaDesc: string;
    domeTitle: string;
    domeDesc: string;
    compassTitle: string;
    compassDesc: string;
    sphericalTitle: string;
    sphericalDesc: string;
    rectangularTitle: string;
    rectangularDesc: string;
    tableTitle: string;
    tableDesc: string;
    astrolabeInnerSeal: string;
    astrolabeMiddleSeal: string;
    astrolabeOuterSeal: string;
    octantHouses: Record<string, string>;
  };
  tasks: {
    macroHintPrefix: string;
    microHintPrefix: string;
    eliminationDesc1: string;
    eliminationDesc2: string;
    combinedHintTier1Header: string;
    combinedHintTier2Header: string;
    optionLabel: string;
  };
  admin: {
    title: string;
    passwordPlaceholder: string;
    loginButton: string;
    searchPlaceholder: string;
    totalSessions: string;
    humanSessions: string;
    llmSessions: string;
    deleteConfirm: string;
    deleteSuccess: string;
    authError: string;
    exportCsv: string;
    viewDetails: string;
  };
  report: {
    title: string;
    subtitle: string;
    firstOrderAcc: string;
    secondOrderAcc: string;
    mRatio: string;
    calibrationBias: string;
    iveTitle: string;
    dStarTitle: string;
    coachability: string;
    strengthsTitle: string;
    skillsTitle: string;
    clinicalTruthTitle: string;
    growthTitle: string;
    playAgain: string;
    viewInAdmin: string;
  };
  app: AppDictionary;
  auth: {
    signIn: string;
    signOut: string;
    authModalTitle: string;
    authModalDesc: string;
    loginWithGithub: string;
    loginWithLinuxdo: string;
    loginWithGoogle: string;
    guestExplorer: string;
    loggedInAs: string;
    accountLinked: string;
    trustLevelLabel: string;
    noProvidersEnabled: string;
  };
  cli: {
    gameRules: string;
    step1Prompt: string;
    step1bPrompt: string;
    thinkingSinglePassPrompt: string;
    step1SchemaDesc: string;
    step1bSchemaDesc: string;
    choiceSchemaDesc: string;
    betActionSchemaDesc: string;
    betConfidenceSchemaDesc: string;
    buyHintToolDesc: string;
    buyHintTierDesc: string;
    buyHintAnalysisDesc: string;
  };
  legal: {
    privacyPolicy: string;
    termsOfService: string;
    lastUpdated: string;
    backToHome: string;
    agreementNotice: string;
  };
  profile: {
    title: string;
    subtitle: string;
    backToAssessment: string;
    historyTitle: string;
    timelineSubtitle: string;
    trajectoryTitle: string;
    trajectorySubtitle: string;
    evolutionTitle: string;
    evolutionSubtitle: string;
    statTotalSessions: string;
    statHumanSessions: string;
    statAgentSessions: string;
    statMeanAccuracy: string;
    statMeanDPrime: string;
    statMeanMRatio: string;
    statLatestBias: string;
    statDominantArchetype: string;
    tabAll: string;
    tabAccuracy: string;
    tabDiscrimination: string;
    tabMRatio: string;
    tabBias: string;
    filterAll: string;
    filterHuman: string;
    filterAgent: string;
    sortNewest: string;
    sortOldest: string;
    emptyTitle: string;
    emptyDesc: string;
    startAssessmentBtn: string;
    loginPromptTitle: string;
    loginPromptDesc: string;
    signInBtn: string;
    viewReport: string;
    shareCard: string;
    navLink: string;
    latestBadge: string;
    baselineNote: string;
  };
}
