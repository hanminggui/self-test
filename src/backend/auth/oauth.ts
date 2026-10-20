/**
 * OAuth Provider Matrix (src/backend/auth/oauth.ts)
 * 
 * Implements authorization URL generation, code exchange, and profile retrieval
 * for GitHub, LinuxDo Connect, and Google Identity.
 */

export interface OAuthUserProfile {
  provider: "github" | "linuxdo" | "google";
  provider_id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  metadata?: Record<string, any>;
}

export interface OAuthConfig {
  github: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
  };
  linuxdo: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
  };
}

export class OAuthService {
  private config: OAuthConfig;
  private mockHandlers: Map<string, (code: string) => Promise<OAuthUserProfile>> = new Map();

  constructor(customConfig?: Partial<OAuthConfig>) {
    this.config = {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || "mock_github_client_id",
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "mock_github_client_secret",
        redirectUri: process.env.GITHUB_REDIRECT_URI,
        ...(customConfig?.github || {}),
      },
      linuxdo: {
        clientId: process.env.LINUXDO_CLIENT_ID || "mock_linuxdo_client_id",
        clientSecret: process.env.LINUXDO_CLIENT_SECRET || "mock_linuxdo_client_secret",
        redirectUri: process.env.LINUXDO_REDIRECT_URI,
        ...(customConfig?.linuxdo || {}),
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "mock_google_client_id",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock_google_client_secret",
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        ...(customConfig?.google || {}),
      },
    };
  }

  public setMockHandler(provider: "github" | "linuxdo" | "google", handler: (code: string) => Promise<OAuthUserProfile>): void {
    this.mockHandlers.set(provider, handler);
  }

  public clearMockHandlers(): void {
    this.mockHandlers.clear();
  }

  // --- GitHub OAuth ---

  public getGithubAuthUrl(state: string, redirectUri: string): string {
    const clientId = this.config.github.clientId;
    const targetRedirect = this.config.github.redirectUri || redirectUri;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: targetRedirect,
      scope: "read:user,user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  public async handleGithubCallback(code: string, redirectUri: string): Promise<OAuthUserProfile> {
    if (this.mockHandlers.has("github")) {
      return this.mockHandlers.get("github")!(code);
    }

    const targetRedirect = this.config.github.redirectUri || redirectUri;
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.config.github.clientId,
        client_secret: this.config.github.clientSecret,
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

  public getLinuxDoAuthUrl(state: string, redirectUri: string): string {
    const clientId = this.config.linuxdo.clientId;
    const targetRedirect = this.config.linuxdo.redirectUri || redirectUri;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: targetRedirect,
      state,
    });
    return `https://connect.linux.do/oauth2/authorize?${params.toString()}`;
  }

  public async handleLinuxDoCallback(code: string, redirectUri: string): Promise<OAuthUserProfile> {
    if (this.mockHandlers.has("linuxdo")) {
      return this.mockHandlers.get("linuxdo")!(code);
    }

    const targetRedirect = this.config.linuxdo.redirectUri || redirectUri;
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
        client_id: this.config.linuxdo.clientId,
        client_secret: this.config.linuxdo.clientSecret,
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

  public getGoogleAuthUrl(state: string, redirectUri: string): string {
    const clientId = this.config.google.clientId;
    const targetRedirect = this.config.google.redirectUri || redirectUri;
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

  public async handleGoogleCallback(code: string, redirectUri: string): Promise<OAuthUserProfile> {
    if (this.mockHandlers.has("google")) {
      return this.mockHandlers.get("google")!(code);
    }

    const targetRedirect = this.config.google.redirectUri || redirectUri;
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
        client_id: this.config.google.clientId,
        client_secret: this.config.google.clientSecret,
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
