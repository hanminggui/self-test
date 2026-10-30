import React from "react";

export const ChinesePrivacyContent: React.FC = () => {
  return (
    <article className="space-y-8 text-stone-800 dark:text-slate-200 leading-relaxed sm:leading-loose text-sm sm:text-base font-normal">
      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">1.</span> 引言与服务宗旨
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          欢迎访问<strong className="text-stone-950 dark:text-white font-black">思维星图 (Self-Test)</strong>（以下简称“本平台”或“我们”）。我们致力于通过认知阶梯博弈与信号检测论模型，为探索者提供二元认知流形评测。我们深知个人隐私与评测数据的重要性，严格遵守法律法规，致力于以最高标准的透明度与安全性保护您的信息资产。
        </p>
        <p className="leading-relaxed sm:leading-loose">
          在您使用匿名评测或连接第三方身份账号时，我们将依据本政策收集、存储和处理必要的数据。
        </p>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">2.</span> 我们收集的信息
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          为了保障认知评测模型的数学严谨性与个性化报告生成，我们收集的信息仅限于以下范围：
        </p>
        <ul className="list-disc list-outside space-y-3 pl-5 text-stone-700 dark:text-slate-300">
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">认知行为遥测数据：</strong>
            包括试次选项选择（Phase 1 / Phase 2）、决策下注行为（高风险/稳健保底）、主观置信度评估、线索调阅记录与反应时长。此数据严格用于计算一阶决策敏感度 (d')、二阶元认知敏感度 (meta-d')、认知效率 (M-Ratio) 及校准偏差。
          </li>
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">第三方授权账户信息：</strong>
            当您主动使用 GitHub、Linux Do 或 Google 账号登录时，我们仅接收授权范围内的公开基础信息（包括用户唯一标识 ID、公开昵称、头像链接和认证邮箱），用于在云端归档您的评测记录与画像勋章。我们绝不获取您的第三方账号密码或非公开私有数据。
          </li>
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">本地存储与会话状态：</strong>
            对于匿名访问的探索者，系统通过浏览器 LocalStorage/SessionStorage 记录当前进行的试次临时状态，确保在网络抖动或意外刷新时不丢失答题进度。
          </li>
        </ul>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">3.</span> 信息的使用与存储安全
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          我们坚持“最小必要与去标识化”原则使用您的数据：
        </p>
        <ul className="list-disc list-outside space-y-2.5 pl-5 text-stone-700 dark:text-slate-300">
          <li className="leading-relaxed sm:leading-loose">用于实时生成八维认知画像雷达图、决策效用曲线及探索者成就勋章；</li>
          <li className="leading-relaxed sm:leading-loose">用于构建群体去标识化统计流形与正态分布常模基准（严禁关联个人真实身份）；</li>
          <li className="leading-relaxed sm:leading-loose">所有结构化数据存储于分布式 Cloudflare Edge 安全环境，传输过程强制采用 TLS 1.3 端到端加密。</li>
        </ul>
        <div className="text-stone-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border-2 border-stone-900/20 dark:border-amber-500/30 p-4 rounded-2xl text-xs sm:text-sm font-medium shadow-sm">
          <strong className="font-black text-stone-950 dark:text-[#CCFF00]">数据中立承诺：</strong>我们绝不将您的评测数据、个人邮箱或身份凭证出售、出租或提供给任何第三方商业广告机构。
        </div>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">4.</span> 您的数据控制权与注销
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          您对自己的数据拥有完全的自主权：
        </p>
        <ul className="list-disc list-outside space-y-2.5 pl-5 text-stone-700 dark:text-slate-300">
          <li className="leading-relaxed sm:leading-loose"><strong className="text-stone-950 dark:text-white font-black">查阅与导出：</strong>您可随时访问历史评测报告永久专属链接，或通过分享图谱导出您的专属数据；</li>
          <li className="leading-relaxed sm:leading-loose"><strong className="text-stone-950 dark:text-white font-black">删除与注销：</strong>已登录用户有权要求清除与本人身份关联的历史评测记录。注销后，服务器端关联记录将被永久擦除。</li>
        </ul>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">5.</span> 政策更新与联系方式
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          随着认知范式或云端架构演进，本政策可能会进行适度修订。重大变更将在站点显著位置提示。如对隐私保护有任何疑问或建议，欢迎联系平台维护者。
        </p>
      </section>
    </article>
  );
};
