import { ThemeProvider, useTheme } from "@/hooks/use-theme";
import { GroupSelectionProvider } from "@/hooks/use-group-selection";
import { PlayerSelectionProvider } from "@/hooks/use-player-selection";
import { MediaSelectionProvider } from "@/hooks/use-media-selection";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SparklesIcon, ImageIcon, ChevronDownIcon, ChevronRightIcon,
  RefreshCwIcon, SlidersHorizontalIcon, AlertTriangleIcon, Loader2Icon,
  DownloadIcon, CheckIcon, PenLineIcon, TagIcon, CarIcon, PercentIcon, WrenchIcon, ZapIcon
} from "lucide-react";
import { API_BASE } from "@/lib/queryClient";

// ── Types ───────────────────────────────────────────────────────
interface GeneratedOption {
  id: string;
  mediaUrl: string | null;
  variantTitle: string;
  prompt: string;
  model: string;
  error?: string;
}

interface Generate4Result {
  options: GeneratedOption[];
  prompt: string;
  model: string;
}

interface Config {
  contentType: string;
  useCase: string;
  orientation: string;
  resolution: string;
  aspectRatio: string;
}

const CONTENT_TYPES = ["Static", "Animated", "Dynamic"];
const USE_CASES = ["Promotion", "Awareness", "Event", "Information", "Brand"];
const ORIENTATIONS = ["Landscape", "Portrait"];
const RESOLUTIONS = ["1920x1080", "1080x1920", "3840x2160", "1280x720"];
const ASPECT_RATIOS = ["16:9", "9:16", "4:3", "1:1"];

const QUICK_STARTS = [
  { label: "New Inventory",    icon: CarIcon,     prompt: "A stunning new vehicle inventory display for a dealership showroom, featuring multiple car models in premium lighting, wide angle shot showcasing the fleet" },
  { label: "Service Specials", icon: WrenchIcon,  prompt: "Professional automotive service center promotion, mechanics working on luxury vehicles, service bay with brand colors, clean and trustworthy feel" },
  { label: "Finance Offers",   icon: PercentIcon, prompt: "Automotive finance offer promotional banner, sleek dark background with bold typography, luxury car silhouette, 0% finance messaging, premium dealership feel" },
  { label: "Test Drive Promo", icon: ZapIcon,     prompt: "Exciting test drive promotion, sporty car on an open road at golden hour, dynamic perspective, motion blur effect, inviting and energetic atmosphere" },
  { label: "Brand Awareness",  icon: TagIcon,     prompt: "Luxury automotive brand awareness visual, iconic car model in a dramatic studio environment, ultra-clean composition, premium brand colors, aspirational lifestyle" },
];

// ── Dropdown ─────────────────────────────────────────────────────
function Select({ label, value, options, onChange, t, isDark }: {
  label: string; value: string; options: string[];
  onChange: (v: string) => void; t: any; isDark: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={`text-[10px] font-semibold uppercase tracking-wide ${t.textDim}`}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full appearance-none rounded-lg border ${t.border} ${isDark ? "bg-[#1a2a3a] text-white" : "bg-[#f9fafb] text-[#374151]"} text-[12px] px-3 py-2 pr-8 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2997cc]`}
          data-testid={`select-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDownIcon className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 ${t.textDim}`} />
      </div>
    </div>
  );
}

// ── Option Card ───────────────────────────────────────────────────
function OptionCard({ option, index, selected, onSelect, onDownload, t, isDark }: {
  option: GeneratedOption; index: number; selected: boolean;
  onSelect: () => void; onDownload: () => void; t: any; isDark: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden border transition-all cursor-pointer ${
        selected
          ? "border-[#2997cc] shadow-[0_0_0_2px_#2997cc33]"
          : `${t.border} hover:border-[#2997cc80]`
      } ${isDark ? "bg-[#0e1620]" : "bg-white"}`}
      onClick={onSelect}
      data-testid={`card-option-${index + 1}`}
    >
      {/* Image area */}
      <div className={`relative overflow-hidden flex-1 min-h-[180px] ${isDark ? "bg-[#0a1018]" : "bg-gray-100"}`}>
        {option.error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            <AlertTriangleIcon className="w-6 h-6 text-red-400" />
            <p className={`text-[11px] text-center ${t.textDim}`}>{option.error}</p>
          </div>
        ) : option.mediaUrl ? (
          <img
            src={option.mediaUrl}
            alt={option.variantTitle}
            className="w-full h-full object-cover"
            data-testid={`img-option-${index + 1}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2Icon className="w-6 h-6 animate-spin text-[#2997cc]" />
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 bg-[#2997cc] rounded-full p-1">
            <CheckIcon className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t ${t.border} px-3 py-2.5`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold ${t.textPrimary} truncate flex-1 mr-2`}>
            Option {index + 1}: {option.variantTitle}
          </span>
          <button
            className={`shrink-0 p-1 rounded ${t.hoverBg} transition-colors`}
            onClick={e => { e.stopPropagation(); onDownload(); }}
            data-testid={`button-download-${index + 1}`}
            title="Download"
          >
            <DownloadIcon className={`w-3.5 h-3.5 ${t.textDim}`} />
          </button>
        </div>
        <button
          className={`mt-1.5 w-full text-[11px] font-medium py-1.5 rounded transition-colors ${
            selected
              ? "bg-[#2997cc] text-white"
              : `${isDark ? "bg-[#1a2a3a] hover:bg-[#2997cc] hover:text-white" : "bg-[#f3f4f6] hover:bg-[#2997cc] hover:text-white"} ${t.textPrimary}`
          }`}
          onClick={e => { e.stopPropagation(); onSelect(); }}
          data-testid={`button-select-${index + 1}`}
        >
          {selected ? "✓ Selected" : "Select"}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
function AIContentStudioContent() {
  const { t, isDark } = useTheme();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState("");
  const [config, setConfig] = useState<Config>({
    contentType: "Static",
    useCase: "Promotion",
    orientation: "Landscape",
    resolution: "1920x1080",
    aspectRatio: "16:9",
  });
  const [configOpen, setConfigOpen] = useState(false);
  const [results, setResults] = useState<Generate4Result | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // ── Mutations ────────────────────────────────────────────────
  const generate4Mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(API_BASE + "/api/aistudio/generate4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            prompt,
            content_type: config.contentType,
            use_case:     config.useCase,
            orientation:  config.orientation,
            resolution:   config.resolution,
            aspect_ratio: config.aspectRatio,
          }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Generation failed");
      return data as Generate4Result;
    },
    onSuccess: (data) => {
      setResults(data);
      setSelectedOption(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/aistudio/history"] });
    },
    onError: (err: any) => {
      setError(err.message || "Generation failed");
    },
  });

  const saveToLibraryMutation = useMutation({
    mutationFn: async (option: GeneratedOption) => {
      if (!option.mediaUrl) throw new Error("No media URL");
      return option;
    },
    onSuccess: () => {
      setLocation("/");
    },
  });

  const isGenerating = generate4Mutation.isPending;
  const canGenerate = prompt.trim().length > 0 && !isGenerating;

  const handleGenerate = () => {
    if (!canGenerate) return;
    setResults(null);
    setError(null);
    generate4Mutation.mutate();
  };

  const handleQuickStart = (qs: typeof QUICK_STARTS[0]) => {
    setPrompt(qs.prompt);
    setResults(null);
    setError(null);
    promptRef.current?.focus();
  };

  const handleRegenerate = () => {
    setResults(null);
    setError(null);
    generate4Mutation.mutate();
  };

  const handleAdjustPrompt = () => {
    setResults(null);
    promptRef.current?.focus();
  };

  const handleSave = () => {
    const option = results?.options.find(o => o.id === selectedOption);
    if (!option) return;
    saveToLibraryMutation.mutate(option);
  };

  const handleDownload = (option: GeneratedOption) => {
    if (!option.mediaUrl) return;
    const a = document.createElement("a");
    a.href = option.mediaUrl;
    a.download = `ai-content-${option.variantTitle.toLowerCase().replace(/\s+/g, "-")}.jpg`;
    a.target = "_blank";
    a.click();
  };

  const hasResults = !!results && results.options.length > 0;
  const selectedObj = results?.options.find(o => o.id === selectedOption);

  return (
    <div className={`flex flex-col h-screen ${isDark ? "bg-[#0a1018]" : "bg-[#f3f4f6]"}`}>
      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-6 py-3 border-b ${t.border} ${isDark ? "bg-[#0e1620]" : "bg-white"} shadow-sm shrink-0`}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl border border-[#2997cc] ${isDark ? "bg-[#2997cc14]" : "bg-blue-50"}`}>
            <SparklesIcon className="w-4 h-4 text-[#2997cc]" />
          </div>
          <div>
            <h1 className={`text-[16px] font-bold tracking-tight ${t.textPrimary}`}>AI Content Studio</h1>
            <p className={`text-[11px] ${t.textDim}`}>Generate stunning signage content with artificial intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`px-4 py-2 text-[13px] font-medium rounded-lg ${t.textMuted} ${t.hoverBg} transition-colors`}
            onClick={() => setLocation("/")}
            data-testid="button-cancel"
          >
            Close
          </button>
          <button
            disabled={!selectedObj}
            onClick={handleSave}
            className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors disabled:opacity-40 ${
              selectedObj
                ? "bg-[#2997cc] text-white hover:bg-[#227aab]"
                : isDark ? "bg-[#1a2a3a] text-[#6b7280]" : "bg-gray-100 text-gray-400"
            }`}
            data-testid="button-save-library"
          >
            Save to Library
          </button>
        </div>
      </div>

      {/* ── Quick Starts Bar ── */}
      <div className={`flex items-center gap-2 px-6 py-3 border-b ${t.border} ${isDark ? "bg-[#0d1a27]" : "bg-white"} overflow-x-auto shrink-0`}>
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${t.textDim} shrink-0 mr-1`}>Quick Starts:</span>
        {QUICK_STARTS.map(qs => {
          const Icon = qs.icon;
          return (
            <button
              key={qs.label}
              onClick={() => handleQuickStart(qs)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all shrink-0 ${
                isDark
                  ? `${t.border} ${t.textMuted} hover:border-[#2997cc] hover:text-[#2997cc] hover:bg-[#2997cc0f]`
                  : "border-[#e5e7eb] text-[#374151] hover:border-[#2997cc] hover:text-[#2997cc] bg-[#f9fafb] hover:bg-blue-50 shadow-sm"
              }`}
              data-testid={`button-quickstart-${qs.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              {qs.label}
            </button>
          );
        })}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left Panel: Prompt + Config ── */}
        <div className={`flex flex-col w-[380px] shrink-0 border-r ${t.border} ${isDark ? "bg-[#0e1620]" : "bg-white"} overflow-y-auto`}>
          <div className="flex flex-col gap-4 p-5">

            {/* Prompt */}
            <div>
              <label className={`text-[10px] font-semibold uppercase tracking-wide ${t.textDim} mb-1.5 block`}>Brief / Prompt</label>
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe the content you'd like to create for your digital signage display..."
                rows={6}
                className={`w-full rounded-xl border ${t.border} ${isDark ? "bg-[#121a24] text-white placeholder:text-[#3a5068]" : "bg-[#f9fafb] text-[#374151] placeholder:text-gray-400"} text-[12px] px-3.5 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#2997cc] transition-shadow`}
                data-testid="input-prompt"
              />
              <div className={`flex justify-end mt-1 text-[10px] ${t.textDim}`}>
                {prompt.length} characters
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40 ${
                canGenerate
                  ? "bg-[#2997cc] text-white hover:bg-[#227aab] shadow-md hover:shadow-lg"
                  : isDark ? "bg-[#1a2a3a] text-[#3a5068]" : "bg-gray-100 text-gray-400"
              }`}
              data-testid="button-generate"
            >
              {isGenerating
                ? <><Loader2Icon className="w-4 h-4 animate-spin" /> Generating 4 options…</>
                : <><SparklesIcon className="w-4 h-4" /> Generate 4 Options</>
              }
            </button>

            {/* Configuration Options */}
            <div className={`border ${t.border} rounded-xl overflow-hidden`}>
              <button
                className={`flex items-center justify-between w-full px-4 py-3 text-[12px] font-semibold ${t.textMuted} ${t.hoverBg} transition-colors`}
                onClick={() => setConfigOpen(v => !v)}
                data-testid="button-config-toggle"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontalIcon className="w-3.5 h-3.5 text-[#2997cc]" />
                  Configuration Options
                </div>
                {configOpen
                  ? <ChevronDownIcon className="w-3.5 h-3.5" />
                  : <ChevronRightIcon className="w-3.5 h-3.5" />
                }
              </button>

              {configOpen && (
                <div className={`grid grid-cols-1 gap-3 px-4 pb-4 pt-2 border-t ${t.border}`}>
                  <Select label="Content Type" value={config.contentType} options={CONTENT_TYPES}
                    onChange={v => setConfig(c => ({ ...c, contentType: v }))} t={t} isDark={isDark} />
                  <Select label="Use Case" value={config.useCase} options={USE_CASES}
                    onChange={v => setConfig(c => ({ ...c, useCase: v }))} t={t} isDark={isDark} />
                  <Select label="Orientation" value={config.orientation} options={ORIENTATIONS}
                    onChange={v => setConfig(c => ({ ...c, orientation: v }))} t={t} isDark={isDark} />
                  <Select label="Resolution" value={config.resolution} options={RESOLUTIONS}
                    onChange={v => setConfig(c => ({ ...c, resolution: v }))} t={t} isDark={isDark} />
                  <Select label="Aspect Ratio" value={config.aspectRatio} options={ASPECT_RATIOS}
                    onChange={v => setConfig(c => ({ ...c, aspectRatio: v }))} t={t} isDark={isDark} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Results ── */}
        <div className={`flex flex-col flex-1 min-w-0 ${isDark ? "bg-[#0a1018]" : "bg-[#f3f4f6]"} overflow-y-auto`}>

          {/* Results header (only when we have results) */}
          {hasResults && (
            <div className={`flex items-center justify-between px-6 py-3 border-b ${t.border} ${isDark ? "bg-[#0e1620]" : "bg-white"} shrink-0`}>
              <p className={`text-[13px] font-semibold ${t.textPrimary}`}>
                Generated 4 professional options based on your prompt.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border ${t.border} ${t.textMuted} ${t.hoverBg} transition-colors disabled:opacity-40`}
                  data-testid="button-regenerate"
                >
                  <RefreshCwIcon className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </button>
                <button
                  onClick={handleAdjustPrompt}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border ${t.border} ${t.textMuted} ${t.hoverBg} transition-colors`}
                  data-testid="button-adjust-prompt"
                >
                  <PenLineIcon className="w-3.5 h-3.5" />
                  Adjust Prompt
                </button>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 p-6">

            {/* Error state */}
            {error && (
              <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 ${isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"}`}>
                <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className={`text-[12px] font-semibold text-red-400`}>Generation Failed</p>
                  <p className={`text-[11px] ${isDark ? "text-red-300" : "text-red-600"} mt-0.5`}>{error}</p>
                </div>
              </div>
            )}

            {/* Generating state */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center h-full gap-6 py-16">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2997cc] to-[#1a6fa0] flex items-center justify-center shadow-xl">
                    <SparklesIcon className="w-8 h-8 text-white" />
                  </div>
                  <Loader2Icon className="absolute -right-2 -bottom-2 w-6 h-6 animate-spin text-[#2997cc]" />
                </div>
                <div className="text-center">
                  <p className={`text-[16px] font-semibold ${t.textPrimary}`}>Generating 4 unique options…</p>
                  <p className={`text-[13px] ${t.textDim} mt-1`}>Ideogram V2 Turbo is creating your content with different style variations</p>
                </div>
                {/* Skeleton cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`rounded-xl overflow-hidden border ${t.border} animate-pulse`}>
                      <div className={`h-44 ${isDark ? "bg-[#1a2a3a]" : "bg-gray-200"}`} />
                      <div className={`p-3 border-t ${t.border}`}>
                        <div className={`h-3 w-2/3 rounded ${isDark ? "bg-[#1a2a3a]" : "bg-gray-200"} mb-2`} />
                        <div className={`h-6 w-full rounded ${isDark ? "bg-[#1a2a3a]" : "bg-gray-200"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results grid */}
            {hasResults && !isGenerating && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {results!.options.map((option, i) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    index={i}
                    selected={option.id === selectedOption}
                    onSelect={() => setSelectedOption(option.id === selectedOption ? null : option.id)}
                    onDownload={() => handleDownload(option)}
                    t={t}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!hasResults && !isGenerating && !error && (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-center">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${isDark ? "bg-[#0e1620] border border-[#1a2a3a]" : "bg-white border border-[#e5e7eb]"} shadow-sm`}>
                  <SparklesIcon className={`w-9 h-9 ${isDark ? "text-[#1a2a3a]" : "text-gray-300"}`} />
                </div>
                <div>
                  <p className={`text-[15px] font-semibold ${t.textPrimary}`}>Ready to generate</p>
                  <p className={`text-[12px] ${t.textDim} mt-1 max-w-xs mx-auto`}>
                    Enter a brief on the left and click <strong>Generate 4 Options</strong> — Ideogram V2 Turbo will create 4 unique style variations for your signage.
                  </p>
                </div>
                <div className={`mt-2 flex flex-col gap-1.5 text-[11px] ${t.textDim}`}>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-[#2997cc]" />
                    <span>4 unique style variations generated in parallel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-3.5 h-3.5 text-[#2997cc]" />
                    <span>Select your favorite and save to library</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZapIcon className="w-3.5 h-3.5 text-[#2997cc]" />
                    <span>Arabic + English briefs supported</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIContentStudio() {
  return (
    <ThemeProvider>
      <GroupSelectionProvider>
        <PlayerSelectionProvider>
          <MediaSelectionProvider>
            <AIContentStudioContent />
          </MediaSelectionProvider>
        </PlayerSelectionProvider>
      </GroupSelectionProvider>
    </ThemeProvider>
  );
}
