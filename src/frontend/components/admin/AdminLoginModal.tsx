import React from "react";
import { Lock } from "lucide-react";

interface AdminLoginModalProps {
  inputPassword: string;
  setInputPassword: (val: string) => void;
  authError: string;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AdminLoginModal({
  inputPassword,
  setInputPassword,
  authError,
  onSubmit,
}: AdminLoginModalProps) {
  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center p-4 bg-[#090a0f]">
      <div className="glass-panel rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">管理控制台</h2>
          <p className="text-xs text-slate-400 mt-1">请输入管理员密码调阅群体数据</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="请输入管理员密码..."
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-colors"
          />

          {authError && <div className="text-xs text-rose-400">{authError}</div>}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            解锁进入控制台 →
          </button>
        </form>
      </div>
    </div>
  );
}
