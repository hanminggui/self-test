import React from "react";

export const EnglishPrivacyContent: React.FC = () => {
  return (
    <article className="space-y-8 text-slate-300 leading-relaxed text-sm md:text-base">
      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
          <span className="text-amber-400">1.</span> Introduction & Scope
        </h2>
        <p>
          Welcome to <strong>Self-Test (Mind Astrolabe)</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We provide an experimental metacognitive manifold evaluation engine built on Signal Detection Theory (SDT) and M-Ratio quantification. Protecting the privacy and integrity of our explorers&rsquo; cognitive telemetry is our highest priority.
        </p>
        <p>
          This Privacy Notice explains how we collect, store, and process your telemetry and profile data when using our web services at{" "}
          <a href="https://self-test.aduang.net" className="text-amber-400 hover:underline">
            https://self-test.aduang.net
          </a>{" "}
          or associated mirrors.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
          <span className="text-amber-400">2.</span> Information We Collect
        </h2>
        <p>
          We collect minimal information necessary to deliver mathematical psychometric scoring and multi-tier archetype profiling:
        </p>
        <ul className="list-disc list-inside space-y-2 pl-2 text-slate-400">
          <li>
            <strong className="text-slate-200">Metacognitive Telemetry:</strong>
            Per-trial 4AFC choices, information foraging decisions (Tier 1 / Tier 2 hint acquisition), wagering strategies (High Bet vs. Safe Hedge), subjective confidence ratings, and response latency. This is used solely to compute Type-1 d&prime;, Type-2 meta-d&prime;, M-Ratio, and calibration bias.
          </li>
          <li>
            <strong className="text-slate-200">Third-Party OAuth Account Data:</strong>
            When you sign in with GitHub, Linux Do, or Google, we only request and receive your public profile identifier, display name, public avatar URL, and verified email address to persist your evaluations in cloud storage. We never access your credentials or private repository data.
          </li>
          <li>
            <strong className="text-slate-200">Client-Side Session Cache:</strong>
            For guest explorers, current session states are cached locally via standard browser LocalStorage to prevent trial progression loss across network flickers.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
          <span className="text-amber-400">3.</span> Security & Infrastructure
        </h2>
        <p>
          Your records are processed on serverless Cloudflare Workers and persisted in encrypted Cloudflare D1 distributed SQLite instances. All data in transit is protected by strict TLS 1.3 encryption.
        </p>
        <p className="text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs md:text-sm">
          <strong>No Commercial Data Monetization:</strong> We do not sell, rent, or trade your cognitive telemetry, behavioral profiles, or contact credentials to advertising networks or third-party data brokers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
          <span className="text-amber-400">4.</span> Explorer Rights & Retention
        </h2>
        <p>
          You retain full authority over your data:
        </p>
        <ul className="list-disc list-inside space-y-2 pl-2 text-slate-400">
          <li><strong>Access & Sharing:</strong> Access historical session reports via permanent permalinks or share cards at any time.</li>
          <li><strong>Erasure:</strong> You may request deletion of all cloud-persisted active and completed sessions linked to your authenticated user account.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
          <span className="text-amber-400">5.</span> Updates & Contact
        </h2>
        <p>
          We may periodically update this notice to reflect system revisions or psychometric research advancements. Continued use following modifications constitutes acceptance of the revised notice.
        </p>
      </section>
    </article>
  );
};
