/**
 * OAuth Provider Matrix (src/backend/auth/oauth.ts)
 * 
 * Implements authorization URL generation, code exchange, and profile retrieval
 * for GitHub, LinuxDo Connect, and Google Identity.
 */

export type OAuthProvider = "github" | "linuxdo" | "google";

export interface OAuthUserProfile {
  provider: OAuthProvider;
  provider_id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  metadata?: Record<string, any>;
}

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  enabled?: boolean;
}

export interface OAuthConfig {
  enabled?: boolean;
  github: OAuthProviderConfig;
  linuxdo: OAuthProviderConfig;
  google: OAuthProviderConfig;
}

function getEnvVal(env: any, key: string): string | undefined {
  if (env && typeof env[key] !== "undefined") {
    return String(env[key]);
  }
  if (typeof process !== "undefined" && process.env && typeof process.env[key] !== "undefined") {
    return process.env[key];
  }
  return undefined;
}

function parseBoolean(val: string | undefined, defaultValue: boolean): boolean {
  if (val === undefined || val === null || val === "") return defaultValue;
  const lower = String(val).trim().toLowerCase();
  if (lower === "true" || lower === "1" || lower === "yes" || lower === "on" || lower === "enabled") return true;
  if (lower === "false" || lower === "0" || lower === "no" || lower === "off" || lower === "disabled") return false;
  return defaultValue;
}

export class OAuthService {
  private config: OAuthConfig;
  private mockHandlers: Map<string, (code: string) => Promise<OAuthUserProfile>> = new Map();
  private runtimeOverrides: Partial<Record<OAuthProvider, boolean>> = {};
  private globalEnabledOverride?: boolean;

  constructor(customConfig?: Partial<OAuthConfig>) {
    this.config = {
      enabled: customConfig?.enabled,
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || "mock_github_client_id",
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "mock_github_client_secret",
        redirectUri: process.env.GITHUB_REDIRECT_URI,
        enabled: customConfig?.github?.enabled,
        ...(customConfig?.github || {}),
      },
      linuxdo: {
        clientId: process.env.LINUXDO_CLIENT_ID || "mock_linuxdo_client_id",
        clientSecret: process.env.LINUXDO_CLIENT_SECRET || "mock_linuxdo_client_secret",
        redirectUri: process.env.LINUXDO_REDIRECT_URI,
        enabled: customConfig?.linuxdo?.enabled,
        ...(customConfig?.linuxdo || {}),
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "mock_google_client_id",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock_google_client_secret",
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        enabled: customConfig?.google?.enabled,
        ...(customConfig?.google || {}),
      },
    };
  }

  public setMockHandler(provider: OAuthProvider, handler: (code: string) => Promise<OAuthUserProfile>): void {
    this.mockHandlers.set(provider, handler);
  }

  public setProviderEnabled(provider: OAuthProvider, enabled: boolean): void {
    this.runtimeOverrides[provider] = enabled;
  }

  public setGlobalAuthEnabled(enabled: boolean): void {
    this.globalEnabledOverride = enabled;
  }

  public clearOverrides(): void {
    this.runtimeOverrides = {};
    this.globalEnabledOverride = undefined;
  }

  public clearMockHandlers(): void {
    this.mockHandlers.clear();
    this.clearOverrides();
  }

  public isProviderEnabled(provider: OAuthProvider, env?: any): boolean {
    if (this.globalEnabledOverride !== undefined && !this.globalEnabledOverride) {
      return false;
    }
    if (this.runtimeOverrides[provider] !== undefined) {
      return this.runtimeOverrides[provider]!;
    }

    const globalEnv = getEnvVal(env, "AUTH_ENABLED");
    if (globalEnv !== undefined && !parseBoolean(globalEnv, true)) {
      return false;
    }
    if (this.config.enabled === false) {
      return false;
    }

    const envKey = `AUTH_${provider.toUpperCase()}_ENABLED`;
    const envVal = getEnvVal(env, envKey);
    if (envVal !== undefined) {
      return parseBoolean(envVal, true);
    }

    if (this.config[provider]?.enabled !== undefined) {
      return Boolean(this.config[provider].enabled);
    }

    return true;
  }

  public getEnabledProviders(env?: any): Record<OAuthProvider, boolean> {
    return {
      github: this.isProviderEnabled("github", env),
      linuxdo: this.isProviderEnabled("linuxdo", env),
      google: this.isProviderEnabled("google", env),
    };
  }

  // --- GitHub OAuth ---

  public getGithubAuthUrl(state: string, redirectUri: string, env?: any): string {
    const clientId = getEnvVal(env, "GITHUB_CLIENT_ID") || this.config.github.clientId;
    const targetRedirect = getEnvVal(env, "GITHUB_REDIRECT_URI") || this.config.github.redirectUri || redirectUri;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: targetRedirect,
      scope: "read:user,user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  public async handleGithubCallback(code: string, redirectUri: string, env?: any): Promise<OAuthUserProfile> {
    if (this.mockHandlers.has("github")) {
      return this.mockHandlers.get("github")!(code);
    }

    const clientId = getEnvVal(env, "GITHUB_CLIENT_ID") || this.config.github.clientId;
    const clientSecret = getEnvVal(env, "GITHUB_CLIENT_SECRET") || this.config.github.clientSecret;
    const targetRedirect = getEnvVal(env, "GITHUB_REDIRECT_URI") || this.config.github.redirectUri || redirectUri;
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: targetRedirect,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`GitHub token exchange failed: ${err}`);
    }

    const tokenData = (await tokenRes.json()) as any;
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error(`GitHub token exchange returned no access token: ${JSON.stringify(tokenData)}`);
    }

    // 2. Fetch user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Self-Test-Metacognitive-App",
      },
    });

    if (!userRes.ok) {
      throw new Error(`GitHub fetch user profile failed with HTTP ${userRes.status}`);
    }

    const userData = (await userRes.json()) as any;
    let email = userData.email || null;

    // If email is null / private, fetch emails endpoint
    if (!email) {
      try {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Self-Test-Metacognitive-App",
          },
        });
        if (emailsRes.ok) {
          const emails = (await emailsRes.json()) as any[];
          const primaryVerified = emails.find((e) => e.primary && e.verified);
          if (primaryVerified) {
            email = primaryVerified.email;
          } else if (emails.length > 0) {
            email = emails[0].email;
          }
        }
      } catch {}
    }

    return {
      provider: "github",
      provider_id: String(userData.id),
      email,
      display_name: userData.name || userData.login || `github_${userData.id}`,
      avatar_url: userData.avatar_url || null,
      metadata: {
        github_login: userData.login,
        github_id: userData.id,
      },
    };
  }

  // --- LinuxDo OAuth / Connect ---

  public getLinuxDoAuthUrl(state: string, redirectUri: string, env?: any): string {
    const clientId = getEnvVal(env, "LINUXDO_CLIENT_ID") || this.config.linuxdo.clientId;
    const targetRedirect = getEnvVal(env, "LINUXDO_REDIRECT_URI") || this.config.linuxdo.redirectUri || redirectUri;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: targetRedirect,
      state,
    });
    return `https://connect.linux.do/oauth2/authorize?${params.toString()}`;
  }

  public async handleLinuxDoCallback(code: string, redirectUri: string, env?: any): Promise<OAuthUserProfile> {
    if (this.mockHandlers.has("linuxdo")) {
      return this.mockHandlers.get("linuxdo")!(code);
    }

    const clientId = getEnvVal(env, "LINUXDO_CLIENT_ID") || this.config.linuxdo.clientId;
    const clientSecret = getEnvVal(env, "LINUXDO_CLIENT_SECRET") || this.config.linuxdo.clientSecret;
    const targetRedirect = getEnvVal(env, "LINUXDO_REDIRECT_URI") || this.config.linuxdo.redirectUri || redirectUri;
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://connect.linux.do/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: targetRedirect,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`LinuxDo token exchange failed: ${err}`);
    }

    const tokenData = (await tokenRes.json()) as any;
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error(`LinuxDo token exchange returned no access token: ${JSON.stringify(tokenData)}`);
    }

    // 2. Fetch LinuxDo user profile
    const userRes = await fetch("https://connect.linux.do/api/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!userRes.ok) {
      throw new Error(`LinuxDo fetch user profile failed with HTTP ${userRes.status}`);
    }

    const userData = (await userRes.json()) as any;
    const trustLevel = typeof userData.trust_level === "number" ? userData.trust_level : 0;
    const badge = `LinuxDo L${trustLevel}`;

    let avatarUrl = userData.avatar_url || null;
    if (!avatarUrl && userData.avatar_template) {
      avatarUrl = userData.avatar_template.replace("{size}", "120");
      if (avatarUrl.startsWith("/")) {
        avatarUrl = `https://linux.do${avatarUrl}`;
      }
    }

    return {
      provider: "linuxdo",
      provider_id: String(userData.id),
      email: userData.email || null,
      display_name: userData.name || userData.username || `linuxdo_${userData.id}`,
      avatar_url: avatarUrl,
      metadata: {
        username: userData.username,
        trust_level: trustLevel,
        badge,
      },
    };
  }

  // --- Google Identity OAuth ---

  public getGoogleAuthUrl(state: string, redirectUri: string, env?: any): string {
    const clientId = getEnvVal(env, "GOOGLE_CLIENT_ID") || this.config.google.clientId;
    const targetRedirect = getEnvVal(env, "GOOGLE_REDIRECT_URI") || this.config.google.redirectUri || redirectUri;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: targetRedirect,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  public async handleGoogleCallback(code: string, redirectUri: string, env?: any): Promise<OAuthUserProfile> {
    if (this.mockHandlers.has("google")) {
      return this.mockHandlers.get("google")!(code);
    }

    const clientId = getEnvVal(env, "GOOGLE_CLIENT_ID") || this.config.google.clientId;
    const clientSecret = getEnvVal(env, "GOOGLE_CLIENT_SECRET") || this.config.google.clientSecret;
    const targetRedirect = getEnvVal(env, "GOOGLE_REDIRECT_URI") || this.config.google.redirectUri || redirectUri;
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: targetRedirect,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${err}`);
    }

    const tokenData = (await tokenRes.json()) as any;
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error(`Google token exchange returned no access token: ${JSON.stringify(tokenData)}`);
    }

    // 2. Fetch Google user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!userRes.ok) {
      throw new Error(`Google fetch user info failed with HTTP ${userRes.status}`);
    }

    const userData = (await userRes.json()) as any;
    return {
      provider: "google",
      provider_id: userData.sub,
      email: userData.email_verified ? userData.email : userData.email || null,
      display_name: userData.name || userData.email?.split("@")[0] || `google_${userData.sub}`,
      avatar_url: userData.picture || null,
      metadata: {
        google_sub: userData.sub,
        email_verified: Boolean(userData.email_verified),
      },
    };
  }
}

export const oauthService = new OAuthService();
