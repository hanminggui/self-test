import React from "react";
import { Lock } from "lucide-react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";

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
      <Dialog
        isOpen={true}
        onOpenChange={() => {}}
        purpose="required"
        width={420}
        role="dialog"
        aria-label="管理控制台"
      >
        <form onSubmit={onSubmit} className="w-full">
          <Layout
            header={
              <DialogHeader
                title="管理控制台"
                subtitle="请输入管理员密码调阅群体数据"
                startContent={
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                }
              />
            }
            content={
              <LayoutContent>
                <VStack gap={4}>
                  <TextInput
                    type="password"
                    label="管理员密码"
                    placeholder="请输入管理员密码..."
                    value={inputPassword}
                    onChange={(val) => setInputPassword(val)}
                    status={authError ? { type: "error", message: authError } : undefined}
                    hasAutoFocus
                    width="100%"
                  />
                </VStack>
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <Button
                  type="submit"
                  variant="primary"
                  label="解锁进入控制台 →"
                  width="100%"
                />
              </LayoutFooter>
            }
          />
        </form>
      </Dialog>
    </div>
  );
}
