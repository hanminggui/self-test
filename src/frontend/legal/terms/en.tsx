import React from "react";

export const EnglishTermsContent: React.FC = () => {
  return (
    <article className="space-y-8 text-stone-800 dark:text-slate-200 leading-relaxed sm:leading-loose text-sm sm:text-base font-normal">
      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">1.</span> Acceptance of Terms &amp; Scope
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          Welcome to <strong className="text-stone-950 dark:text-white font-black">Self-Test (Mind Astrolabe)</strong>. These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and interaction with our web-based psychometric services. By accessing our platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms.
        </p>
        <p className="leading-relaxed sm:leading-loose">
          Self-Test provides a mathematical 4AFC geometric reasoning and psychophysics game engine designed to quantify metacognitive efficiency (M-Ratio), Type-2 monitoring sensitivity, and decision calibration.
        </p>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">2.</span> Acceptable Use &amp; Evaluation Integrity
        </h2>
        <ul className="list-disc list-outside space-y-3 pl-5 text-stone-700 dark:text-slate-300">
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">Authorized Use:</strong> You agree to use the testing portal solely for personal exploration, AI benchmark comparisons, or scientific study. Any reverse-engineering, automated packet flooding, or trial-tampering scripts designed to corrupt the staircase calibration algorithm is strictly prohibited.
          </li>
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">Account Security:</strong> You are responsible for maintaining the authorization integrity of your connected third-party accounts (GitHub, Linux Do, Google).
          </li>
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">Leaderboard Fairness:</strong> Fabricating answer telemetry or forging network payloads to artificially skew cohort benchmarks is considered abusive conduct, subjecting associated session data to immediate purging.
          </li>
        </ul>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">3.</span> Intellectual Property &amp; Open Source
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          The visual layout, galaxy compass visualizations, archetype lore matrices, and custom typography are proprietary assets protected by copyright and international intellectual property laws. Open-source engine components are licensed in accordance with their declared root licenses.
        </p>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">4.</span> Disclaimers &amp; Non-Clinical Boundaries
        </h2>
        <div className="text-stone-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border-2 border-stone-900/20 dark:border-amber-500/30 p-4 rounded-2xl text-xs sm:text-sm space-y-2 shadow-sm font-medium">
          <p className="leading-relaxed">
            <strong className="font-black text-stone-950 dark:text-[#CCFF00]">Explicit Non-Clinical Notice:</strong> All scores, indices, and diagnostic archetypes provided by Self-Test (including d&prime;, meta-d&prime;, M-Ratio, and calibration bias) are for experimental cognitive psychometrics and self-reflection purposes only. <strong className="font-black text-stone-950 dark:text-[#CCFF00]">They do not constitute medical, psychiatric, or psychological diagnoses, nor do they measure general intelligence or employment aptitude.</strong>
          </p>
          <p className="leading-relaxed">
            The service is provided &ldquo;AS IS&rdquo; without warranties of continuous availability or absolute error-free execution.
          </p>
        </div>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">5.</span> Governing Law
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          These Terms and any dispute arising out of or related to your use of this service shall be governed by the laws of the People&rsquo;s Republic of China, with resolution sought primarily through good-faith consultation.
        </p>
      </section>
    </article>
  );
};
