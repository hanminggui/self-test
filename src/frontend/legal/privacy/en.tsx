import React from "react";

export const EnglishPrivacyContent: React.FC = () => {
  return (
    <article className="space-y-8 text-stone-800 dark:text-slate-200 leading-relaxed sm:leading-loose text-sm sm:text-base font-normal">
      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">1.</span> Introduction &amp; Scope
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          Welcome to <strong className="text-stone-950 dark:text-white font-black">Self-Test (Mind Astrolabe)</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We provide an experimental metacognitive manifold evaluation engine built on Signal Detection Theory (SDT) and M-Ratio quantification. Protecting the privacy and integrity of our explorers&rsquo; cognitive telemetry is our highest priority.
        </p>
        <p className="leading-relaxed sm:leading-loose">
          This Privacy Notice explains how we collect, store, and process your telemetry and profile data when using our web services at{" "}
          <a href="https://self-test.aduang.net" className="text-amber-700 dark:text-[#CCFF00] font-bold hover:underline">
            https://self-test.aduang.net
          </a>{" "}
          or associated mirrors.
        </p>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">2.</span> Information We Collect
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          We collect minimal information necessary to deliver mathematical psychometric scoring and multi-tier archetype profiling:
        </p>
        <ul className="list-disc list-outside space-y-3 pl-5 text-stone-700 dark:text-slate-300">
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">Metacognitive Telemetry:</strong>
            Per-trial 4AFC choices, information foraging decisions (Tier 1 / Tier 2 hint acquisition), wagering strategies (High Bet vs. Safe Hedge), subjective confidence ratings, and response latency. This is used solely to compute Type-1 d&prime;, Type-2 meta-d&prime;, M-Ratio, and calibration bias.
          </li>
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">Third-Party OAuth Account Data:</strong>
            When you sign in with GitHub, Linux Do, or Google, we only request and receive your public profile identifier, display name, public avatar URL, and verified email address to persist your evaluations in cloud storage. We never access your credentials or private repository data.
          </li>
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">Client-Side Session Cache:</strong>
            For guest explorers, current session states are cached locally via standard browser LocalStorage to prevent trial progression loss across network flickers.
          </li>
        </ul>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">3.</span> Security &amp; Infrastructure
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          Your records are processed on serverless Cloudflare Workers and persisted in encrypted Cloudflare D1 distributed SQLite instances. All data in transit is protected by strict TLS 1.3 encryption.
        </p>
        <div className="text-stone-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border-2 border-stone-900/20 dark:border-amber-500/30 p-4 rounded-2xl text-xs sm:text-sm font-medium shadow-sm">
          <strong className="font-black text-stone-950 dark:text-[#CCFF00]">No Commercial Data Monetization:</strong> We do not sell, rent, or trade your cognitive telemetry, behavioral profiles, or contact credentials to advertising networks or third-party data brokers.
        </div>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">4.</span> Explorer Rights &amp; Retention
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          You retain sovereign control over your records:
        </p>
        <ul className="list-disc list-outside space-y-2.5 pl-5 text-stone-700 dark:text-slate-300">
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">Access &amp; Export:</strong> You can review and export your diagnostic reports and archetype cards anytime via permalink or poster generator.
          </li>
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">Erasure:</strong> Authenticated users have the right to request deletion of all associated historical sessions and identity mappings.
          </li>
        </ul>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">5.</span> Updates &amp; Inquiries
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          As cognitive psychometric methods or edge storage patterns evolve, this policy may receive occasional adjustments. Noteworthy changes will be announced on the portal. For questions regarding your privacy, please contact the maintainers.
        </p>
      </section>
    </article>
  );
};
