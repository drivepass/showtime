import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, Trash2Icon, CopyIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useGroupSelection } from "@/hooks/use-group-selection";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PreviewModal } from "./PreviewModal";
import { API_BASE, fetchWithRetry } from "@/lib/queryClient";

const timeSlots = ["07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18"];

function getWeekDays(weekOffset: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);

  const days = [];
  const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.toDateString() === now.toDateString();
    days.push({
      label: `${dayNames[i]} ${d.getDate()} ${monthNames[d.getMonth()]}`,
      isToday,
      isWeekend: i >= 5,
      dayIndex: i,
      date: d,
    });
  }
  return { days, monday };
}

function getWeekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - oneJan.getTime()) / 86400000);
  return Math.ceil((days + oneJan.getDay() + 1) / 7);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const DashboardMainSection = (): JSX.Element => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPreview, setShowPreview] = useState(false);
  const [clearConfirm, setClearConfirm] = useState<"day" | "week" | null>(null);
  const [clearDayIndex, setClearDayIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ day: number; hour: number } | null>(null);
  const [dropSuccess, setDropSuccess] = useState(false);
  const { t, isDark } = useTheme();
  const { selectedGroupId } = useGroupSelection();
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { days, monday } = getWeekDays(weekOffset);
  const weekNum = getWeekNumber(monday);
  const sunday = useMemo(() => {
    const end = new Date(monday);
    end.setDate(monday.getDate() + 6);
    return end;
  }, [monday]);
  const fromDate = useMemo(() => formatDateYYYYMMDD(monday), [monday]);
  const toDate = useMemo(() => formatDateYYYYMMDD(sunday), [sunday]);

  // Fetch time slots for the selected group
  const [timeslotError, setTimeslotError] = useState<string | null>(null);
  const { data: timeslotsData, isLoading } = useQuery({
    queryKey: ["/api/timeslots", selectedGroupId, fromDate, toDate],
    queryFn: async () => {
      setTimeslotError(null);
      if (!selectedGroupId) return { timeslots: [] };
      const res = await fetchWithRetry(API_BASE + "/api/timeslots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroupId, fromDate, toDate }),
        credentials: "include",
      });
      if (!res.ok) {
        let errorMsg = "Failed to fetch time slots";
        try {
          const error = await res.json();
          errorMsg = error?.message || errorMsg;
        } catch {}
        setTimeslotError(errorMsg);
        throw new Error(errorMsg);
      }
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  // Mutation for saving time slots
  const saveTimeSlotsMutation = useMutation({
    mutationFn: async (timeslots: any[]) => {
      const res = await fetchWithRetry(API_BASE + "/api/timeslots/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeslots }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save time slots");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
      queryClient.refetchQueries({ queryKey: ["/api/timeslots"] });
      setDropSuccess(true);
      window.setTimeout(() => setDropSuccess(false), 1500);
    },
    onError: (error: Error) => {
      console.error("Failed to save timeslot:", error);
      window.alert("Failed to save to schedule: " + error.message);
    },
  });

  // Mutation for deleting time slots
  const deleteTimeSlotsMutation = useMutation({
    mutationFn: async (timeSlotIds: number[]) => {
      const res = await fetchWithRetry(API_BASE + "/api/timeslots/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSlotIds }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete time slots");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots", selectedGroupId, fromDate, toDate] });
    },
  });

  // Convert API time slots to displayable bars
  const displayBars = useMemo(() => {
    const slots = timeslotsData?.timeslots || [];
    return slots.map((slot: any) => ({
      day: slot.DayOfWeek || 0,
      startHour: parseInt(slot.StartTime?.split(":")[0]) || 7,
      endHour: parseInt(slot.EndTime?.split(":")[0]) || 18,
      color: slot.Color || "#2997cc",
      id: slot.Id,
    }));
  }, [timeslotsData]);

  const todayMarkerPosition = useMemo(() => {
    if (weekOffset !== 0) return null;
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour < 7 || hour >= 18) return null;
    const position = ((hour - 7 + minute / 60) / 11) * 100;
    const dayOfWeek = now.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return { position, dayIndex };
  }, [weekOffset, currentTime]);

  const handlePublish = () => {
    if (!selectedGroupId) {
      window.alert("Please select a group before publishing.");
      return;
    }

    const payload = (timeslotsData?.timeslots || []).map((slot: any) => ({
      ...slot,
      GroupId: Number.isFinite(slot?.GroupId) && slot.GroupId > 0 ? slot.GroupId : selectedGroupId,
    }));

    if (payload.length === 0) {
      window.alert("No timeslots available to publish for this group.");
      return;
    }
    saveTimeSlotsMutation.mutate(payload);
  };

  const handleClearDay = (dayIndex: number) => {
    const slots = timeslotsData?.timeslots || [];
    const daySlots = slots.filter((s: any) => (s.DayOfWeek || 0) === dayIndex);
    if (daySlots.length === 0) return;
    deleteTimeSlotsMutation.mutate(daySlots.map((s: any) => s.Id));
    setClearConfirm(null);
    setClearDayIndex(null);
  };

  const handleClearWeek = () => {
    const slots = timeslotsData?.timeslots || [];
    if (slots.length === 0) return;
    deleteTimeSlotsMutation.mutate(slots.map((s: any) => s.Id));
    setClearConfirm(null);
  };

  const handleDuplicateDay = (sourceDayIndex: number) => {
    const slots = timeslotsData?.timeslots || [];
    const sourceSlots = slots.filter((s: any) => (s.DayOfWeek || 0) === sourceDayIndex);
    if (sourceSlots.length === 0) return;
    const newSlots: any[] = [];
    for (let d = 0; d < 7; d++) {
      if (d === sourceDayIndex) continue;
      sourceSlots.forEach((s: any) => {
        newSlots.push({
          ...s,
          Id: 0,
          DayOfWeek: d,
          GroupId: selectedGroupId,
        });
      });
    }
    if (newSlots.length > 0) saveTimeSlotsMutation.mutate(newSlots);
  };

  return (
    <section className={`flex flex-col flex-1 min-w-0 h-full ${t.panelBg} relative`}>
      {dropSuccess && (
        <div className="fixed top-4 right-4 z-[80] bg-green-500 text-white text-xs font-medium px-3 py-2 rounded shadow-lg" data-testid="toast-drop-success">
          Added to schedule
        </div>
      )}
      {timeslotError && (
        <div className="bg-red-100 text-red-700 px-4 py-2 text-xs font-medium border-b border-red-300">
          {timeslotError}
        </div>
      )}
      {clearConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60" onClick={() => setClearConfirm(null)}>
          <div className={`${isDark ? "bg-[#0d0d0d]" : "bg-white"} rounded shadow-2xl p-6 max-w-xs w-full mx-4`} onClick={(e) => e.stopPropagation()}>
            <p className={`text-sm font-medium ${t.textPrimary} mb-4`}>
              {clearConfirm === "week"
                ? "Clear all time slots for this entire week? This cannot be undone."
                : `Clear all time slots for ${clearDayIndex !== null ? days[clearDayIndex]?.label : "this day"}? This cannot be undone.`}
            </p>
            <div className="flex gap-2">
              <button
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                onClick={() => clearConfirm === "week" ? handleClearWeek() : clearDayIndex !== null ? handleClearDay(clearDayIndex) : null}
                disabled={deleteTimeSlotsMutation.isPending}
                data-testid="button-confirm-clear"
              >
                {deleteTimeSlotsMutation.isPending ? "Clearing..." : "Clear"}
              </button>
              <button
                className={`px-4 py-1.5 text-xs font-medium ${t.textMuted} ${t.hoverBg} rounded transition-colors`}
                onClick={() => { setClearConfirm(null); setClearDayIndex(null); }}
                data-testid="button-cancel-clear"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <header className={`flex h-10 items-center justify-between px-3 ${t.panelBg} border-b ${t.border} flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-3 ${t.textDim}`} viewBox="0 0 16 12" fill="currentColor">
            <rect x="0" y="0" width="16" height="2" /><rect x="0" y="5" width="16" height="2" /><rect x="0" y="10" width="16" height="2" />
          </svg>
          <span className={`font-['Inter',Helvetica] font-semibold ${t.textDim} text-[11px] tracking-[0.3px] leading-4 whitespace-nowrap uppercase`} data-testid="text-scheduling-header">
            SCHEDULING GRID
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`h-[22px] px-2 py-0.5 font-['Inter',Helvetica] font-medium text-red-400 text-[11px] bg-transparent border border-red-400/40 hover:bg-red-500/10 rounded`}
            onClick={() => setClearConfirm("week")}
            disabled={!selectedGroupId || (timeslotsData?.timeslots || []).length === 0}
            data-testid="button-clear-week"
          >
            <Trash2Icon className="w-3 h-3 mr-1" /> CLEAR WEEK
          </Button>

          <Button
            variant="outline"
            size="sm"
            className={`h-[22px] px-3 py-0.5 font-['Inter',Helvetica] font-medium ${t.textMuted} text-[11px] bg-transparent border ${t.borderAccent} ${t.hoverBg} rounded`}
            onClick={() => setShowPreview(true)}
            data-testid="button-preview"
          >
            PREVIEW
          </Button>

          <Button
            size="sm"
            disabled={saveTimeSlotsMutation.isPending || !selectedGroupId || isLoading}
            className="h-[22px] px-3 py-0.5 bg-[#2997cc] hover:bg-[#2587b8] font-['Inter',Helvetica] font-medium text-white text-[11px] rounded disabled:opacity-50"
            onClick={handlePublish}
            data-testid="button-publish"
          >
            {saveTimeSlotsMutation.isPending ? "PUBLISHING..." : "PUBLISH"}
          </Button>
        </div>
      </header>

      <nav className={`flex h-7 items-center justify-between px-3 ${t.panelBg} border-b ${t.border} flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <button
            className="font-['Inter',Helvetica] font-medium text-[#2997cc] text-[11px] leading-4 whitespace-nowrap hover:text-[#3ab0e0]"
            onClick={() => setWeekOffset(0)}
            data-testid="button-current-week"
          >
            Current Week
          </button>

          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset(weekOffset - 1)} className={`p-0.5 ${t.hoverBg} rounded`} data-testid="button-prev-week">
              <ChevronLeftIcon className={`w-3 h-3 ${t.textDim}`} />
            </button>
            <span className={`font-['Inter',Helvetica] font-normal ${t.textMuted} text-[11px] leading-4 whitespace-nowrap min-w-[40px] text-center`} data-testid="text-week-number">
              Week {weekNum}
            </span>
            <button onClick={() => setWeekOffset(weekOffset + 1)} className={`p-0.5 ${t.hoverBg} rounded`} data-testid="button-next-week">
              <ChevronRightIcon className={`w-3 h-3 ${t.textDim}`} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <ChevronLeftIcon className={`w-3 h-3 ${t.textFaint} cursor-pointer`} />
            <span className={`font-['Inter',Helvetica] font-normal ${t.textMuted} text-[11px] leading-4 whitespace-nowrap`}>
              {monthNames[monday.getMonth()]}
            </span>
            <ChevronRightIcon className={`w-3 h-3 ${t.textFaint} cursor-pointer`} />
          </div>

          <div className="flex items-center gap-1">
            <ChevronLeftIcon className={`w-3 h-3 ${t.textFaint} cursor-pointer`} />
            <span className={`font-['Inter',Helvetica] font-normal ${t.textMuted} text-[11px] leading-4 whitespace-nowrap`} data-testid="text-year">
              {monday.getFullYear()}
            </span>
            <ChevronRightIcon className={`w-3 h-3 ${t.textFaint} cursor-pointer`} />
          </div>
        </div>

        <time className={`font-['Liberation_Mono',monospace] font-normal ${t.textDim} text-[11px] leading-4 whitespace-nowrap`} data-testid="text-current-time">
          {formatTime(currentTime)}
        </time>
      </nav>

      <div className="flex flex-col flex-1 overflow-auto">
        <div className={`flex items-start w-full ${t.panelBg} border-b ${t.border} z-10 sticky top-0`}>
          <div className={`w-[90px] flex-shrink-0 self-stretch ${t.panelBg} border-r ${t.border}`} />
          <div className="flex flex-1 items-start justify-center">
            {timeSlots.map((hour) => (
              <div key={hour} className={`flex flex-col items-center flex-1 py-1.5 border-r ${t.borderSubtle}`}>
                <span className={`font-['Inter',Helvetica] font-normal ${t.textDim} text-[11px] text-center leading-4 whitespace-nowrap`}>
                  {hour}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col relative">
          {days.map((dayData) => (
            <div key={dayData.label} className={`flex min-h-[60px] items-start border-b ${t.borderSubtle} group`}>
              <div className={`flex flex-col w-[90px] flex-shrink-0 justify-between p-1.5 self-stretch ${t.panelBg} border-r ${t.border} z-10 relative`}>
                <span className={`font-['Inter',Helvetica] font-medium text-[11px] leading-4 ${dayData.isToday ? "text-[#2997cc]" : t.textMuted}`} data-testid={`text-day-${dayData.dayIndex}`}>
                  {dayData.label}
                </span>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-0.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Clear day"
                      onClick={() => { setClearDayIndex(dayData.dayIndex); setClearConfirm("day"); }}
                      data-testid={`button-clear-day-${dayData.dayIndex}`}
                    >
                      <Trash2Icon className="w-2.5 h-2.5" />
                    </button>
                    <button
                      className={`p-0.5 text-[#2997cc] hover:bg-[#2997cc]/10 rounded transition-colors`}
                      title="Copy to all days"
                      onClick={() => handleDuplicateDay(dayData.dayIndex)}
                      disabled={saveTimeSlotsMutation.isPending}
                      data-testid={`button-duplicate-day-${dayData.dayIndex}`}
                    >
                      <CopyIcon className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-['Inter',Helvetica] font-normal ${t.textFaint} text-[9px] leading-3 whitespace-nowrap`}>Ads</span>
                    <span className={`font-['Inter',Helvetica] font-normal ${t.textFaint} text-[9px] leading-3 whitespace-nowrap pt-1`}>Tickers</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 self-stretch relative">
                {timeSlots.map((hour) => {
                  const hourNum = parseInt(hour);
                  const isDropTarget = dropTarget?.day === dayData.dayIndex && dropTarget?.hour === hourNum;
                  return (
                    <div
                      key={`${dayData.label}-${hour}`}
                      className={`flex-1 self-stretch border-r ${t.borderSubtle} ${isDropTarget ? "bg-[#2997cc]/20" : ""}`}
                      onDragOver={(e) => {
                        if (e.dataTransfer.types.includes("application/x-showtime-playlist")) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                          setDropTarget({ day: dayData.dayIndex, hour: hourNum });
                        }
                      }}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropTarget(null);
                        const raw = e.dataTransfer.getData("application/x-showtime-playlist");
                        if (!raw || !selectedGroupId) return;
                        try {
                          const playlist = JSON.parse(raw);
                          console.log("[TIMESLOT DROP] playlist:", playlist);
                          const startTime = `${String(hourNum).padStart(2, "0")}:00:00`;
                          const endHour = Math.min(hourNum + 1, 18);
                          const endTime = `${String(endHour).padStart(2, "0")}:00:00`;
                          const dateStr = formatDateYYYYMMDD(dayData.date);
                          const payload = [{
                            Id: 0,
                            GroupId: selectedGroupId,
                            PlaylistId: playlist.Id,
                            DayOfWeek: dayData.dayIndex,
                            StartTime: startTime,
                            EndTime: endTime,
                            FromDate: dateStr,
                            ToDate: dateStr,
                            Color: "#2997cc",
                          }];
                          console.log("[TIMESLOT DROP] payload being sent:", payload);
                          saveTimeSlotsMutation.mutate(payload);
                        } catch (err: any) {
                          console.error("Failed to process drop:", err);
                          window.alert("Failed to add to schedule: " + (err?.message || "Unknown error"));
                        }
                      }}
                    />
                  );
                })}

                {isLoading ? (
                  <div className={`absolute inset-0 flex items-center justify-center ${isDark ? "text-gray-400" : "text-gray-300"}`}>
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : (
                  displayBars
                    .filter((bar: any) => bar.day === dayData.dayIndex)
                    .map((bar: any, i: number) => {
                      const startOffset = ((bar.startHour - 7) / 11) * 100;
                      const width = ((bar.endHour - bar.startHour) / 11) * 100;
                      return (
                        <div
                          key={i}
                          className="absolute top-1.5 h-4 rounded-sm cursor-pointer hover:opacity-100 transition-opacity"
                          style={{ left: `${startOffset}%`, width: `${width}%`, backgroundColor: bar.color, opacity: isDark ? 0.35 : 0.25 }}
                        />
                      );
                    })
                )}

                {todayMarkerPosition && dayData.dayIndex === todayMarkerPosition.dayIndex && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-[#2997cc] z-20" style={{ left: `${todayMarkerPosition.position}%` }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <PreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} />
    </section>
  );
};
