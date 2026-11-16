import React from "react";
import { Settings } from "lucide-react";
import { Card } from "@astryxdesign/core/Card";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useUser } from "../contexts/UserContext";
import { useLocale } from "../contexts/LocaleContext";
import { ProfileSettings } from "../components/profile/ProfileSettings";

export const SettingsPage: React.FC = () => {
  const { user, loading: userLoading, openAuthModal } = useUser();
  const { locale, t } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  if (!userLoading && !user) {
    return (
      <VStack
        hAlign="center"
        vAlign="center"
        minHeight="100dvh"
        padding={6}
      >
        <Card maxWidth={480} padding={6} elevation="low">
          <VStack gap={4} hAlign="center">
            <HStack
              hAlign="center"
              vAlign="center"
              className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            >
              <Settings className="w-7 h-7" />
            </HStack>
            <VStack gap={2} hAlign="center">
              <Heading level={2} justify="center">
                {isEn ? "Sign in to manage preferences" : "请先登录以管理个人偏好"}
              </Heading>
              <Text type="body" color="secondary" justify="center">
                {isEn
                  ? "Authenticate to customize your explorer identity, default report visibility, and connected OAuth providers."
                  : "登录探索者账号后即可自定义个人名片、默认隐私级别及多端账号关联。"}
              </Text>
            </VStack>
            <Button
              label={t.profile?.signInBtn || (isEn ? "Sign In" : "立即登录")}
              variant="primary"
              size="lg"
              onClick={openAuthModal}
            />
          </VStack>
        </Card>
      </VStack>
    );
  }

  return (
    <VStack
      maxWidth={1024}
      paddingInline={4}
      paddingBlock={6}
      gap={6}
      className="mx-auto min-h-dvh"
    >
      {userLoading ? (
        <VStack hAlign="center" vAlign="center" gap={3} padding={10}>
          <Spinner size="lg" label={isEn ? "Loading preferences..." : "正在加载个人偏好设置..."} />
          <Text type="supporting" color="secondary">
            {isEn ? "Loading preferences..." : "正在加载个人偏好设置..."}
          </Text>
        </VStack>
      ) : (
        <ProfileSettings />
      )}
    </VStack>
  );
};
