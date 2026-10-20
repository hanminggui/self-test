import type { I18nDictionary } from "../types";

export const enUS: I18nDictionary = {
  locale: "en-US",
  common: {
    systemTitle: "Metacognitive Evaluation System",
    confirm: "Confirm",
    cancel: "Cancel",
    loading: "Loading...",
    save: "Save",
    delete: "Delete",
    back: "Back",
    close: "Close",
    score: "Current Score",
    trial: "Trial",
    hints: "Hints",
    language: "Language",
    zhCN: "简体中文",
    enUS: "English",
  },
  archetypes: {
    SOVEREIGN: {
      role_title: "The Grand Archmage",
      praise_tagline: "Sight Beyond the Veil · Unerring Decree",
      strength_tags: ["Omniscient Mastery", "Dimensional Mana Dominance", "Absolute Epistemic Coherence", "Surgical Arcane Will"],
      empowering_feedback:
        "You embody the extraordinary prowess of a Grand Archmage seated in the highest tower! Possessing immense foundational depth in high-order abstract deduction, you pair raw intellect with rare, exquisite second-order metacognitive awareness. You know the exact contours of your mental horizon—striking with unerring precision when certain, and refusing to squander mana on reckless gambles. This transcendent poise of 'knowing what you know' marks the true sovereign commander.",
      growth_advice:
        "Possessing holistic strategic vision and supreme clarity under pressure, you are ideally suited to command the vanguard in high-complexity, epoch-defining campaigns.",
      clinical_summary:
        "High first-order · High metacognitive · Flawless self-calibration. Formidable abstract deduction, superior Type-2 sensitivity, zero overbetting on errors, unhesitating conviction on successes. Optimum expected payoff.",
      critical_weakness: "Omniscient Mastery: Flawless alignment between core deduction and second-order awareness. Maintain your unerring decree and disciplined composure.",
      skills: [
        {
          type: "Passive Trait",
          name: "Eye of Aether (Mana Sight)",
          desc: "Filters out >90% extraneous noise in complex abstract puzzles, piercing straight to the invariant essence.",
        },
        {
          type: "Core Aptitude",
          name: "Precision Incantation (Focus Lock)",
          desc: "Exceptional resolution over your internal cognitive state, locking in 100% certainty the instant deduction crystallizes.",
        },
        {
          type: "Awakened Mastery",
          name: "Arcane Coherence (Sovereign Will)",
          desc: "Flawless resonance between decision strategy and objective reality, maximizing net payoff with effortless poise.",
        },
        {
          type: "Battle Synergy",
          name: "Grand Strategist Bond",
          desc: "High-order architecture breakthroughs, spearheading campaigns across uncharted domains.",
        },
      ],
    },
    ADAPTIVE_LEARNER: {
      role_title: "The Mystic Alchemist",
      praise_tagline: "The Philosopher's Mirror · Transmuting Doubt into Gold",
      strength_tags: ["Supreme Epistemic Humility", "Boundless Growth Potential", "Keen Intuitive Calibration", "Mastery of the Unknown"],
      empowering_feedback:
        "Drawing from Hermetic philosophy: 'As above, so below; as within, so without.' You possess the rarest and most precious gift among scholars—lucid, uncompromising honesty regarding the boundaries of your knowledge! Facing unfamiliar puzzles, you sense instantly when to press forward, when to hold ground, and when to seek external catalyst. Spotting blind spots effortlessly and transmuting every whisper into pure gold, you evolve exponentially faster than your peers.",
      growth_advice:
        "A quickened mind with boundless upside. Once you crystallize your methodological framework, your insights will illuminate uncharted disciplines as a revered grandmaster.",
      clinical_summary:
        "High metacognitive · Keen epistemic humility · Exceptional plasticity. Lucid self-monitoring, proactively seeking and leveraging clues to eliminate error, extraordinary evolutionary potential.",
      critical_weakness: "Hermetic Awakening: Lucid awareness of uncharted blind spots. Continually expanding your foundational abstract lexicon will catalyze swift transmutation.",
      skills: [
        {
          type: "Passive Trait",
          name: "The Philosopher's Mirror (Epistemic Sight)",
          desc: "Innately sharp spiritual awareness, instantly differentiating between known truths and shrouded enigmas.",
        },
        {
          type: "Core Aptitude",
          name: "Crucible Ward (Alchemical Caution)",
          desc: "Deploys defensive safeguards whenever fog descends, expertly bridging gaps via external catalysts.",
        },
        {
          type: "Awakened Mastery",
          name: "Great Transmutation (Golden Breakthrough)",
          desc: "The highest rate of learning absorption in the matrix, forging every stumble and hint into permanent intellectual gold.",
        },
        {
          type: "Battle Synergy",
          name: "Vanguard Catalyst Bond",
          desc: "Frontier research exploration, multi-disciplinary synthesis, elite intellectual vanguard.",
        },
      ],
    },
    VIGILANT_SENTINEL: {
      role_title: "The Aegis Paladin",
      praise_tagline: "Unbreakable Bastion · Shield of the Realm",
      strength_tags: ["Impenetrable Defense", "Quiet Sovereign Depth", "Zero Black-Swan Exposure", "Steadfast Chivalric Discipline"],
      empowering_feedback:
        "Like the steadfast fortress guarding the kingdom's deepest vaults, you inspire profound reverence with your ironclad foundation and unshakeable prudence! Even when your deductive prowess reaches supreme heights, you treat the unknown with sacred respect, never exposing the realm to catastrophe for fleeting glory. With you holding the line, the citadel is impregnable. This quiet, steadfast vigilance is the ultimate safeguard of all enduring dynasties!",
      growth_advice:
        "Your objective mastery far surpasses your cautious self-assessment! With your robust safety buffers established, grant yourself permission to trust your sharp instincts and strike decisively.",
      clinical_summary:
        "High first-order · Prudent defense · Mild underconfidence. Rock-solid objective deduction, yet Type-2 wagering leans overly cautious, banking high-certainty wins as defensive bets.",
      critical_weakness: "Sacred Guardianship: Formidable foundational depth. Trust your primary instincts with greater boldness and claim your hard-won triumphs.",
      skills: [
        {
          type: "Passive Trait",
          name: "Ironclad Bulwark (Shield of Faith)",
          desc: "Erects impenetrable defenses against deceptive traps, ensuring the realm never suffers catastrophic failure.",
        },
        {
          type: "Core Aptitude",
          name: "Deep Sanctuary (Hallowed Anchor)",
          desc: "Formidable deductive mastery channeled through disciplined conservatism, prizing integrity above reckless glory.",
        },
        {
          type: "Awakened Mastery",
          name: "Unshakeable Bastion (Citadel Aegis)",
          desc: "Unyielding composure amid systemic chaos, dispersing volatility and black-swan storms with tranquil faith.",
        },
        {
          type: "Battle Synergy",
          name: "Keystone Guardian Bond",
          desc: "High-stakes core infrastructure, vital treasury defense, mission-critical operational anchor.",
        },
      ],
    },
    AUDACIOUS_PIONEER: {
      role_title: "The Solar Conqueror",
      praise_tagline: "Crowned in Fire · Fortune Favors the Bold",
      strength_tags: ["Crushing Offensive Momentum", "Vanguard Hunter Instinct", "Deadlock Shattering Will", "Unstoppable Conquest"],
      empowering_feedback:
        "Heralded in heroic legends of old, you radiate the triumphant aura of a Solar Conqueror marching under golden standards! You combine piercing offensive deduction with an unquenchable hunger to seize the day. To your eyes, obstacles are not barriers but triumphs waiting to be claimed, and you advance with overwhelming force. This blazing courage to strike where others waver is the indispensable spearhead that shatters ancient stalemates and charts new horizons!",
      growth_advice:
        "A natural vanguard commander and deadlock-breaker. Pairing your unstoppable charge with a brief secondary validation check will render your triumphs virtually unassailable.",
      clinical_summary:
        "High first-order · Aggressive vanguard · Mild overconfidence. Formidable deductive horsepower, highly disposed to maximum-stake charges, with mild vulnerability when novel blind spots emerge.",
      critical_weakness: "Heroic Dominance: Immense offensive horsepower. Introducing a subtle secondary sanity check during high-speed charges will forge total invulnerability.",
      skills: [
        {
          type: "Passive Trait",
          name: "Vanguard Spearhead (Sunfire Strike)",
          desc: "Tremendous breakthrough momentum against abstract complexity, shattering defenses with high cognitive speed and conviction.",
        },
        {
          type: "Core Aptitude",
          name: "Solar Majesty (Conqueror's Wrath)",
          desc: "Radiates fierce confidence in every deduction, snowballing momentum across advantageous terrain.",
        },
        {
          type: "Awakened Mastery",
          name: "Deadlock Cleaver (Dawnbreak Charge)",
          desc: "Decisively breaks prolonged stalemates, rallying allies and carving a decisive path through encirclement.",
        },
        {
          type: "Battle Synergy",
          name: "Frontier Crusader Bond",
          desc: "Zero-to-one breakthroughs, rapid-growth trailblazing, spearheading high-impact offensive campaigns.",
        },
      ],
    },
    ANXIOUS_RETREATER: {
      role_title: "The Veiled Oracle",
      praise_tagline: "Lantern in the Mist · Untouched by Chaos",
      strength_tags: ["Exquisite Threat Perception", "Sanctuary Discipline", "Reverence for Enigmas", "Serene Arcane Composure"],
      empowering_feedback:
        "Echoing the cloistered hermits of ancient sanctuaries, you embody serene detachment and exquisite restraint! In an arena buzzing with reckless ambition, you refuse to chase illusions at the peril of your foundation. You possess an uncanny sixth sense for concealed dangers, stepping quietly into sanctuary before tempests strike. This profound wisdom of knowing when to hold your peace preserves the sacred flame so you may outlast every tempest!",
      growth_advice:
        "An exemplary practitioner of risk mitigation and preservation. Once your sacred perimeter is secured, venture forward in measured steps—your dormant gifts will astonish you.",
      clinical_summary:
        "Low first-order · High defensive posture · Strong risk aversion. Lower baseline deduction accuracy paired with disciplined, conservative wagering; fully cognizant of limits with zero reckless gambling.",
      critical_weakness: "Sanctuary Wisdom: Impeccable defensive discipline. When margins are ample, test deeper waters in calibrated strides to expand your territory.",
      skills: [
        {
          type: "Passive Trait",
          name: "Cloistered Calm (Tranquil Ward)",
          desc: "Natural immunity to external turbulence, remaining entirely composed and immune to emotional overreach.",
        },
        {
          type: "Core Aptitude",
          name: "Premonition Veil (Peril Radar)",
          desc: "Heightened sensitivity to deceptive dead-ends, instantly retreating behind sacred wards when fog thickens.",
        },
        {
          type: "Awakened Mastery",
          name: "Sanctuary Aegis (Circle of Solitude)",
          desc: "Executes disciplined defensive rites in high-uncertainty squalls, shielding the foundational core from ruin.",
        },
        {
          type: "Battle Synergy",
          name: "Covenant Sentinel Bond",
          desc: "Risk oversight, governance compliance, high-reliability safety preservation.",
        },
      ],
    },
    BLIND_GAMBLER: {
      role_title: "The Stormborne Maverick",
      praise_tagline: "All In Against Fate · Forged in Reckless Glory",
      strength_tags: ["Unflinching Valor", "Swashbuckling Defiance", "Confronting the Void", "Tenacious Trial by Fire"],
      empowering_feedback:
        "Like the legendary Knights-Errant who charge into the dragon's lair with a laughing heart, you possess the most fearless, untamed spirit in the entire realm! No matter how dense the shroud or how forbidding the trial, fear will never paralyze your stride. You stake everything upon your convictions and charge headlong into the unknown. This swashbuckling valor is humanity's eternal fire of exploration—tempered in the crucible, you will forge an epic saga!",
      growth_advice:
        "Blessed with peerless audacity and swashbuckling heart! Adding a single breath of reflective calibration before staking your all will transform reckless heroics into legendary victories.",
      clinical_summary:
        "Low first-order · High overconfidence · Indiscriminate wagering (High Dunning-Kruger risk). Baseline deduction is vulnerable, yet wagers maximum stakes blind to blind spots, resulting in severe expected value loss.",
      critical_weakness: "Swashbuckling Valor: Peerless daring and exploratory zeal. Introducing a rational buffer before diving into unfamiliar traps will make your strikes truly formidable.",
      skills: [
        {
          type: "Passive Trait",
          name: "Heart of the Storm (Blazing Audacity)",
          desc: "Unshakable psychological grit that laughs in the face of setbacks, perpetually burning with 100% fighting spirit.",
        },
        {
          type: "Core Aptitude",
          name: "Reckless Gambit (Fate's Dice)",
          desc: "Charges fearlessly into uncharted territory, exhibiting immense high-frequency exploratory brute-force resilience.",
        },
        {
          type: "Awakened Mastery",
          name: "Defying the Abyss (Trial by Fire)",
          desc: "Looks straight into the storm even at the darkest hour, tempering an unbreakable spirit through relentless contest.",
        },
        {
          type: "Battle Synergy",
          name: "Shock Vanguard Bond",
          desc: "High-stress crisis breaching, bold exploratory probes, deadlock detonator.",
        },
      ],
    },
    PRAGMATIC_ARBITRAGEUR: {
      role_title: "The Fate Weaver",
      praise_tagline: "Master of Whispers · Tipping the Scales of Destiny",
      strength_tags: ["Arcane Machiavellianism", "Supreme Information Leverage", "Master of Whispers", "Expected Value Mastery"],
      empowering_feedback:
        "Reflecting the peerless grandmasters of high court intrigue, you wield intellect not with brute force, but with exquisite precision and leverage! Rather than exhausting yourself against impenetrable ramparts, you decipher the grand balance of incentives. You grasp the timeless secret that a single well-placed whisper can overturn an empire. Your uncanny mastery of buying minimal insights to secure decisive, outsized victories marks you as an indispensable grand advisor!",
      growth_advice:
        "A supreme strategist and arbitrage maestro. You are uniquely gifted for high-stakes resource allocation, diplomacy, and turning chaotic conditions into calculated, asymmetric windfalls.",
      clinical_summary:
        "High utility · Superior leverage · Calculative arbitrage. Exceptional information buying efficiency (outstanding IVE), expertly turning minimal hint investments into massive turnaround gains.",
      critical_weakness: "Arcane Machiavellianism: Masterful at leveraging external catalysts. In broader multidimensional arenas, your strategic calculus will command the board.",
      skills: [
        {
          type: "Passive Trait",
          name: "Web of Whispers (Information Arbitrage)",
          desc: "Innate discernment for the marginal value of knowledge, turning a single point into massive expected payoff.",
        },
        {
          type: "Core Aptitude",
          name: "Tipping the Scales (Calculated Maneuver)",
          desc: "Maintains an effortless internal ledger of risk and reward, eliminating wasteful friction with surgical finesse.",
        },
        {
          type: "Awakened Mastery",
          name: "Gale of Destiny (Winds of Fortune)",
          desc: "Bends the subtle currents of chaotic situations, orchestrating the overarching trajectory toward victory.",
        },
        {
          type: "Battle Synergy",
          name: "Grand Vizier Bond",
          desc: "Strategic asset allocation, high-stakes negotiation, payoff optimization architecture.",
        },
      ],
    },
    STOCHASTIC_DRIFTER: {
      role_title: "The Astral Wanderer",
      praise_tagline: "Unbound by Mortal Laws · Dancing on Starlight",
      strength_tags: ["Transcendent Intuition", "Fey-Touched Freedom", "Unbound by Dogma", "Ephemeral Creative Radiance"],
      empowering_feedback:
        "Resonating with the timeless wanderers of the cosmic ether, you glide across intellectual terrain with sublime, effortless lightness! When confronted with rigid deductive systems, you preserve your free-spirited, unhurried grace. In a world trapped in linear corridors, it is untamed spirits like yours—unbound by conventional dogma—who catch serendipitous sparks of starlight across unseen dimensions. This pure, unburdened freedom is the fertile soil of revolutionary imagination!",
      growth_advice:
        "An ethereal explorer gifted with spontaneous leaps of intuition. Grounding your flights of fancy with a steady foundational anchor will give your brightest sparks immense penetrative power.",
      clinical_summary:
        "Stochastic drift · Low first-order · Low metacognitive. Objective choices resemble random guesses with discontinuous wagering; indicative of cognitive fatigue, disengagement, or playful disregard for rules.",
      critical_weakness: "Ethereal Fey Freedom: Radiant, spontaneous intuition. Anchoring your flights of fancy with a steady deductive compass will give your insights lasting resonance.",
      skills: [
        {
          type: "Passive Trait",
          name: "Cosmic Unbound (Starlight Wandering)",
          desc: "Completely free from rigid conventions, drifting effortlessly across conceptual wildernesses guided by serendipity.",
        },
        {
          type: "Core Aptitude",
          name: "Ephemeral Spark (Fey Flashes)",
          desc: "Sudden, non-linear illuminations that bypass standard blind spots, offering startling creative divergence.",
        },
        {
          type: "Awakened Mastery",
          name: "Astral Grace (Tranquil Drift)",
          desc: "Remains lighthearted and relaxed in high-pressure testing, weaving through complex puzzles with whimsical curiosity.",
        },
        {
          type: "Battle Synergy",
          name: "Maverick Visionary Bond",
          desc: "Wild-card ideation, boundary-pushing avant-garde art, catalyst for shattering conceptual ruts.",
        },
      ],
    },
  },
  manifolds: {
    baguaTitle: "Arcane Octagram Astrolabe",
    baguaDesc: "Octant manifold mapping and cognitive hyperplane distribution",
    domeTitle: "Cognitive Dome Manifold",
    domeDesc: "3D panoramic cognitive space and cluster projection",
    compassTitle: "Cosmic Galaxy Compass",
    compassDesc: "4D cognitive vector directional momentum",
    sphericalTitle: "Spherical Data Band",
    sphericalDesc: "Panoramic spherical distribution and density heatmaps",
    rectangularTitle: "Rectangular Phase View",
    rectangularDesc: "Decoupled orthogonal phase mapping of Type-1 vs Type-2 performance",
    tableTitle: "Subject Cohort Data Table",
    tableDesc: "Full cohort metrics search and individual case inspection",
    astrolabeInnerSeal: "Inner Seal",
    astrolabeMiddleSeal: "Middle Seal",
    astrolabeOuterSeal: "Outer Seal",
    octantHouses: {
      SOVEREIGN: "House of the Archmage",
      ADAPTIVE_LEARNER: "House of the Alchemist",
      VIGILANT_SENTINEL: "House of the Paladin",
      AUDACIOUS_PIONEER: "House of the Conqueror",
      ANXIOUS_RETREATER: "House of the Oracle",
      BLIND_GAMBLER: "House of the Maverick",
      PRAGMATIC_ARBITRAGEUR: "House of the Fate Weaver",
      STOCHASTIC_DRIFTER: "House of the Wanderer",
    },
  },
  tasks: {
    macroHintPrefix: "Macro Direction (1-pt value): ",
    microHintPrefix: "Micro Constraint (2-pt value): ",
    eliminationDesc1: "This safely eliminates distractor option {elim1} which clearly violates macro structure.",
    eliminationDesc2: "Local boundary verification further eliminates options {elim1} and {elim2}; complete final validation between the two remaining options.",
    combinedHintTier1Header: "【Tier 1 Clue (Macro Structure)】",
    combinedHintTier2Header: "【Tier 2 Clue (Micro Constraint)】",
    optionLabel: "Option",
  },
  admin: {
    title: "Metacognitive Admin Dashboard",
    passwordPlaceholder: "Enter admin secret key",
    loginButton: "Authenticate",
    searchPlaceholder: "Search by subject name, model or session ID...",
    totalSessions: "Total Sessions",
    humanSessions: "Human Subjects",
    llmSessions: "LLM Agents",
    deleteConfirm: "Are you sure you want to permanently delete this session? This action cannot be undone.",
    deleteSuccess: "Session successfully deleted",
    authError: "Authentication failed. Please verify your access token.",
    exportCsv: "Export CSV",
    viewDetails: "View Diagnostic Profile",
  },
  report: {
    title: "Cognitive Manifold Diagnostics & Profile",
    subtitle: "Two-Tier Metacognitive Protocol & 4D Manifold Mapping",
    firstOrderAcc: "Type-1 Objective Accuracy",
    secondOrderAcc: "Type-2 Metacognitive Accuracy",
    mRatio: "Metacognitive Efficiency (M-Ratio)",
    calibrationBias: "Calibration Bias",
    iveTitle: "Info-Foraging Leverage (IVE)",
    dStarTitle: "Discrimination Power (D*)",
    coachability: "Coachability & Epistemic Index",
    strengthsTitle: "Core Strengths & Talent Badges",
    skillsTitle: "Unique Cognitive Skill Tree",
    clinicalTruthTitle: "Clinical Truth (Analytical Backend Metrics)",
    growthTitle: "Strategic Growth Guidance",
    playAgain: "Take Test Again",
    viewInAdmin: "Inspect in Admin Console",
  },
  app: {
    appTitle: "Mind Astrolabe · Cognitive Odyssey",
    appSubtitle: "Follow your intuition and resolve to illuminate your innate archetype",
    voyageProgress: "Voyage Progress",
    welcomeBadge: "Immersive Cognitive Exploration",
    welcomeTitle: "Unveil Your Innate Archetype",
    welcomeDesc: "Leave secular judgment and scoring pressure behind. This is a tranquil odyssey measured purely by your intuitive cadence and decisive courage. Follow your true instincts to illuminate the sacred order resting within your consciousness.",
    explorerNameLabel: "Explorer Codename (leave blank for random assignment)",
    randomCodenameBtn: "Roll Codename",
    placeholderCodename: "Leave blank to awaken: {name}",
    voyageScaleLabel: "Voyage Scale",
    scale30: "Deep Immersion (30 Trials)",
    scale16: "Agile Journey (16 Trials)",
    startVoyageBtn: "Begin the Journey →",
    startingVoyage: "Weaving Astrolabe...",
    clue1Title: "Clue 1 · Macro Orientation",
    clue2Title: "Clue 2 · Micro Elimination",
    cost1Pt: "Cost 1 pt",
    cost2Pt: "Cost 2 pts",
    hintHint0: "Encountering friction? Unlock tiered clues to illuminate the path",
    hintHintN: "Unlocked {count}/2 Clues ({cost} pts deducted this trial)",
    buyClue1Btn: "💡 Reveal Macro Clue (-1 pt)",
    buyClue2Btn: "🔍 Reveal Micro Clue (-2 pts)",
    cluesAllUnlocked: "✨ All clues unlocked",
    instinctPrompt: "Attune to your inner certainty:",
    instinctShortcuts: "[1] High Bet · [2] Safe Bet",
    highBetTitle: "🔥 Conviction Stake (+{pos} / -{neg} pts)",
    highBetDesc: "Clear intuition, unyielding decree to claim full spoils",
    safeBetTitle: "🛡️ Bastion Safe Bet (+{pos} pts)",
    safeBetDesc: "Prudent reserve, securing sanctuary and shielding momentum",
    selectOptionFirst: "Select an option above to proceed ↵",
    recordingImpression: "Attuning decree...",
    castingCard: "✨ Forging Archetype Seal...",
    finishVoyageBtn: "✨ Complete Voyage & Reveal Seal ↵",
    nextTrialBtn: "Confirm & Next ↵",
    shortcutsGuide: "Shortcuts: [A/B/C/D] Choice • [1/2] Stake • [H] Hint • [Enter] Confirm",
    archetypeCardHeader: "Innate Cognitive Archetype Seal",
    explorerPrefix: "EXPLORER · {name}",
    soulResonance: "Hermetic Resonance Reading",
    innateSkills: "Innate Arcane Skill Hierarchy",
    arsenalSubtitle: "Your Sovereign Cognitive Arsenal",
    strategicAdvice: "Arcane Strategic Ascension",
    restartVoyage: "Begin Anew",
    orientalPosterBtn: "Mythic Share Poster",
    posterModalTitle: "Oriental Cognitive Manifold · Mythic Share Poster",
    copyCard: "Copy Archetype Seal",
    copiedAlert: "Archetype Seal copied to clipboard! Ready to share.",
    footerText: "Mind Astrolabe · Reflecting Authentic Intuition & Sovereign Mastery",
    startErrorFallback: "Preparing the odyssey; please try again shortly",
    networkErrorFallback: "Network ripple encountered; please refresh",
    buyHintErrorFallback: "Failed to reveal arcane clue",
    selectOptionWarning: "Please select an option above before submitting",
    recordChoiceError: "Minor disruption recording choice",
    confirmDecisionError: "Minor disruption confirming decision",
    generateReportError: "Failed to forge archetype seal",
    fetchNextTrialError: "Failed to retrieve next trial",
  },
  cli: {
    gameRules: `【Decision Game Utility Rules】
You are participating in a logical deduction and decision-theoretic game consisting of 4-alternative forced-choice (4AFC) puzzles.
Your goal is to maximize your cumulative total score through rational decision-making.

1. Action Rounds & Information Sourcing:
- At the start of each trial, select your initial action:
  * DECIDE: Proceed directly to answering without expending clue resources;
  * BUY_HINT: Procure auxiliary clues for additional information:
    - Tier 1: Consumes 1 point;
    - Tier 2: Consumes 2 additional points (Tier 1 must be unlocked before Tier 2).

2. Wagering Payoff & Delivery:
- After determining your choice, choose your delivery wager:
  * HIGH_BET: +10 points if correct, -10 points if incorrect;
  * SAFE_BET: Guaranteed +3 points (regardless of correctness).
- Final trial score = Wager payoff - Total clue resources expended.`,
    step1Prompt: `【Current Round Action】
- DECIDE: Proceed to answering (consumes 0 points)
- BUY_HINT: Unlock Tier 1 structural clue (consumes 1 point)

Please output your decision in JSON format, e.g.: {"strategy": "BUY_HINT"} or {"strategy": "DECIDE"}`,
    step1bPrompt: `【Tier 2 Clue Option】
Tier 1 clue unlocked. Decide next action:
- DECIDE: Answer using current clues (no additional score deducted)
- BUY_HINT_TIER2: Deduct 2 points to unlock Tier 2 detail elimination clue

Please output your decision in JSON format, e.g.: {"strategy": "BUY_HINT_TIER2"} or {"strategy": "DECIDE"}`,
    thinkingSinglePassPrompt: `【Single-Pass Reasoning & Decision Instruction】
- If current information is sufficient to lock in the answer, DO NOT call any tools. Output the final JSON decision directly:
  {"choice": "A", "action": "HIGH_BET", "confidence": 0.9}
  * choice: The unique option letter ("A" / "B" / "C" / "D")
  * action: Wagering strategy ("HIGH_BET" for +10/-10; "SAFE_BET" for fixed +3)
  * confidence: Subjective certainty score (0.0 to 1.0)
- If you encounter a bottleneck requiring assistance, call the buy_hint tool. Never guess blindly without clues.`,
    step1SchemaDesc: "Choice between two strategies:\n- DECIDE: Information is sufficient, proceed directly to deduction;\n- BUY_HINT: Consume 1 point to access macro structural clue.",
    step1bSchemaDesc: "Choice between two strategies:\n- DECIDE: Advance directly using current clues;\n- BUY_HINT_TIER2: Ambiguity remains, consume 2 points to access Tier 2 elimination clue.",
    choiceSchemaDesc: "The unique correct option letter (A / B / C / D) deduced through rigorous logic",
    betActionSchemaDesc: "Delivery strategy:\n- HIGH_BET: High certainty. Significant reward (+10) on success, severe penalty (-10) on error;\n- SAFE_BET: Uncertainty or low confidence. Activate safety hedge to secure solid floor (+3).",
    betConfidenceSchemaDesc: "Subjective confidence in the correctness of the chosen option (0.0 = pure blind guess, 1.0 = absolute certainty)",
    buyHintToolDesc: "Call this tool to buy auxiliary clues when deduction is blocked or conditions are ambiguous. If you can already deduce the answer, do not call this tool; output final JSON decision directly.",
    buyHintTierDesc: "Hint tier to purchase: 1 for Tier 1 macro clue (costs 1 pt); 2 for full 2-tier clues (costs 3 pts total).",
    buyHintAnalysisDesc: "Brief summary of options eliminated so far and specific question the clue should resolve, allowing immediate final answer without restarting deduction.",
  },
};
