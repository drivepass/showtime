import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import crypto from "crypto";
import { navoriLogin, navoriGetGroups, navoriGetPlayers, navoriGetPlayersById, navoriGetFolders, navoriGetMedias, navoriGetMediasById, navoriGetTemplates, navoriGetTemplatesById, navoriGetPlaylists, navoriGetPlaylistsById, navoriSetPlaylists, navoriSetPlaylistContents, navoriGetPlaylistContents, navoriGetContentWindow, navoriGetTimeSlots, navoriSetTimeSlots, navoriDeleteTimeSlots } from "./navori";
import { navoriSetMedias, navoriCopyMedias, navoriDeleteMedias, navoriSetTemplates, navoriCopyTemplates, navoriDeleteTemplates, navoriPublishContent, navoriTriggerContent, navoriRemoteSettings, navoriGetContentReport, navoriGetAudienceReport, navoriUploadFile } from "./navori";
import { generateCreative, pollVideoResult, addGeneration, updateGeneration, getHistory, requiresTextRendering } from "./aiStudio";

const CIPHER_ALGO = "aes-256-gcm";

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptPassword(password: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(CIPHER_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), encrypted.toString("hex"), tag.toString("hex")].join(":");
}

function decryptPassword(encrypted: string, secret: string): string | null {
  try {
    const [ivHex, encHex, tagHex] = encrypted.split(":");
    const key = deriveKey(secret);
    const decipher = crypto.createDecipheriv(CIPHER_ALGO, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(Buffer.from(encHex, "hex"), undefined, "utf8") + decipher.final("utf8");
  } catch {
    return null;
  }
}

declare module "express-session" {
  interface SessionData {
    navoriToken?: string;
    username?: string;
    encryptedPassword?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
  const isProduction = process.env.NODE_ENV === "production";

  const PgStore = connectPgSimple(session);
  const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  app.set("trust proxy", 1);

  app.use(
    session({
      store: new PgStore({
        pool: pgPool,
        createTableIfMissing: true,
        tableName: "session",
        ttl: 86400,
        pruneSessionInterval: 60,
      }),
      secret: sessionSecret,
      name: "navori.sid",
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? "none" as const : "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // ── Token refresh helpers ──────────────────────────────────────
  async function refreshNavoriToken(req: Request): Promise<boolean> {
    if (!req.session.username || !req.session.encryptedPassword) return false;
    const password = decryptPassword(req.session.encryptedPassword, sessionSecret);
    if (!password) return false;
    try {
      const result = await navoriLogin(req.session.username, password);
      if (result.success && result.token) {
        req.session.navoriToken = result.token;
        return true;
      }
    } catch {}
    return false;
  }

  function clearSession(req: Request) {
    delete req.session.navoriToken;
    delete req.session.username;
    delete req.session.encryptedPassword;
  }

  async function handleExpiredToken(req: Request, res: Response): Promise<Response> {
    const refreshed = await refreshNavoriToken(req);
    if (refreshed) {
      return res.status(409).json({ message: "Token refreshed, please retry", retryable: true });
    }
    clearSession(req);
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }

  function handleNavoriResult(req: Request, res: Response, result: { success: boolean; error?: string }, dataKey: string, data: any) {
    if (!result.success) {
      if (result.error === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }
      return res.status(502).json({ message: result.error });
    }
    return res.json({ [dataKey]: data });
  }

  // Proactive token refresh middleware — handles container restarts
  app.use("/api", async (req, res, next) => {
    if (req.path.startsWith("/auth/")) return next();
    if (!req.session.navoriToken && req.session.encryptedPassword && req.session.username) {
      await refreshNavoriToken(req);
    }
    next();
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    let result;
    try {
      result = await navoriLogin(username, password);
    } catch {
      return res.status(502).json({ message: "Unable to reach authentication service" });
    }

    if (!result.success) {
      return res.status(401).json({ message: result.error || "Authentication failed" });
    }

    req.session.navoriToken = result.token;
    req.session.username = username;
    req.session.encryptedPassword = encryptPassword(password, sessionSecret);
    req.session.save((saveErr) => {
      if (saveErr) {
        return res.status(500).json({ message: "Session error" });
      }
      return res.json({ user: { username }, token: result.token });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("navori.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session.navoriToken && req.session.username) {
      return res.json({ user: { username: req.session.username }, token: req.session.navoriToken });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });

  app.post("/api/auth/refresh", async (req, res) => {
    if (!req.session.username || !req.session.encryptedPassword) {
      return res.status(401).json({ message: "No stored credentials" });
    }
    const refreshed = await refreshNavoriToken(req);
    if (refreshed) {
      return res.json({ user: { username: req.session.username }, token: req.session.navoriToken });
    }
    clearSession(req);
    return res.status(401).json({ message: "Refresh failed. Please log in again." });
  });

  app.get("/api/groups", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const filter = req.query.filter as string | undefined;

    try {
      const result = await navoriGetGroups(req.session.navoriToken, filter);
      if (!result.success && result.error === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }
      return handleNavoriResult(req, res, result, "groups", result.groups);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.get("/api/players", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const filter = req.query.filter as string | undefined;

    try {
      const result = await navoriGetPlayers(req.session.navoriToken, filter);
      if (!result.success && result.error === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }
      if (!result.success || !result.players?.length) {
        return handleNavoriResult(req, res, result, "players", result.players);
      }

      // Enrich with detail fields from GetPlayersById for monitoring dashboard
      try {
        const ids = result.players.map((p: any) => p.Id);
        const detailResult = await navoriGetPlayersById(req.session.navoriToken, ids);
        if (detailResult.success && detailResult.players?.length) {
          const detailMap = new Map<number, any>();
          for (const dp of detailResult.players) {
            if (dp.Id != null) detailMap.set(dp.Id, dp);
          }
          const enrichFields = [
            "LastNotify", "Plan", "SerialNumber", "TechnicalProfileId",
            "OsVersion", "PlayerVersion", "Model", "FreeSpace",
            "Resolution", "IpAddress", "LastConnection",
          ];
          for (const p of result.players) {
            const detail = detailMap.get(p.Id);
            if (detail) {
              for (const field of enrichFields) {
                if (detail[field] != null && !p[field]) {
                  p[field] = detail[field];
                }
              }
            }
          }
        }
      } catch {
        // If enrichment fails, return players without detail fields — frontend handles missing values
      }

      return handleNavoriResult(req, res, result, "players", result.players);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/players/details", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Player IDs are required" });
    }

    try {
      const result = await navoriGetPlayersById(req.session.navoriToken, ids);
      if (!result.success && result.error === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }
      return handleNavoriResult(req, res, result, "players", result.players);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/content-window", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { groupId, folderId, folderType, filter } = req.body;
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Valid groupId is required" });
    }
    if (!Number.isFinite(folderId)) {
      return res.status(400).json({ message: "Valid folderId is required" });
    }

    try {
      const result = await navoriGetContentWindow(req.session.navoriToken, groupId, folderId, folderType || 1, filter);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Navori API error" });
      }
      return res.json({
        medias: result.medias || [],
        templates: result.templates || [],
        folders: result.folders || [],
        feeds: result.feeds || [],
        banners: result.banners || [],
      });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.get("/api/folders", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const groupId = parseInt(req.query.groupId as string);
    const filter = typeof req.query.filter === "string" ? req.query.filter : undefined;
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Valid groupId is required" });
    }

    try {
      const result = await navoriGetFolders(req.session.navoriToken, groupId, filter);

      if (result.success) {
        return res.json({ folders: result.folders || [] });
      }

      if (result.error !== "NOT_AUTHORIZED") {
        return res.status(502).json({ message: result.error || "Unable to fetch folders" });
      }

      const fallback = await navoriGetContentWindow(req.session.navoriToken, groupId, 0, 1, filter);
      if (fallback.success) {
        return res.json({ folders: fallback.folders || [] });
      }

      return handleExpiredToken(req, res);
    } catch (error: any) {
      return res.status(502).json({ message: error?.message || "Unable to reach Navori API" });
    }
  });

  app.get("/api/medias", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const groupId = parseInt(req.query.groupId as string);
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Valid groupId is required" });
    }

    const filter = req.query.filter as string | undefined;
    const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;

    try {
      const result = await navoriGetMedias(req.session.navoriToken, groupId, filter, folderId);
      return handleNavoriResult(req, res, result, "medias", result.medias);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/medias/details", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return res.status(400).json({ message: "Valid media IDs array required (1-100 items)" });
    }
    if (!ids.every((id: any) => typeof id === "number" && Number.isFinite(id) && id > 0)) {
      return res.status(400).json({ message: "All IDs must be positive numbers" });
    }

    try {
      const result = await navoriGetMediasById(req.session.navoriToken, ids);
      if (!result.success && result.error === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }
      return handleNavoriResult(req, res, result, "medias", result.medias);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/medias/set", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { medias } = req.body;
    if (!medias || !Array.isArray(medias) || medias.length === 0 || medias.length > 100) {
      return res.status(400).json({ message: "Valid medias array required (1-100 items)" });
    }

    try {
      const result = await navoriSetMedias(req.session.navoriToken, medias);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to save medias" });
      }
      return res.json({ success: true, medias: result.medias || [] });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.get("/api/templates", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const groupId = parseInt(req.query.groupId as string);
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Valid groupId is required" });
    }

    try {
      const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;
      const result = await navoriGetTemplates(req.session.navoriToken, groupId, undefined, folderId);
      return handleNavoriResult(req, res, result, "templates", result.templates);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/templates/details", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return res.status(400).json({ message: "Valid template IDs array required (1-100 items)" });
    }
    if (!ids.every((id: any) => typeof id === "number" && Number.isFinite(id) && id > 0)) {
      return res.status(400).json({ message: "All IDs must be positive numbers" });
    }

    try {
      const result = await navoriGetTemplatesById(req.session.navoriToken, ids);
      if (!result.success && result.error === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }
      return handleNavoriResult(req, res, result, "templates", result.templates);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/templates/set", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { templates } = req.body;
    if (!templates || !Array.isArray(templates) || templates.length === 0 || templates.length > 100) {
      return res.status(400).json({ message: "Valid templates array required (1-100 items)" });
    }

    try {
      const result = await navoriSetTemplates(req.session.navoriToken, templates);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to save templates" });
      }
      return res.json({ success: true, templates: result.templates || [] });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/medias/delete", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { medias } = req.body;
    if (!medias || !Array.isArray(medias) || medias.length === 0) {
      return res.status(400).json({ message: "Valid medias array required" });
    }
    try {
      const result = await navoriDeleteMedias(req.session.navoriToken, medias);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to delete medias" });
      }
      return res.json({ success: true });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/medias/copy", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { idList, groupId, folderId } = req.body;
    if (!idList || !Array.isArray(idList) || idList.length === 0) {
      return res.status(400).json({ message: "Valid idList array required" });
    }
    if (!groupId || !Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Valid groupId required" });
    }
    try {
      const result = await navoriCopyMedias(req.session.navoriToken, idList, groupId, folderId || 0);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to copy medias" });
      }
      return res.json({ success: true });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/templates/delete", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { templates } = req.body;
    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ message: "Valid templates array required" });
    }
    try {
      const result = await navoriDeleteTemplates(req.session.navoriToken, templates);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to delete templates" });
      }
      return res.json({ success: true });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/templates/copy", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { idList, groupId, folderId } = req.body;
    if (!idList || !Array.isArray(idList) || idList.length === 0) {
      return res.status(400).json({ message: "Valid idList array required" });
    }
    if (!groupId || !Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Valid groupId required" });
    }
    try {
      const result = await navoriCopyTemplates(req.session.navoriToken, idList, groupId, folderId || 0);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to copy templates" });
      }
      return res.json({ success: true });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/medias/upload", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const contentType = req.headers["content-type"] || "";
    console.log('[UPLOAD REQUEST]', 'contentType:', contentType);
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ message: "Multipart form data required" });
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", async () => {
      const body = Buffer.concat(chunks);
      console.log('[UPLOAD REQUEST]', 'bodySize:', body.length);
      try {
        const result = await navoriUploadFile(req.session.navoriToken!, body, contentType);
        console.log('[UPLOAD RESULT]', JSON.stringify(result).slice(0, 500));
        if (!result.success) {
          return res.status(502).json({ message: result.error || "Upload failed" });
        }
        return res.json({ success: true, media: result.media });
      } catch {
        return res.status(502).json({ message: "Unable to reach Navori API" });
      }
    });
    req.on("error", () => res.status(502).json({ message: "Request error during upload" }));
  });

  app.get("/api/playlists", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const groupId = parseInt(req.query.groupId as string);
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Valid groupId is required" });
    }

    try {
      const result = await navoriGetPlaylists(req.session.navoriToken, groupId);
      return handleNavoriResult(req, res, result, "playlists", result.playlists);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/playlists/details", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return res.status(400).json({ message: "Valid playlist IDs array required (1-100 items)" });
    }
    if (!ids.every((id: any) => typeof id === "number" && Number.isFinite(id) && id > 0)) {
      return res.status(400).json({ message: "All IDs must be positive numbers" });
    }

    try {
      const result = await navoriGetPlaylistsById(req.session.navoriToken, ids);
      if (!result.success && result.error === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }
      return handleNavoriResult(req, res, result, "playlists", result.playlists);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/playlists/set", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { playlists } = req.body;
    if (!playlists || !Array.isArray(playlists) || playlists.length === 0 || playlists.length > 100) {
      return res.status(400).json({ message: "Valid playlists array required (1-100 items)" });
    }

    try {
      const result = await navoriSetPlaylists(req.session.navoriToken, playlists);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to save playlists" });
      }
      return res.json({ success: true, playlists: result.playlists || [] });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/playlists/contents/set", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { contents } = req.body;
    if (!contents || !Array.isArray(contents) || contents.length === 0 || contents.length > 500) {
      return res.status(400).json({ message: "Valid contents array required (1-500 items)" });
    }

    for (const content of contents) {
      if (!Number.isFinite(content?.PlaylistId) || content.PlaylistId <= 0) {
        return res.status(400).json({ message: "Each content item must include a valid PlaylistId" });
      }
      if (!Number.isFinite(content?.ContentId) || content.ContentId <= 0) {
        return res.status(400).json({ message: "Each content item must include a valid ContentId" });
      }
      if (content?.Type !== "Media" && content?.Type !== "Template") {
        return res.status(400).json({ message: 'Each content item Type must be either "Media" or "Template"' });
      }
    }

    try {
      console.log("[PLAYLIST CONTENTS SET] incoming:", JSON.stringify(req.body));

      // Group new items by playlist so we can fetch+append for each
      const byPlaylist = new Map<number, typeof contents>();
      for (const item of contents) {
        const list = byPlaylist.get(item.PlaylistId) || [];
        list.push(item);
        byPlaylist.set(item.PlaylistId, list);
      }

      for (const [playlistId, newItems] of byPlaylist) {
        // 1. GET existing contents for this playlist
        const existing = await navoriGetPlaylistContents(req.session.navoriToken!, playlistId);
        if (!existing.success && existing.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        const existingContents: any[] = existing.contents || [];
        console.log("[PLAYLIST CONTENTS SET] existing for playlist", playlistId, ":", existingContents.length, "items");

        // 2. Normalize existing items to minimal shape (preserve real Ids) and append new items
        const merged: any[] = existingContents.map((item: any, idx: number) => ({
          Id: item.Id,
          ContentId: item.ContentId,
          Index: Number.isFinite(item.Index) ? item.Index : idx,
          PlaylistId: playlistId,
          Type: item.Type,
        }));
        for (const newItem of newItems) {
          merged.push({
            Id: 0,
            ContentId: newItem.ContentId,
            Index: merged.length,
            PlaylistId: playlistId,
            Type: newItem.Type,
          });
        }

        // 3. SET the complete array back to Navori
        console.log("[PLAYLIST CONTENTS SET] sending merged array:", JSON.stringify(merged));
        const result = await navoriSetPlaylistContents(req.session.navoriToken!, merged);
        console.log("[PLAYLIST CONTENTS RESULT]", JSON.stringify(result));
        if (!result.success) {
          if (result.error === "NOT_AUTHORIZED") {
            return handleExpiredToken(req, res);
          }
          return res.status(502).json({ message: result.error || "Unable to save playlist contents" });
        }
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("[PLAYLIST CONTENTS SET ERROR]", err);
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.get("/api/playlists/:playlistId/contents", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const playlistId = parseInt(req.params.playlistId);
    if (!Number.isFinite(playlistId) || playlistId <= 0) {
      return res.status(400).json({ message: "Valid playlistId is required" });
    }

    try {
      const result = await navoriGetPlaylistContents(req.session.navoriToken, playlistId);
      return handleNavoriResult(req, res, result, "contents", result.contents);
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/timeslots", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { groupId, fromDate, toDate } = req.body;
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Valid groupId is required" });
    }

    try {
      const result = await navoriGetTimeSlots(req.session.navoriToken, groupId, fromDate, toDate);
      if (!result.success) {
        return res.json({ timeslots: [] });
      }
      return res.json({ timeslots: result.timeslots || [] });
    } catch {
      return res.json({ timeslots: [] });
    }
  });

  app.post("/api/timeslots/set", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { timeslots } = req.body;
    if (!timeslots || !Array.isArray(timeslots) || timeslots.length === 0 || timeslots.length > 500) {
      return res.status(400).json({ message: "Valid timeslots array required (1-500 items)" });
    }

    for (const slot of timeslots) {
      if (!Number.isFinite(slot?.GroupId) || slot.GroupId <= 0) {
        return res.status(400).json({ message: "Each time slot must include a valid GroupId" });
      }
    }

    try {
      console.log("[TIMESLOTS SET] payload:", JSON.stringify(req.body));

      // Fetch existing timeslots for this group so we don't wipe them
      const firstSlot = timeslots[0] || {};
      const groupId = firstSlot.GroupId;
      const fromDates = timeslots.map((s: any) => s.FromDate).filter(Boolean).sort();
      const toDates = timeslots.map((s: any) => s.ToDate).filter(Boolean).sort();
      const fromDate = fromDates[0];
      const toDate = toDates[toDates.length - 1];

      const existingRes = await navoriGetTimeSlots(req.session.navoriToken!, groupId, fromDate, toDate);
      if (!existingRes.success && existingRes.error === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }
      const existing = existingRes.timeslots || [];
      console.log("[TIMESLOTS SET] existing for group", groupId, ":", existing.length, "items");

      // Merge: keep existing slots that aren't being updated, plus all incoming
      const incomingIds = new Set(
        timeslots.filter((s: any) => Number.isFinite(s?.Id) && s.Id > 0).map((s: any) => s.Id)
      );
      const merged = [
        ...existing.filter((s: any) => !incomingIds.has(s.Id)),
        ...timeslots,
      ];
      console.log("[TIMESLOTS SET] sending merged array:", merged.length, "items");

      const result = await navoriSetTimeSlots(req.session.navoriToken, merged);
      console.log("[TIMESLOTS RESULT]:", JSON.stringify(result));
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to save time slots" });
      }
      return res.json({ success: true, timeslots: result.timeslots || [] });
    } catch (err) {
      console.error("[TIMESLOTS SET ERROR]", err);
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/timeslots/delete", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { timeSlotIds } = req.body;
    if (!timeSlotIds || !Array.isArray(timeSlotIds) || timeSlotIds.length === 0 || timeSlotIds.length > 500) {
      return res.status(400).json({ message: "Valid timeSlotIds array required (1-500 items)" });
    }

    for (const id of timeSlotIds) {
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ message: "Each time slot ID must be a positive number" });
      }
    }

    try {
      const result = await navoriDeleteTimeSlots(req.session.navoriToken, timeSlotIds);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to delete time slots" });
      }
      return res.json({ success: true });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/player-control/publish", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { groupId, playerIds } = req.body;
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Valid groupId is required" });
    }
    if (playerIds && (!Array.isArray(playerIds) || playerIds.some((id: any) => !Number.isFinite(id) || id <= 0))) {
      return res.status(400).json({ message: "playerIds must be an array of positive numbers" });
    }

    try {
      const result = await navoriPublishContent(req.session.navoriToken, groupId, playerIds);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to publish content" });
      }
      return res.json({ success: true });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/player-control/trigger", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { playerId, contentId, contentType } = req.body;
    if (!Number.isFinite(playerId) || playerId <= 0) {
      return res.status(400).json({ message: "Valid playerId is required" });
    }
    if (!Number.isFinite(contentId) || contentId <= 0) {
      return res.status(400).json({ message: "Valid contentId is required" });
    }
    if (!contentType || typeof contentType !== "string") {
      return res.status(400).json({ message: "contentType is required" });
    }

    try {
      const result = await navoriTriggerContent(req.session.navoriToken, playerId, contentId, contentType);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to trigger content" });
      }
      return res.json({ success: true });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/player-control/remote-settings", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { playerIds, action, groupId } = req.body;
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ message: "playerIds array is required" });
    }
    for (const id of playerIds) {
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ message: "Each player ID must be a positive number" });
      }
    }
    if (!action || typeof action !== "string") {
      return res.status(400).json({ message: "action is required (e.g. DisplayOn, DisplayOff, Reboot)" });
    }

    const validActions = ["DisplayOn", "DisplayOff", "Reboot", "Restart", "Screenshot", "ClearCache"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: "Invalid action. Must be one of: " + validActions.join(", ") });
    }

    try {
      const result = await navoriRemoteSettings(req.session.navoriToken, playerIds, action, groupId);
      if (!result.success) {
        if (result.error === "NOT_AUTHORIZED") {
          return handleExpiredToken(req, res);
        }
        return res.status(502).json({ message: result.error || "Unable to apply remote settings" });
      }
      return res.json({ success: true });
    } catch {
      return res.status(502).json({ message: "Unable to reach Navori API" });
    }
  });

  app.post("/api/reports/content", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { groupId, dateFrom, dateTo, aggregation, playedInFull, search } = req.body;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    try {
      const result = await navoriGetContentReport(req.session.navoriToken, {
        ...(groupId ? { GroupId: groupId } : {}),
        DateFrom: dateFrom,
        DateTo: dateTo,
        ...(aggregation ? { Aggregation: aggregation } : {}),
        ...(playedInFull && playedInFull !== "All" ? { PlayedInFull: playedInFull } : {}),
        ...(search ? { Search: search } : {}),
      });

      if (result.Status === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }

      return res.json(result);
    } catch {
      return res.status(502).json({ message: "Unable to fetch content report" });
    }
  });

  app.post("/api/reports/audience", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { groupId, dateFrom, dateTo, search } = req.body;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    try {
      const result = await navoriGetAudienceReport(req.session.navoriToken, {
        ...(groupId ? { GroupId: groupId } : {}),
        DateFrom: dateFrom,
        DateTo: dateTo,
        ...(search ? { Search: search } : {}),
      });

      if (result.Status === "NOT_AUTHORIZED") {
        return handleExpiredToken(req, res);
      }

      return res.json(result);
    } catch {
      return res.status(502).json({ message: "Unable to fetch audience report" });
    }
  });

  app.get("/api/thumbnail/*", async (req, res) => {
    if (!req.session.navoriToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const rawPath = (req.params as Record<string, string>)[0];
    if (!rawPath) {
      return res.status(400).json({ message: "Thumbnail path required" });
    }

    try {
      const thumbnailPath = decodeURIComponent(rawPath);
      const navoriUrl = new URL("https://saas.navori.com/NavoriService/MediaUpload.aspx");
      navoriUrl.searchParams.set("key", thumbnailPath);
      const response = await fetch(navoriUrl.toString(), {
        headers: { "Token": req.session.navoriToken! },
      });

      if (!response.ok) {
        return res.status(response.status).end();
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("image") || contentType.includes("octet") || contentType.includes("jpeg") || contentType.includes("png")) {
        res.set("Content-Type", contentType);
        res.set("Cache-Control", "public, max-age=3600");
        const buffer = Buffer.from(await response.arrayBuffer());
        return res.send(buffer);
      }

      return res.status(404).end();
    } catch {
      return res.status(502).json({ message: "Unable to fetch thumbnail" });
    }
  });

  // ── AI Content Studio ──────────────────────────────────────────
  app.post("/api/aistudio/generate4", async (req: Request, res: Response) => {
    const {
      prompt,
      content_type = "Static",
      use_case = "Promotion",
      orientation = "Landscape",
      resolution = "1920x1080",
      aspect_ratio = "16:9",
    } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ message: "prompt is required" });
    }
    if (!process.env.IDEOGRAM_API_KEY) {
      return res.status(503).json({ message: "IDEOGRAM_API_KEY is not configured." });
    }

    // Map orientation to aspect ratio if not explicitly set by frontend
    const resolvedAspectRatio = aspect_ratio !== "16:9"
      ? aspect_ratio
      : (orientation === "Portrait" ? "9:16" : "16:9");

    // Build context prefix from configuration
    const configContext = [
      content_type !== "Static" ? `${content_type} digital signage` : "digital signage display",
      use_case ? `for ${use_case.toLowerCase()} purposes` : "",
      orientation ? `in ${orientation.toLowerCase()} orientation` : "",
      resolution ? `at ${resolution} resolution` : "",
    ].filter(Boolean).join(", ");

    const styleVariants = [
      { title: "Showroom Showcase", suffix: "cinematic lighting, premium quality, ultra-realistic photography" },
      { title: "Bold Statement",    suffix: "bold composition, high contrast, modern graphic design" },
      { title: "Dynamic Lifestyle", suffix: "dynamic angle, vibrant atmosphere, aspirational lifestyle" },
      { title: "Clean & Premium",   suffix: "clean minimal background, sleek presentation, luxury feel" },
    ];

    console.log(`[AI Studio] generate4 | aspect=${resolvedAspectRatio} | orientation=${orientation} | use_case=${use_case}`);

    try {
      const results = await Promise.allSettled(
        styleVariants.map(async (v) => {
          const enhancedPrompt = `${prompt}. Style: ${v.suffix}. Context: ${configContext}.`;
          const result = await generateCreative(enhancedPrompt, "image", null, resolvedAspectRatio);
          const entry = addGeneration({
            prompt: enhancedPrompt,
            mediaUrl: (result as any).mediaUrl || null,
            model: result.model,
            outputType: "image",
            isDraft: false,
            status: "completed",
          });
          return { ...entry, variantTitle: v.title };
        })
      );
      const options = results.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : { id: `err-${i}`, variantTitle: styleVariants[i].title, mediaUrl: null, error: (r as any).reason?.message }
      );
      return res.json({ options, prompt, model: "ideogram-v2-turbo" });
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.message || "Generation failed";
      return res.status(500).json({ message: detail });
    }
  });

  app.post("/api/aistudio/generate", async (req: Request, res: Response) => {
    const { prompt, output_type = "image", reference_image_url = null } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ message: "prompt is required" });
    }
    const falKeyMissing = !process.env.FAL_KEY;
    const ideogramKeyMissing = !process.env.IDEOGRAM_API_KEY;
    if (falKeyMissing && output_type !== "image") {
      return res.status(503).json({ message: "FAL_KEY is not configured. Add it to Replit Secrets." });
    }
    if (falKeyMissing && output_type === "image" && !requiresTextRendering(prompt)) {
      return res.status(503).json({ message: "FAL_KEY is not configured. Add it to Replit Secrets." });
    }
    if (ideogramKeyMissing && output_type === "image" && requiresTextRendering(prompt)) {
      return res.status(503).json({ message: "IDEOGRAM_API_KEY is not configured. Add it to Replit Secrets." });
    }
    try {
      const result = await generateCreative(prompt, output_type, reference_image_url);
      const entry = addGeneration({
        prompt,
        mediaUrl: (result as any).mediaUrl || null,
        model: result.model,
        outputType: output_type,
        isDraft: !!(result as any).isDraft,
        requestId: (result as any).requestId,
        status: (result as any).status || "completed",
        fallbackNote: (result as any).fallbackNote,
      });
      return res.json(entry);
    } catch (err: any) {
      // Handle both @fal-ai/client SDK errors (err.status, err.body) and axios errors (err.response.status, err.response.data)
      const status = err?.status ?? err?.response?.status;
      const body = err?.body ?? err?.response?.data;
      const detail = body?.detail || body?.message || err?.message || "Generation failed";
      console.error("[AI Studio] generate error:", status, detail);
      if (status === 403 || detail.toLowerCase().includes("exhausted") || detail.toLowerCase().includes("balance") || detail.toLowerCase().includes("locked") || detail.toLowerCase().includes("forbidden")) {
        return res.status(402).json({ message: "fal.ai account balance exhausted. Top up at fal.ai/dashboard/billing to generate images." });
      }
      if (status === 401 || detail.toLowerCase().includes("unauthorized") || detail.toLowerCase().includes("authentication is required")) {
        return res.status(401).json({ message: "fal.ai API key is invalid. Check your FAL_KEY secret." });
      }
      return res.status(500).json({ message: detail });
    }
  });

  app.get("/api/aistudio/status/:requestId", async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { model } = req.query as { model: string };
    if (!requestId || !model) {
      return res.status(400).json({ message: "requestId and model are required" });
    }
    try {
      const result = await pollVideoResult(requestId, model);
      if (result.status === "completed" && result.mediaUrl) {
        updateGeneration(requestId, { status: "completed", mediaUrl: result.mediaUrl });
      }
      return res.json(result);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const body = err?.body ?? err?.response?.data;
      const detail = body?.detail || body?.message || err?.message || "Poll failed";
      console.error("[AI Studio] poll error:", status, detail);
      if (status === 403 || detail.toLowerCase().includes("exhausted") || detail.toLowerCase().includes("balance") || detail.toLowerCase().includes("forbidden") || detail.toLowerCase().includes("locked")) {
        return res.json({ status: "failed", error: "fal.ai account balance exhausted. Video generation requires fal.ai credits. Top up at fal.ai/dashboard/billing." });
      }
      return res.json({ status: "failed", error: detail });
    }
  });

  app.get("/api/aistudio/history", (_req: Request, res: Response) => {
    return res.json({ history: getHistory() });
  });

  // ── AI Content Studio: simple 4-variation generation ───────────
  app.post("/api/ai/generate", async (req: Request, res: Response) => {
    try {
      const { prompt, orientation, aspectRatio, model } = req.body || {};
      console.log('[AI GENERATE] model:', model, 'prompt:', prompt.substring(0, 50))
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const variations = [
        { suffix: ", photorealistic automotive showroom, professional studio lighting, ultra high quality", label: "Option 1: Showroom Showcase" },
        { suffix: ", dramatic low angle, dark luxury background, premium feel, cinematic", label: "Option 2: Detail Focus" },
        { suffix: ", lifestyle outdoor setting, golden hour lighting, aspirational, wide shot", label: "Option 3: Lifestyle Drive" },
        { suffix: ", close-up detail shot, premium materials, minimalist composition", label: "Option 4: Interior Luxury" },
      ];

      if (model === "ideogram") {
        // Ideogram v2 Turbo via fal.ai
        if (!process.env.FAL_KEY) {
          return res.status(500).json({ error: "FAL_KEY not configured" });
        }

        const results = await Promise.all(
          variations.map(async (v) => {
            const variationPrompt = prompt + v.suffix;
            const response = await fetch('https://fal.run/fal-ai/ideogram/v2/turbo', {
              method: 'POST',
              headers: {
                'Authorization': `Key ${process.env.FAL_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                prompt: variationPrompt,
                aspect_ratio: aspectRatio === '9:16' ? 'ASPECT_9_16' : aspectRatio === '1:1' ? 'ASPECT_1_1' : 'ASPECT_16_9',
                style: 'REALISTIC',
                num_images: 1,
                magic_prompt_option: 'AUTO'
              })
            })
            const data = await response.json()
            console.log('[IDEOGRAM] response:', JSON.stringify(data).substring(0, 200))
            const url = data?.images?.[0]?.url
            if (!url) throw new Error('No image returned from Ideogram: ' + JSON.stringify(data))
            return { url, label: v.label }
          })
        );

        return res.json({ images: results });
      }

      // Default: FLUX.1 Pro via fal.ai
      if (!process.env.FAL_KEY) {
        return res.status(500).json({ error: "FAL_KEY not configured" });
      }

      const imageSize = orientation === "Portrait" ? "portrait_16_9" : "landscape_16_9";

      const results = await Promise.all(
        variations.map(async (v) => {
          const response = await fetch("https://fal.run/fal-ai/flux/dev", {
            method: "POST",
            headers: {
              "Authorization": `Key ${process.env.FAL_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: prompt + v.suffix,
              num_images: 1,
              image_size: imageSize,
              num_inference_steps: 28,
              guidance_scale: 3.5,
            }),
          });
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`fal.ai ${response.status}: ${text}`);
          }
          const data: any = await response.json();
          const url = data?.images?.[0]?.url;
          if (!url) throw new Error("No image returned from fal.ai");
          return { url, label: v.label };
        })
      );

      return res.json({ images: results });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Generation failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
