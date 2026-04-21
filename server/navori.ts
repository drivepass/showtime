const NAVORI_API_URL = "https://saas.navori.com/NavoriService/api/";
const NAVORI_QL_URL = "https://saas.navori.com/NavoriService/QLService/";

export async function navoriSetMedias(token: string, mediaList: any[]): Promise<{ success: boolean; medias?: any[]; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}SetMedias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ MediaList: mediaList }),
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }
  if (data.Status === "SUCCESS") {
    return { success: true, medias: data.MediaList || [] };
  }
  return { success: false, error: data.Status || "Failed to set medias" };
}

export async function navoriCopyMedias(token: string, idList: number[], groupId: number, folderId: number): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}CopyMedias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ IdList: idList, GroupId: groupId, FolderId: folderId }),
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }
  if (data.Status === "SUCCESS") {
    return { success: true };
  }
  return { success: false, error: data.Status || "Failed to copy medias" };
}

export async function navoriDeleteMedias(token: string, mediaList: any[]): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}DeleteMedias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ MediaList: mediaList }),
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }
  if (data.Status === "SUCCESS") {
    return { success: true };
  }
  return { success: false, error: data.Status || "Failed to delete medias" };
}

// Template CRUD
export async function navoriSetTemplates(token: string, templateList: any[]): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}SetTemplates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ TemplateList: templateList }),
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }
  if (data.Status === "SUCCESS") {
    return { success: true, templates: data.TemplateList || [] };
  }
  return { success: false, error: data.Status || "Failed to set templates" };
}

export async function navoriCopyTemplates(token: string, idList: number[], groupId: number, folderId: number): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}CopyTemplates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ IdList: idList, GroupId: groupId, FolderId: folderId }),
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }
  if (data.Status === "SUCCESS") {
    return { success: true };
  }
  return { success: false, error: data.Status || "Failed to copy templates" };
}

export async function navoriDeleteTemplates(token: string, templateList: any[]): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}DeleteTemplates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ TemplateList: templateList }),
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }
  if (data.Status === "SUCCESS") {
    return { success: true };
  }
  return { success: false, error: data.Status || "Failed to delete templates" };
}

export async function navoriGetContentWindow(token: string, groupId: number, folderId: number, folderType: number = 1, filter?: string): Promise<{ success: boolean; medias?: any[]; templates?: any[]; folders?: any[]; feeds?: any[]; banners?: any[]; error?: string }> {
  const body: any = {
    GroupId: groupId,
    FolderId: folderId,
    FolderType: folderType,
    WithFolder: false,
    Filter: filter || "",
  };

  const response = await fetch(`${NAVORI_QL_URL}GetContentWindow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return {
      success: true,
      medias: data.ListMedia || [],
      templates: data.ListTemplate || [],
      folders: data.ListFolder || [],
      feeds: data.ListFeed || [],
      banners: data.ListBanner || [],
    };
  }

  return { success: false, error: data.Status || "Failed to fetch content window" };
}

export async function navoriGetFolders(token: string, groupId: number, filter?: string): Promise<{ success: boolean; folders?: any[]; error?: string }> {
  const body: any = { GroupId: groupId };
  if (filter) body.Filter = filter;

  const response = await fetch(`${NAVORI_API_URL}GetFolders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, folders: data.FolderList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch folders" };
}

export async function navoriGetMedias(token: string, groupId: number, filter?: string, folderId?: number): Promise<{ success: boolean; medias?: any[]; error?: string }> {
  const body: any = { GroupId: groupId };
  if (filter) body.Filter = filter;
  if (folderId) body.FolderId = folderId;

  const response = await fetch(`${NAVORI_API_URL}GetMedias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, medias: data.MediaList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch medias" };
}

export async function navoriGetMediasById(token: string, idList: number[]): Promise<{ success: boolean; medias?: any[]; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}GetMediasById`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ IdList: idList }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, medias: data.MediaList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch media details" };
}

export async function navoriGetTemplates(token: string, groupId: number, filter?: string, folderId?: number): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  const body: any = { GroupId: groupId };
  if (filter) body.Filter = filter;
  if (folderId) body.FolderId = folderId;

  const response = await fetch(`${NAVORI_API_URL}GetTemplates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, templates: data.TemplateList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch templates" };
}

export async function navoriGetTemplatesById(token: string, idList: number[]): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}GetTemplatesById`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ IdList: idList }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, templates: data.TemplateList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch template details" };
}

export async function navoriGetPlaylists(token: string, groupId: number, filter?: string): Promise<{ success: boolean; playlists?: any[]; error?: string }> {
  const body: any = { GroupId: groupId };
  if (filter) body.Filter = filter;

  const response = await fetch(`${NAVORI_API_URL}GetPlaylists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, playlists: data.PlaylistList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch playlists" };
}

export async function navoriGetPlaylistsById(token: string, idList: number[]): Promise<{ success: boolean; playlists?: any[]; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}GetPlaylistsById`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ IdList: idList }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, playlists: data.PlaylistList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch playlist details" };
}

export async function navoriSetPlaylists(token: string, playlistList: any[]): Promise<{ success: boolean; playlists?: any[]; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}SetPlaylists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ PlaylistList: playlistList }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, playlists: data.PlaylistList || [] };
  }

  return { success: false, error: data.Status || "Failed to set playlists" };
}

export async function navoriSetPlaylistContents(token: string, playlistContentList: any[]): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}SetPlaylistContents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ PlaylistContentList: playlistContentList }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true };
  }

  return { success: false, error: data.Status || "Failed to set playlist contents" };
}

export async function navoriGetPlaylistContents(token: string, playlistId: number): Promise<{ success: boolean; contents?: any[]; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}GetPlaylistContents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ PlaylistId: playlistId }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, contents: data.PlaylistContentList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch playlist contents" };
}

export async function navoriGetGroups(token: string, filter?: string): Promise<{ success: boolean; groups?: any[]; error?: string }> {
  const body: any = {};
  if (filter) body.Filter = filter;

  const response = await fetch(`${NAVORI_API_URL}GetGroups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, groups: data.GroupList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch groups" };
}

export async function navoriGetPlayers(token: string, filter?: string): Promise<{ success: boolean; players?: any[]; error?: string }> {
  const body: any = {};
  if (filter) body.Filter = filter;

  const response = await fetch(`${NAVORI_API_URL}GetPlayers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, players: data.PlayerList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch players" };
}

export async function navoriGetPlayersById(token: string, idList: number[]): Promise<{ success: boolean; players?: any[]; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}GetPlayersById`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ IdList: idList }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true, players: data.PlayerList || [] };
  }

  return { success: false, error: data.Status || "Failed to fetch player details" };
}

export async function navoriLogin(login: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}GetToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ Login: login, Password: password }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS" && data.Token) {
    return { success: true, token: data.Token };
  }

  if (data.Status === "NOT_AUTHORIZED") {
    return { success: false, error: "Invalid username or password" };
  }

  return { success: false, error: data.Status || "Authentication failed" };
}

export async function navoriGetTimeSlots(token: string, groupId: number, fromDate?: string, toDate?: string): Promise<{ success: boolean; timeslots?: any[]; error?: string }> {
  const body: any = { GroupId: groupId };
  if (fromDate) body.FromDate = fromDate;
  if (toDate) body.ToDate = toDate;

  const response = await fetch(`${NAVORI_API_URL}GetTimeSlots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(body),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    if (data.TimeSlotList === undefined && data.TimeSlots === undefined && data.ListTimeSlot === undefined) {
      console.warn("[navori] GetTimeSlots: none of TimeSlotList/TimeSlots/ListTimeSlot present in response. Keys:", Object.keys(data));
    }
    return {
      success: true,
      timeslots: data.TimeSlotList || data.TimeSlots || data.ListTimeSlot || [],
    };
  }

  return { success: false, error: data.Status || "Failed to fetch time slots" };
}

export async function navoriSetTimeSlots(token: string, timeSlotList: any[]): Promise<{ success: boolean; timeslots?: any[]; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}SetTimeSlots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ TimeSlotList: timeSlotList }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return {
      success: true,
      timeslots: data.TimeSlotList || data.TimeSlots || data.ListTimeSlot || [],
    };
  }

  return { success: false, error: data.Status || "Failed to set time slots" };
}

export async function navoriDeleteTimeSlots(token: string, timeSlotIdList: number[]): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}DeleteTimeSlots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({ TimeSlotIdList: timeSlotIdList }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true };
  }

  return { success: false, error: data.Status || "Failed to delete time slots" };
}

export async function navoriPublishContent(token: string, groupId: number, playerIds?: number[]): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}PublishContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({
      GroupId: groupId,
      ...(playerIds && playerIds.length > 0 ? { PlayerIdList: playerIds } : {}),
    }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true };
  }

  return { success: false, error: data.Status || "Failed to publish content" };
}

export async function navoriTriggerContent(token: string, playerId: number, contentId: number, contentType: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${NAVORI_API_URL}TriggerContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify({
      PlayerId: playerId,
      ContentId: contentId,
      ContentType: contentType,
    }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true };
  }

  return { success: false, error: data.Status || "Failed to trigger content" };
}

export async function navoriRemoteSettings(token: string, playerIds: number[], action: string, groupId?: number): Promise<{ success: boolean; error?: string }> {
  const playerList = playerIds.map(id => ({
    Id: id,
    RemoteSettings: {
      Command: action,
    },
  }));

  const payload = { PlayerList: playerList };

  const response = await fetch(`${NAVORI_API_URL}SetPlayers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(payload),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Invalid response from Navori API" };
  }

  if (data.Status === "SUCCESS") {
    return { success: true };
  }

  return { success: false, error: data.Status || data.Message || data.error || "Failed to apply remote settings" };
}

export async function navoriGetContentReport(token: string, params: {
  GroupId?: number;
  DateFrom: string;
  DateTo: string;
  Aggregation?: string;
  PlayedInFull?: string;
  Search?: string;
}): Promise<any> {
  const response = await fetch(`${NAVORI_API_URL}GetContentReport`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(params),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { Status: "ERROR", error: "Invalid response" };
  }
  return data;
}

export async function navoriGetAudienceReport(token: string, params: {
  GroupId?: number;
  DateFrom: string;
  DateTo: string;
  Search?: string;
}): Promise<any> {
  const response = await fetch(`${NAVORI_API_URL}GetAudienceReport`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Token": token,
    },
    body: JSON.stringify(params),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { Status: "ERROR", error: "Invalid response" };
  }
  return data;
}

export async function navoriUploadFile(
  token: string,
  body: Buffer,
  contentType: string,
  fileName?: string,
  offset?: number,
  filePath?: string,
): Promise<{ success: boolean; media?: any; error?: string }> {
  let url = `${NAVORI_API_URL}UploadFile`;
  if (fileName !== undefined) {
    url =
      `${url}?FileName=${encodeURIComponent(fileName)}` +
      `&Offset=${offset ?? 0}` +
      `&FilePath=${encodeURIComponent(filePath ?? "")}`;
  }

  console.log("[NAVORI/UPLOAD] final URL:", url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Token": token,
    },
    body,
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = { Status: response.ok ? "SUCCESS" : "FAILED" };
  }

  console.log("[NAVORI/UPLOAD] response.status:", response.status, "response.statusText:", response.statusText);
  console.log("[NAVORI/UPLOAD] raw body:", JSON.stringify(data, null, 2));

  if (data.Status === "SUCCESS" || response.ok) {
    return { success: true, media: data.Media || data };
  }

  return { success: false, error: data.Status || "Upload failed" };
}

const NAVORI_UPLOAD_CHUNK_LIMIT = 5 * 1024 * 1024;

export async function navoriUploadMedia(
  token: string,
  fileBuffer: Buffer,
  originalFilename: string,
  groupId: number,
  displayName?: string,
): Promise<{
  success: boolean;
  mediaInfo?: { FileName: string; Path: string; URL: string; Length: number };
  error?: string;
  navoriStatus?: string;
}> {
  const fileSize = fileBuffer.length;

  // TODO: implement multi-chunk upload before video / high-res files can be
  // sent. Navori chunks at 1,048,577 bytes; subsequent chunks reuse the
  // server-returned FileName and must be sent serially, not in parallel.
  if (fileSize > NAVORI_UPLOAD_CHUNK_LIMIT) {
    console.log("[NAVORI/UPLOAD-V2] file too large for single-chunk v1:", fileSize);
    return { success: false, error: "Files larger than 5 MB not yet supported — chunking pending" };
  }

  const uploadUrl = `${NAVORI_QL_URL}UploadFileMedia`;
  const base64Buffer = fileBuffer.toString("base64");
  const uploadBody = {
    FileName: originalFilename,
    GroupId: groupId,
    Offset: 0,
    FileSize: fileSize,
    Buffer: base64Buffer,
  };
  const redactedBody = { ...uploadBody, Buffer: `<base64 ${base64Buffer.length} chars>` };

  const uploadResp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Token": token,
    },
    body: JSON.stringify(uploadBody),
  });

  let uploadData: any;
  try {
    uploadData = await uploadResp.json();
  } catch {
    uploadData = null;
  }
  console.log(
    "[NAVORI/UPLOAD-V2] response:",
    "url=", uploadUrl,
    "status=", uploadResp.status, uploadResp.statusText,
    "req=", JSON.stringify(redactedBody),
    "resp=", JSON.stringify(uploadData),
  );

  if (!uploadResp.ok || !uploadData || uploadData.Status !== "SUCCESS" || uploadData.Offset !== fileSize) {
    return {
      success: false,
      navoriStatus: uploadData?.Status,
      error: uploadData?.Status || `HTTP ${uploadResp.status}`,
    };
  }

  const mediaInfo = uploadData.MediaInfo || {};
  const propsUrl = `${NAVORI_QL_URL}SetContentProperties`;
  const propsBody = {
    Path: mediaInfo.Path,
    Name: displayName || originalFilename,
    Duration: 7000,
  };

  try {
    const propsResp = await fetch(propsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Token": token,
      },
      body: JSON.stringify(propsBody),
    });
    let propsData: any;
    try {
      propsData = await propsResp.json();
    } catch {
      propsData = null;
    }
    console.log(
      "[NAVORI/SETPROPS] response:",
      "url=", propsUrl,
      "status=", propsResp.status, propsResp.statusText,
      "req=", JSON.stringify(propsBody),
      "resp=", JSON.stringify(propsData),
    );
    if (!propsResp.ok || !propsData || propsData.Status !== "SUCCESS") {
      console.warn("[NAVORI/SETPROPS] registration failed — upload succeeded, returning success anyway");
    }
  } catch (err: any) {
    console.warn("[NAVORI/SETPROPS] threw:", err?.message || err, "— upload succeeded, returning success anyway");
  }

  return {
    success: true,
    navoriStatus: uploadData.Status,
    mediaInfo: {
      FileName: mediaInfo.FileName || uploadData.FileName,
      Path: mediaInfo.Path,
      URL: mediaInfo.URL,
      Length: mediaInfo.Length ?? fileSize,
    },
  };
}
