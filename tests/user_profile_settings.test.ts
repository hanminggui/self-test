import { describe, expect, it } from "bun:test";
import { app } from "../src/backend/server";
import { UserManager } from "../src/backend/user_manager";
import { LocalSqliteAdapter } from "../src/storage/local_sqlite";
import { createAuthToken } from "../src/backend/auth/jwt";
import {
  validateDisplayName,
  validateBio,
  validateVisibility,
  validateSocialLinks,
} from "../src/backend/user_validation";

describe("GitHub Issue #14: User Profile & Visibility Settings Suite", () => {
  // Helper to create test user and auth token
  async function createTestUserSetup(initialProvider = "github") {
    const memDb = new LocalSqliteAdapter(":memory:");
    const um = new UserManager(memDb);

    const user = await um.upsertUser({
      primary_provider: initialProvider,
      provider_id: "gh_test_12345",
      email: "explorer@self-test.dev",
      display_name: "InitialExplorer",
      avatar_url: "https://example.com/avatar.png",
      metadata: {
        bio: "Initial cognitive traveler bio",
        default_visibility: "anonymous",
      },
    });

    const token = await createAuthToken(user);
    return { um, user, token };
  }

  describe("1. Form Validation Unit Logic", () => {
    it("1.1 昵称长度限制校验 (2 ~ 32 字符)", () => {
      expect(validateDisplayName("A").valid).toBe(false);
      expect(validateDisplayName("").valid).toBe(false);
      expect(validateDisplayName("AB").valid).toBe(true);
      expect(validateDisplayName("极目星汉探索者").valid).toBe(true);
      expect(validateDisplayName("A".repeat(32)).valid).toBe(true);
      expect(validateDisplayName("A".repeat(33)).valid).toBe(false);
    });

    it("1.2 过滤脚本与非法 HTML 标签", () => {
      expect(validateDisplayName("<script>alert(1)</script>").valid).toBe(false);
      expect(validateDisplayName("User<img src=x>").valid).toBe(false);
      expect(validateDisplayName("NormalUser").valid).toBe(true);
    });

    it("1.3 过滤非法控制字符", () => {
      expect(validateDisplayName("Bad\u0000User").valid).toBe(false);
      expect(validateDisplayName("Bad\u0007User").valid).toBe(false);
    });

    it("1.4 过滤保留与违规侮辱性词汇", () => {
      expect(validateDisplayName("admin").valid).toBe(false);
      expect(validateDisplayName("ADMIN").valid).toBe(false);
      expect(validateDisplayName("root").valid).toBe(false);
      expect(validateDisplayName("system").valid).toBe(false);
      expect(validateDisplayName("moderator").valid).toBe(false);
      expect(validateDisplayName("傻逼").valid).toBe(false);
      expect(validateDisplayName("SafeExplorer").valid).toBe(true);
    });

    it("1.5 Bio 长度与脚本校验", () => {
      expect(validateBio("Valid bio").valid).toBe(true);
      expect(validateBio("B".repeat(300)).valid).toBe(true);
      expect(validateBio("B".repeat(301)).valid).toBe(false);
      expect(validateBio("<script>hack()</script>").valid).toBe(false);
    });

    it("1.6 可见性偏好枚举校验 (private, anonymous, public)", () => {
      expect(validateVisibility("private").valid).toBe(true);
      expect(validateVisibility("anonymous").valid).toBe(true);
      expect(validateVisibility("public").valid).toBe(true);
      expect(validateVisibility("hidden").valid).toBe(false);
      expect(validateVisibility("confidential").valid).toBe(false);
    });

    it("1.7 社交链接合法性校验", () => {
      expect(validateSocialLinks({ github: "torvalds", twitter: "jack" }).valid).toBe(true);
      expect(validateSocialLinks({ github: "<script>" }).valid).toBe(false);
      expect(validateSocialLinks("invalid" as any).valid).toBe(false);
    });
  });

  describe("2. GET /api/me/profile 端点与账号关联状态", () => {
    it("2.1 未登录请求返回 401 Unauthorized", async () => {
      const req = new Request("http://localhost:8000/api/me/profile");
      const res = await app.fetch(req);
      expect(res.status).toBe(401);
    });

    it("2.2 登录状态返回完整的用户资料与 OAuth 提供商关联状态矩阵", async () => {
      const { um, user, token } = await createTestUserSetup();

      const req = new Request("http://localhost:8000/api/me/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, { userManager: um } as any);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(user.id);
      expect(data.user.display_name).toBe("InitialExplorer");
      expect(data.user.metadata.bio).toBe("Initial cognitive traveler bio");

      // 验证提供商矩阵
      expect(data.providers).toBeDefined();
      expect(Array.isArray(data.providers)).toBe(true);
      expect(data.providers.length).toBe(3);

      const gh = data.providers.find((p: any) => p.provider === "github");
      expect(gh?.linked).toBe(true);
      expect(gh?.is_primary).toBe(true);

      const linuxdo = data.providers.find((p: any) => p.provider === "linuxdo");
      expect(linuxdo?.linked).toBe(false);

      const google = data.providers.find((p: any) => p.provider === "google");
      expect(google?.linked).toBe(false);
    });
  });

  describe("3. PUT /api/me/profile 端点更新个人资料与隐私偏好", () => {
    it("3.1 成功更新 display_name, bio, avatar_url, default_visibility 与 social_links", async () => {
      const { um, user, token } = await createTestUserSetup();

      const req = new Request("http://localhost:8000/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: "暮光星灵007",
          bio: "追索相图空间的元认知边界",
          avatar_url: "https://example.com/new-avatar.png",
          default_visibility: "public",
          social_links: {
            github: "twilight-pilot",
            linuxdo: "twilight",
            twitter: "@twilight",
            website: "https://twilight.dev",
          },
        }),
      });

      const res = await app.fetch(req, { userManager: um } as any);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.display_name).toBe("暮光星灵007");
      expect(data.user.avatar_url).toBe("https://example.com/new-avatar.png");
      expect(data.user.metadata.bio).toBe("追索相图空间的元认知边界");
      expect(data.user.metadata.default_visibility).toBe("public");
      expect(data.user.metadata.social_links.github).toBe("twilight-pilot");

      // 校验数据库持久化
      const dbUser = await um.getUserById(user.id);
      expect(dbUser?.display_name).toBe("暮光星灵007");
      expect(dbUser?.metadata?.default_visibility).toBe("public");
    });

    it("3.2 昵称过短或过长时拒绝更新并返回 400", async () => {
      const { um, token } = await createTestUserSetup();

      // 过短 (1 字符)
      const reqShort = new Request("http://localhost:8000/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name: "X" }),
      });
      const resShort = await app.fetch(reqShort, { userManager: um } as any);
      expect(resShort.status).toBe(400);

      // 过长 (>32 字符)
      const reqLong = new Request("http://localhost:8000/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name: "A".repeat(33) }),
      });
      const resLong = await app.fetch(reqLong, { userManager: um } as any);
      expect(resLong.status).toBe(400);
    });

    it("3.3 尝试注入脚本或违规昵称时拒绝更新并返回 400", async () => {
      const { um, token } = await createTestUserSetup();

      const reqXss = new Request("http://localhost:8000/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name: "<script>alert(1)</script>" }),
      });
      const resXss = await app.fetch(reqXss, { userManager: um } as any);
      expect(resXss.status).toBe(400);

      const reqReserved = new Request("http://localhost:8000/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name: "admin" }),
      });
      const resReserved = await app.fetch(reqReserved, { userManager: um } as any);
      expect(resReserved.status).toBe(400);
    });

    it("3.4 传入非法的可见性级别时拒绝更新并返回 400", async () => {
      const { um, token } = await createTestUserSetup();

      const reqInvalidVis = new Request("http://localhost:8000/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ default_visibility: "invalid_level" }),
      });
      const res = await app.fetch(reqInvalidVis, { userManager: um } as any);
      expect(res.status).toBe(400);
    });
  });

  describe("4. 多 OAuth 账号绑定与解绑逻辑", () => {
    it("4.1 成功关联第二个 OAuth 提供商 (Linux Do)", async () => {
      const { um, user } = await createTestUserSetup();

      // 绑定 linuxdo 账号
      const updatedUser = await um.linkProvider(user.id, "linuxdo", {
        id: "ld_998877",
        email: "neo@linux.do",
        display_name: "NeoLinuxer",
        avatar_url: "https://linux.do/avatar.png",
        metadata: { trust_level: 2, badge: "VIP" },
      });

      expect(updatedUser.metadata?.providers?.linuxdo).toBeDefined();
      expect(updatedUser.metadata?.providers?.linuxdo.username).toBe("NeoLinuxer");

      const providers = um.getConnectedProviders(updatedUser);
      const ldProv = providers.find((p) => p.provider === "linuxdo");
      expect(ldProv?.linked).toBe(true);
      expect(ldProv?.username).toBe("NeoLinuxer");
    });

    it("4.2 若第三方账号已被其他用户绑定，阻止重复绑定并抛出冲突错误", async () => {
      const memDb = new LocalSqliteAdapter(":memory:");
      const um = new UserManager(memDb);

      // 创建用户 A 并绑定 GitHub id 1001
      const userA = await um.upsertUser({
        primary_provider: "github",
        provider_id: "1001",
        display_name: "UserAlpha",
      });

      // 创建用户 B 并绑定 LinuxDo id 2002
      const userB = await um.upsertUser({
        primary_provider: "linuxdo",
        provider_id: "2002",
        display_name: "UserBeta",
      });

      // 用户 B 尝试绑定用户 A 的 GitHub 账号 (id 1001) -> 必须报错
      expect(
        um.linkProvider(userB.id, "github", {
          id: "1001",
          display_name: "UserAlpha",
        })
      ).rejects.toThrow("already linked to another user");
    });

    it("4.3 解绑次要登录方式 (POST /api/me/providers/:provider/unlink)", async () => {
      const { um, user, token } = await createTestUserSetup();

      // 先绑定一个次要提供商 linuxdo
      await um.linkProvider(user.id, "linuxdo", {
        id: "ld_3301",
        display_name: "NeoLinuxer",
      });

      // 解绑 linuxdo
      const req = new Request("http://localhost:8000/api/me/providers/linuxdo/unlink", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, { userManager: um } as any);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      const ldProv = data.providers.find((p: any) => p.provider === "linuxdo");
      expect(ldProv?.linked).toBe(false);
    });

    it("4.4 当仅有一个登录方式时，拒绝解绑并返回 400 (Cannot unlink sole provider)", async () => {
      const { um, token } = await createTestUserSetup();

      // 用户当前只有 primary_provider: github
      const req = new Request("http://localhost:8000/api/me/providers/github/unlink", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, { userManager: um } as any);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Cannot unlink your only authentication provider");
    });
  });

  describe("5. GET /api/auth/link/:provider 授权入口", () => {
    it("5.1 未登录发起绑定返回 401", async () => {
      const req = new Request("http://localhost:8000/api/auth/link/github");
      const res = await app.fetch(req);
      expect(res.status).toBe(401);
    });

    it("5.2 登录状态发起绑定写入 oauth_link_uid Cookie 并重定向", async () => {
      const { um, token } = await createTestUserSetup();

      const req = new Request("http://localhost:8000/api/auth/link/linuxdo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await app.fetch(req, { userManager: um } as any);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/api/auth/linuxdo");
      expect(res.headers.get("set-cookie")).toContain("oauth_link_uid=");
    });
  });
});
