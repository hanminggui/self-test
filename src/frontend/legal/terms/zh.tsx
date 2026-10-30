import React from "react";

export const ChineseTermsContent: React.FC = () => {
  return (
    <article className="space-y-8 text-stone-800 dark:text-slate-200 leading-relaxed sm:leading-loose text-sm sm:text-base font-normal">
      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">1.</span> 条款接纳与服务性质
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          欢迎使用<strong className="text-stone-950 dark:text-white font-black">思维星图 (Self-Test)</strong> 服务平台。本《服务条款》（以下简称“本协议”）构成您与平台运营团队之间具有法律约束力的协议。访问或使用本平台即表示您已阅读、理解并同意接受本条款的全部内容。
        </p>
        <p className="leading-relaxed sm:leading-loose">
          本系统基于认知心理学、信号检测论与贝叶斯优化阶梯机制，提供 4 选 1 抽象几何与数学推演决策评测，旨在协助用户探索个人元认知监控效率、第二序自省敏感度与决策偏差特征。
        </p>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">2.</span> 账户使用与行为规范
        </h2>
        <ul className="list-disc list-outside space-y-3 pl-5 text-stone-700 dark:text-slate-300">
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">合规使用：</strong>
            您同意仅出于个人探索、学术研究或技术评测目的使用本系统。严禁利用逆向工程、自动化嗅探、高频发包攻击或脚本外挂干扰阶梯难度自适应算法与正常评测秩序。
          </li>
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">账号安全：</strong>
            若您使用第三方授权账号绑定登录，您应当对在该账号下发生的一切活动与会话记录全权负责。
          </li>
          <li className="leading-relaxed sm:leading-loose">
            <strong className="text-stone-950 dark:text-white font-black">禁止作弊刷榜：</strong>
            严禁伪造第一序答案正误或通过注入报文非法篡改评分基准。平台有权对异常作弊会话执行数据清洗与重置。
          </li>
        </ul>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">3.</span> 知识产权与开源声明
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          本系统的前端交互设计、星图罗盘可视化算法、认知画像模型体系均受相关知识产权法律法规保护。开源模块遵循项目根目录声明的开源许可证条款。未获明示许可，任何人不得将本站专有视觉资产（包括但不限于罗盘标识、画像宣发图谱样式等）用于非授权商业营利性目的。
        </p>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">4.</span> 免责声明与临床界限
        </h2>
        <div className="text-stone-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border-2 border-stone-900/20 dark:border-amber-500/30 p-4 rounded-2xl text-xs sm:text-sm space-y-2 shadow-sm font-medium">
          <p className="leading-relaxed">
            <strong className="font-black text-stone-950 dark:text-[#CCFF00]">重要非临床性质声明：</strong>本平台出具的所有指标（包括但不限于 d'、meta-d'、M-Ratio、校准偏差、达克效应系数及八维流派画像标签）纯属心理物理学计算与决策博弈探索参考，<strong className="font-black text-stone-950 dark:text-[#CCFF00]">绝不构成任何医学、心理临床病理诊断、智力定论或雇佣录用决策依据</strong>。
          </p>
          <p className="leading-relaxed">
            平台不保证服务永不中断或完全无差错。在法律允许的最大范围内，平台对因网络中断、设备兼容或使用本服务而间接引起的任何衍生损失不承担连带赔偿责任。
          </p>
        </div>
      </section>

      <section className="space-y-3.5">
        <h2 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white flex items-center gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-2.5">
          <span className="text-amber-500 dark:text-[#CCFF00]">5.</span> 适用法律与争议解决
        </h2>
        <p className="leading-relaxed sm:leading-loose">
          本协议的解释、效力及纠纷解决均适用中华人民共和国法律。因使用本服务产生的争议，各方应优先通过友好协商解决。
        </p>
      </section>
    </article>
  );
};
