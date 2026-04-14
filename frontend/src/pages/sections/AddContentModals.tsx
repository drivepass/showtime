import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient, API_BASE } from "../../lib/queryClient";
import { useTheme } from "@/hooks/use-theme";
import { useGroupSelection } from "@/hooks/use-group-selection";
import { Globe, Video, Monitor, UploadCloudIcon, FileIcon, XIcon } from "lucide-react";

type ContentModalType = "url" | "video" | "hdmi";

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ContentModalType;
}

function ModalField({ label, value, onChange, placeholder, isDark, required }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  isDark: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-[#e5e7eb]"} pb-2 pt-2`}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent text-sm ${isDark ? "text-[#374151] placeholder:text-[#9ca3af]" : "text-gray-700 placeholder:text-gray-400"} outline-none`}
          style={{ color: isDark ? "#c8d2e0" : undefined }}
          data-testid={`input-${label.toLowerCase().replace(/[\s*]/g, '-')}`}
        />
      </div>
      <span className={`text-xs font-medium ${isDark ? "text-[#9ca3af]" : "text-[#9ca3af]"} uppercase block mt-1`}>
        {label}{required ? " *" : ""}
      </span>
    </div>
  );
}

function ModalReadOnlyField({ label, value, isDark }: {
  label: string;
  value: string;
  isDark: boolean;
}) {
  return (
    <div>
      <div className={`border-b ${isDark ? "border-[#e5e7eb]" : "border-[#e5e7eb]"} pb-2 pt-2`}>
        <span className={`text-sm ${isDark ? "text-[#c8d2e0]" : "text-gray-700"} block`}>
          {value}
        </span>
      </div>
      <span className={`text-xs font-medium ${isDark ? "text-[#9ca3af]" : "text-[#9ca3af]"} uppercase block mt-1`}>
        {label}
      </span>
    </div>
  );
}

function ModalCheckbox({ label, checked, onChange, isDark }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 cursor-pointer"
      onClick={() => onChange(!checked)}
      data-testid={`checkbox-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className={`w-[18px] h-[18px] rounded border ${checked ? "bg-[#2ca1da] border-transparent" : isDark ? "border-[#d1d5db]" : "border-[#d1d5db]"} flex items-center justify-center`}>
        {checked && <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l4 4 6-6" /></svg>}
      </div>
      <span className={`text-sm ${isDark ? "text-[#c8d2e0]" : "text-[#374151]"}`}>{label}</span>
    </div>
  );
}

function getModalConfig(type: ContentModalType) {
  switch (type) {
    case "url":
      return {
        title: "Add URL",
        typeLabel: "HTML",
        hasUrl: true,
        hasWidth: true,
        hasHeight: true,
        hasHideScrollBar: true,
        hasHideTicker: true,
        hasEnable: true,
      };
    case "video":
      return {
        title: "Add Video Stream",
        typeLabel: "Video Stream",
        hasUrl: true,
        hasWidth: false,
        hasHeight: false,
        hasHideScrollBar: false,
        hasHideTicker: true,
        hasEnable: true,
      };
    case "hdmi":
      return {
        title: "Add HDMI Input",
        typeLabel: "Hdmi",
        hasUrl: false,
        hasWidth: false,
        hasHeight: false,
        hasHideScrollBar: false,
        hasHideTicker: true,
        hasEnable: true,
      };
  }
}

function PreviewArea({ type, isDark, width, height }: { type: ContentModalType; isDark: boolean; width: string; height: string }) {
  const w = parseInt(width) || 0;
  const h = parseInt(height) || 0;
  const hasCustomSize = w > 0 && h > 0;

  return (
    <div className={`w-full ${isDark ? "bg-[#d1d5db]" : "bg-[#d1d5db]"} rounded flex items-center justify-center relative overflow-hidden`}
      style={{ height: hasCustomSize ? `${Math.min(h * 0.6, 400)}px` : "400px" }}
    >
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "linear-gradient(147deg, #e5e7eb 0%, #d1d5db 100%)" }} />
      <div className="relative z-10 flex flex-col items-center gap-2">
        {type === "url" && (
          <>
            <Globe className="w-16 h-16 text-[#9ca3af]" />
            <span className="text-xs text-[#9ca3af]">URL Preview</span>
          </>
        )}
        {type === "video" && (
          <>
            <Video className="w-16 h-16 text-[#2ca1da]" />
            <span className="text-xs text-[#9ca3af]">Video Stream</span>
          </>
        )}
        {type === "hdmi" && (
          <>
            <Monitor className="w-16 h-16 text-[#9ca3af]" />
            <span className="text-sm font-semibold text-[#9ca3af]">HDMI</span>
          </>
        )}
        {hasCustomSize && (
          <span className="text-[10px] text-[#6b7280] mt-1">{w} x {h} px</span>
        )}
      </div>
    </div>
  );
}

export function UploadFileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { isDark } = useTheme();
  const { selectedGroupId } = useGroupSelection();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ name: string; success: boolean; message?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setFiles([]);
      setError(null);
      setResults([]);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError(null);
      setResults([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
      setError(null);
      setResults([]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    const newResults: typeof results = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (selectedGroupId) formData.append("groupId", String(selectedGroupId));
        console.log("[UPLOAD] starting:", file.name, "groupId:", selectedGroupId);
        const res = await fetch(API_BASE + "/api/medias/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const data = await res.json();
        console.log("[UPLOAD RESPONSE]", res.status, data);
        if (data.success) {
          newResults.push({ name: file.name, success: true });
        } else {
          const msg = data.message || "Upload failed";
          console.error("[UPLOAD FAILED]", file.name, msg);
          newResults.push({ name: file.name, success: false, message: msg });
        }
      } catch (err: any) {
        console.error("[UPLOAD ERROR]", file.name, err);
        newResults.push({ name: file.name, success: false, message: err?.message || "Network error" });
      }
    }
    if (newResults.length > 0 && !newResults.some(r => r.success)) {
      window.alert("Upload failed: " + (newResults[0]?.message || "Unknown error"));
    }
    setResults(newResults);
    setUploading(false);
    if (newResults.some(r => r.success)) {
      // Give Navori a moment to process the upload before refetching
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await queryClient.invalidateQueries({ queryKey: ["/api/medias"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["/api/content-default"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["/api/content-window"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["/api/folders"], refetchType: "all" });
    }
  };

  const allDone = results.length > 0 && !uploading;
  const allSuccess = allDone && results.every(r => r.success);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose} data-testid="upload-modal-backdrop">
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl max-w-[680px] w-full mx-4 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        data-testid="upload-modal"
      >
        <div className="flex items-start justify-between px-8 pt-6 pb-4">
          <h1 className={`text-3xl font-light ${isDark ? "text-white" : "text-[#0b0b0b]"}`}>Upload Media</h1>
          <div className="flex items-center gap-4 pt-1">
            {!allDone ? (
              <button
                className="bg-[#2ca1da] hover:bg-[#2590c4] text-white font-medium text-sm uppercase px-6 py-2 rounded shadow-sm transition-colors disabled:opacity-50"
                onClick={handleUpload}
                disabled={uploading || !files.length}
                data-testid="button-upload-ok"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            ) : (
              <button
                className="bg-[#2ca1da] hover:bg-[#2590c4] text-white font-medium text-sm uppercase px-6 py-2 rounded shadow-sm transition-colors"
                onClick={onClose}
                data-testid="button-upload-done"
              >
                {allSuccess ? "Done" : "Close"}
              </button>
            )}
            <button
              className={`${isDark ? "text-[#9ca3af]" : "text-[#374151]"} text-sm font-medium px-4 py-2 hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid="button-upload-cancel"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="px-8 pb-8">
          {error && <div className="text-red-500 text-xs font-medium mb-3">{error}</div>}

          {results.length === 0 ? (
            <>
              <div
                className={`border-2 border-dashed ${isDark ? "border-[#334155] hover:border-[#2997cc]" : "border-[#d1d5db] hover:border-[#2997cc]"} rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                data-testid="upload-drop-zone"
              >
                <UploadCloudIcon className={`w-12 h-12 ${isDark ? "text-[#475569]" : "text-[#9ca3af]"}`} />
                <p className={`text-sm ${isDark ? "text-[#94a3b8]" : "text-[#6b7280]"}`}>
                  Drag & drop files here, or <span className="text-[#2997cc] font-medium">browse</span>
                </p>
                <p className={`text-xs ${isDark ? "text-[#64748b]" : "text-[#9ca3af]"}`}>
                  Supports images, videos, PDF, PowerPoint, ZIP (HTML5)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,video/*,.pdf,.ppt,.pptx,.zip,.html"
                  onChange={handleFileChange}
                  data-testid="input-file-upload"
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className={`flex items-center gap-3 px-3 py-2 rounded ${isDark ? "bg-[#1a2a3a]" : "bg-[#f9fafb]"}`}>
                      <FileIcon className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-[#94a3b8]" : "text-[#6b7280]"}`} />
                      <span className={`text-sm flex-1 truncate ${isDark ? "text-[#cbd5e1]" : "text-[#374151]"}`}>{file.name}</span>
                      <span className={`text-xs ${isDark ? "text-[#64748b]" : "text-[#9ca3af]"}`}>{formatFileSize(file.size)}</span>
                      <button
                        className={`p-0.5 ${isDark ? "text-[#64748b] hover:text-[#94a3b8]" : "text-[#9ca3af] hover:text-[#6b7280]"} transition-colors`}
                        onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                        data-testid={`button-remove-file-${idx}`}
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {results.map((r, idx) => (
                <div key={idx} className={`flex items-center gap-3 px-3 py-2 rounded ${r.success ? (isDark ? "bg-green-900/20" : "bg-green-50") : (isDark ? "bg-red-900/20" : "bg-red-50")}`}>
                  <FileIcon className={`w-4 h-4 flex-shrink-0 ${r.success ? "text-green-400" : "text-red-400"}`} />
                  <span className={`text-sm flex-1 truncate ${isDark ? "text-[#cbd5e1]" : "text-[#374151]"}`}>{r.name}</span>
                  <span className={`text-xs font-medium ${r.success ? "text-green-400" : "text-red-400"}`}>
                    {r.success ? "Uploaded" : r.message || "Failed"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AddContentModal({ isOpen, onClose, type }: AddContentModalProps) {
  const { isDark } = useTheme();
  const { selectedGroupId } = useGroupSelection();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState("00:00:15");
  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");
  const [hideScrollBar, setHideScrollBar] = useState(true);
  const [hideTicker, setHideTicker] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const config = getModalConfig(type);

  const parseDuration = (val: string): number => {
    const parts = val.split(":").map(Number);
    let seconds = 0;
    if (parts.length === 3) seconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    else if (parts.length === 2) seconds = (parts[0] * 60) + parts[1];
    else seconds = parseInt(val) || 15;
    return seconds * 1000;
  };

  const handleOk = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (type === "video") {
        await apiRequest("POST", "/api/medias/set", {
          medias: [{
            Name: name.trim(),
            Url: url,
            Duration: parseDuration(duration),
            Enabled: enabled,
            ...(selectedGroupId ? { GroupId: selectedGroupId } : {}),
          }],
        });
      } else {
        await apiRequest("POST", "/api/templates/set", {
          templates: [{
            Name: name.trim(),
            Url: url,
            Duration: parseDuration(duration),
            Enabled: enabled,
            Width: parseInt(width) || 1920,
            Height: parseInt(height) || 1080,
            Type: config.typeLabel,
            ...(selectedGroupId ? { GroupId: selectedGroupId } : {}),
          }],
        });
      }

      if (selectedGroupId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/medias"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/content-window"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/content-default", selectedGroupId] });
      }

      setLoading(false);
      setName("");
      setUrl("");
      setDuration("00:00:15");
      setWidth("1920");
      setHeight("1080");
      setEnabled(true);
      setHideScrollBar(true);
      setHideTicker(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Failed to add content");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose} data-testid={`add-${type}-modal-backdrop`}>
      <div
        className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded-sm shadow-2xl max-w-[1152px] w-full max-h-[90vh] flex flex-col overflow-hidden mx-4`}
        onClick={(e) => e.stopPropagation()}
        data-testid={`add-${type}-modal`}
      >
        <div className="flex items-start justify-between px-10 py-6 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className={`text-4xl font-light ${isDark ? "text-white" : "text-[#0b0b0b]"}`} data-testid={`text-${type}-title`}>
              {name || "Name"}
            </h1>
            {error && (
              <div className="text-red-500 text-xs font-medium mt-2">{error}</div>
            )}
          </div>
          <div className="flex items-center gap-4 pt-2 pl-8 flex-shrink-0">
            <button
              className="bg-[#2ca1da] hover:bg-[#2590c4] text-white font-medium text-sm uppercase px-6 py-2 rounded shadow-sm transition-colors disabled:opacity-50"
              onClick={handleOk}
              disabled={loading || !name.trim()}
              data-testid={`button-${type}-ok`}
            >
              {loading ? "Adding..." : "OK"}
            </button>
            <button
              className={`${isDark ? "text-[#374151]" : "text-[#374151]"} text-sm font-medium px-4 py-2 hover:opacity-80 transition-opacity`}
              onClick={onClose}
              data-testid={`button-${type}-cancel`}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-12 px-10 pb-16">
            <div className="w-[341px] flex-shrink-0">
              <div className="mb-6">
                <span className={`text-sm font-bold ${isDark ? "text-[#9ca3af]" : "text-[#9ca3af]"} uppercase tracking-wider`}>General</span>
              </div>

              <div className="space-y-1">
                <ModalField
                  label="Name"
                  value={name}
                  onChange={setName}
                  placeholder="Enter name"
                  isDark={isDark}
                  required
                />

                {config.hasUrl && (
                  <ModalField
                    label="URL"
                    value={url}
                    onChange={setUrl}
                    placeholder="https://"
                    isDark={isDark}
                    required
                  />
                )}

                <div className="pt-3">
                  <ModalCheckbox
                    label="Enable"
                    checked={enabled}
                    onChange={setEnabled}
                    isDark={isDark}
                  />
                </div>

                <div className="pt-3">
                  <ModalField
                    label="Duration"
                    value={duration}
                    onChange={setDuration}
                    placeholder="00:00:15"
                    isDark={isDark}
                  />
                </div>

                <ModalReadOnlyField
                  label="Type"
                  value={config.typeLabel}
                  isDark={isDark}
                />

                {config.hasWidth && (
                  <div className="flex gap-4 pt-2">
                    <div className="flex-1">
                      <ModalField
                        label="Width"
                        value={width}
                        onChange={setWidth}
                        placeholder="1920"
                        isDark={isDark}
                      />
                    </div>
                    <div className="flex-1">
                      <ModalField
                        label="Height"
                        value={height}
                        onChange={setHeight}
                        placeholder="1080"
                        isDark={isDark}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  {config.hasHideScrollBar && (
                    <ModalCheckbox
                      label="Hide scroll bar"
                      checked={hideScrollBar}
                      onChange={setHideScrollBar}
                      isDark={isDark}
                    />
                  )}
                </div>

                {config.hasHideTicker && (
                  <div className="pt-3">
                    <ModalCheckbox
                      label="Hide ticker"
                      checked={hideTicker}
                      onChange={setHideTicker}
                      isDark={isDark}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-6">
              <div>
                <span className={`text-sm font-bold ${isDark ? "text-[#9ca3af]" : "text-[#9ca3af]"} uppercase tracking-wider`}>Preview</span>
              </div>
              <PreviewArea type={type} isDark={isDark} width={width} height={height} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
