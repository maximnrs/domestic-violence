import { useState, useEffect } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Moon,
  Shield,
  ShieldCheck,
  Settings,
  ChevronRight,
  ChevronLeft,
  Bell,
  ArrowLeft,
  Phone,
  MessageCircle,
  Home,
  BarChart2,
  BookOpen,
  Check,
  Flame,
  Globe,
  Lock,
  Heart,
  User,
  Activity,
  Star,
  Info,
  X,
  Layers,
  Calendar,
  RefreshCw,
  Mic,
  Camera,
  Clock,
  FileText,
  Plus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenId =
  | "nura-home"
  | "panic-transition"
  | "habit-home"
  | "habit-settings"
  | "settings-general"
  | "app-mode"
  | "switch-confirm"
  | "nura-return";

interface Nav {
  go: (to: ScreenId) => void;
}

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// ─── Flow Definition ──────────────────────────────────────────────────────────

const FLOW: { id: ScreenId; label: string; app: "dv" | "mid" | "habit" }[] = [
  { id: "nura-home", label: "Nura Home", app: "dv" },
  { id: "panic-transition", label: "Switching", app: "mid" },
  { id: "habit-home", label: "Bloom", app: "habit" },
  { id: "habit-settings", label: "Settings", app: "habit" },
  { id: "settings-general", label: "General", app: "habit" },
  { id: "app-mode", label: "App Interface", app: "habit" },
  { id: "switch-confirm", label: "Confirm Switch", app: "habit" },
  { id: "nura-return", label: "Nura Return", app: "dv" },
];

const ANNOTATIONS: Record<ScreenId, { title: string; desc: string }> = {
  "nura-home": {
    title: "Nura — Main Screen",
    desc: "The primary safety and evidence app. The panic button (teal circle, bottom-right) sits at natural thumb reach — styled as a routine shortcut with no emergency label. Tapping it silently switches to Bloom.",
  },
  "panic-transition": {
    title: "Switching Interfaces",
    desc: "A quiet, neutral transition. No red alerts or emergency language — just 'Opening Bloom...' The switch feels intentional and routine, like opening any other app.",
  },
  "habit-home": {
    title: "Bloom — Habit Tracker Home",
    desc: "The disguised interface. Looks and feels exactly like a standalone habit tracker. No visible link to Nura. The only way back is buried three taps deep: Settings → General → App Interface.",
  },
  "habit-settings": {
    title: "Bloom — Settings",
    desc: "Accessible from the bottom nav. Structured like any normal app — Account, Preferences, Privacy, About. The 'General' row quietly leads toward the return path.",
  },
  "settings-general": {
    title: "Settings › General",
    desc: "Standard preferences: week start, reminders, language. 'App Interface' is the discreet gateway back to Nura — placed without emphasis among ordinary settings.",
  },
  "app-mode": {
    title: "App Interface",
    desc: "Shows which interface is active (Bloom) and offers a switch. Framed as a personal preference setting, not an emergency function. Calm, private language throughout.",
  },
  "switch-confirm": {
    title: "Switch Confirmation",
    desc: "One quiet confirmation step prevents accidental returns. Uses reassuring, low-urgency language. User can stay in Bloom or confirm the return to Nura.",
  },
  "nura-return": {
    title: "Back in Nura",
    desc: "User is returned to Nura. A subtle welcome-back toast confirms the switch. The panic button is again visible and accessible at bottom-right, ready when needed.",
  },
};

// ─── Shared Primitives ────────────────────────────────────────────────────────

function PhoneStatusBar({ inverted = false }: { inverted?: boolean }) {
  const c = inverted ? "#A8C5B8" : "#1E1E1E";
  const bg = inverted ? "transparent" : "transparent";
  return (
    <div
      className="flex items-center justify-between px-5 pb-1 select-none"
      style={{ background: bg }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: c }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          {[2, 4, 7, 9].map((h, i) => (
            <rect key={i} x={i * 4 + i * 0.5} y={11 - h} width="3.5" height={h} rx="1"
              fill={c} opacity={i < 3 ? 1 : 0.3} />
          ))}
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
          <circle cx="7.5" cy="10" r="1" fill={c} />
          <path d="M4.5 7.5C5.5 6.2 6.4 5.8 7.5 5.8s2 .4 3 1.7" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M2 4.5C3.8 2.6 5.5 1.8 7.5 1.8s3.7.8 5.5 2.7" stroke={c} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.45" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="2.5" stroke={c} strokeWidth="1" fill="none" />
          <rect x="2" y="2" width="17" height="8" rx="1.5" fill={c} />
          <path d="M23.5 4v4" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// Nura bottom nav (for the DV app)
function NuraNav() {
  const tabs = [
    { id: "home", Icon: Home, label: "Home" },
    { id: "timeline", Icon: Clock, label: "Timeline" },
    { id: "plan", Icon: Shield, label: "Plan" },
    { id: "resources", Icon: BookOpen, label: "Resources" },
  ];
  return (
    <div className="flex bg-white border-t shrink-0" style={{ borderColor: "#EAEDED" }}>
      {tabs.map(({ id, Icon, label }) => (
        <button key={id} className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors">
          <Icon size={22}
            color={id === "home" ? "#1F4D4F" : "#9AA3A3"}
            strokeWidth={id === "home" ? 2.5 : 1.5}
          />
          <span style={{ fontSize: 10, fontWeight: id === "home" ? 700 : 400, color: id === "home" ? "#1F4D4F" : "#9AA3A3" }}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

// Bloom bottom nav (for the habit tracker disguise)
function BloomNav({ active, onTab }: { active: string; onTab: (tab: string) => void }) {
  const tabs = [
    { id: "home", Icon: Home, label: "Home" },
    { id: "insights", Icon: BarChart2, label: "Insights" },
    { id: "journal", Icon: BookOpen, label: "Journal" },
    { id: "settings", Icon: Settings, label: "Settings" },
  ];
  return (
    <div className="flex bg-white border-t shrink-0" style={{ borderColor: "#EAEDED" }}>
      {tabs.map(({ id, Icon, label }) => (
        <button key={id} onClick={() => onTab(id)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors"
        >
          <Icon size={22} color={active === id ? "#1F4D4F" : "#9AA3A3"} strokeWidth={active === id ? 2.5 : 1.5} />
          <span style={{ fontSize: 10, fontWeight: active === id ? 700 : 400, color: active === id ? "#1F4D4F" : "#9AA3A3" }}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

function SettingsRow({ icon: Icon, label, value, color = "#7FA89C", onClick }: {
  icon: IconType; label: string; value?: string; color?: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 py-3 border-b last:border-0 active:bg-[#F7F8F7] transition-colors"
      style={{ borderColor: "#EAEDED" }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "22" }}>
        <Icon size={16} color={color} />
      </div>
      <span className="flex-1 text-left text-sm text-[#1E1E1E]">{label}</span>
      {value && <span className="text-xs text-[#9AA3A3] mr-1">{value}</span>}
      <ChevronRight size={16} color="#D6DADB" />
    </button>
  );
}

function HabitRow({ label, done, sub, onClick }: { label: string; done: boolean; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 border-b last:border-0 hover:bg-[#F7F8F7] active:bg-[#EAEDED] transition-colors text-left"
      style={{ borderColor: "#EAEDED" }}>
      <div className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
        style={{ backgroundColor: done ? "#7FA89C" : "transparent", borderColor: done ? "#7FA89C" : "#D6DADB" }}>
        {done && <Check size={12} color="white" strokeWidth={3} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color: done ? "#9AA3A3" : "#1E1E1E", textDecoration: done ? "line-through" : "none" }}>
          {label}
        </p>
        {sub && <p className="mt-0.5" style={{ fontSize: 10, color: "#9AA3A3" }}>{sub}</p>}
      </div>
    </button>
  );
}

// ─── Screen 1 · Nura Home ─────────────────────────────────────────────────────

function NuraHomeScreen({ nav, isReturn = false }: { nav: Nav; isReturn?: boolean }) {
  return (
    <div className="relative flex flex-col h-full" style={{ backgroundColor: "#F7F8F7" }}>

      {/* ── Welcome-back toast (return only) ── */}
      {isReturn && (
        <div className="absolute top-[52px] left-4 right-4 z-20 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl"
          style={{ backgroundColor: "#1F4D4F" }}>
          <ShieldCheck size={18} color="white" strokeWidth={2} />
          <div className="flex-1">
            <p className="text-xs font-semibold text-white">Welcome back to Nura</p>
            <p style={{ fontSize: 10, color: "#A8C5B8" }}>{"Your safety. Your evidence. Your control."}</p>
          </div>
          <X size={16} color="rgba(255,255,255,0.5)" />
        </div>
      )}

      {/* ── Dark teal header (matching Nura design) ── */}
      <div className="shrink-0 pb-6 px-5" style={{ backgroundColor: "#1F4D4F" }}>
        {/* Logo row */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Moon size={20} color="white" strokeWidth={1.5} />
            <span style={{ color: "white", fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>nura</span>
          </div>
          <div className="relative">
            <Bell size={20} color="rgba(168,197,184,0.8)" strokeWidth={1.5} />
            {!isReturn && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2"
                style={{ backgroundColor: "#C9666B", borderColor: "#1F4D4F" }} />
            )}
          </div>
        </div>

        {/* Greeting */}
        <div className={isReturn ? "mt-14" : "mt-5"}>
          <p style={{ fontSize: 12, color: "#7FA89C" }}>Good evening</p>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "white", lineHeight: 1.2, marginTop: 2 }}>Sarah</h2>
          <p style={{ fontSize: 11, color: "#7FA89C", marginTop: 4 }}>Thursday, May 21 · You are safe right now</p>
        </div>

        {/* Record CTA */}
        <button className="w-full mt-5 flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all active:opacity-90"
          style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <Plus size={18} color="white" strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Record a moment</p>
            <p style={{ fontSize: 10, color: "#A8C5B8" }}>Capture evidence securely</p>
          </div>
          <ChevronRight size={16} color="rgba(168,197,184,0.6)" />
        </button>
      </div>

      {/* ── White card area below header ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: 80 }}>

        {/* Quick capture tools */}
        <div>
          <p className="font-semibold uppercase tracking-widest mb-2.5 px-0.5"
            style={{ fontSize: 10, color: "#9AA3A3" }}>Quick Capture</p>
          <div className="flex gap-2.5">
            {[
              { Icon: Mic, label: "Voice\nNote", color: "#5E8BBF" },
              { Icon: Camera, label: "Photo\n& Video", color: "#7FA89C" },
              { Icon: FileText, label: "Written\nNote", color: "#1F4D4F" },
            ].map(({ Icon, label, color }) => (
              <button key={label}
                className="flex-1 bg-white rounded-2xl p-3.5 flex flex-col items-center gap-2 border shadow-sm active:shadow-none transition-all"
                style={{ borderColor: "#EAEDED" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: color + "18" }}>
                  <Icon size={18} color={color} />
                </div>
                <p className="text-center font-medium leading-tight whitespace-pre-line"
                  style={{ fontSize: 10, color: "#1E1E1E" }}>{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent moments */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <p className="font-semibold uppercase tracking-widest" style={{ fontSize: 10, color: "#9AA3A3" }}>
              Recent Moments
            </p>
            <button style={{ fontSize: 10, color: "#7FA89C", fontWeight: 600 }}>See all</button>
          </div>
          {[
            { date: "May 19 · 8:42 PM", desc: "Verbal incident documented", files: "Voice note · 1 photo", color: "#E0B663" },
            { date: "May 17 · 3:15 PM", desc: "Property damage recorded", files: "3 photos · written note", color: "#C9666B" },
            { date: "May 14 · 11:06 AM", desc: "Witness contact saved", files: "Contact info + notes", color: "#5E8BBF" },
          ].map(({ date, desc, files, color }) => (
            <div key={date} className="bg-white rounded-2xl p-4 mb-2.5 border shadow-sm flex items-start gap-3"
              style={{ borderColor: "#EAEDED" }}>
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 10, color: "#9AA3A3" }}>{date}</p>
                <p className="text-sm font-medium text-[#1E1E1E] mt-0.5">{desc}</p>
                <p style={{ fontSize: 10, color: "#9AA3A3", marginTop: 2 }}>{files}</p>
              </div>
              <ChevronRight size={14} color="#D6DADB" />
            </div>
          ))}
        </div>

        {/* Safety resources */}
        <div>
          <p className="font-semibold uppercase tracking-widest mb-2.5 px-0.5"
            style={{ fontSize: 10, color: "#9AA3A3" }}>Safety Resources</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { Icon: Phone, label: "National\nHotline", color: "#5E8BBF" },
              { Icon: MessageCircle, label: "Chat\nSupport", color: "#7FA89C" },
              { Icon: Shield, label: "Safety\nPlan", color: "#1F4D4F" },
              { Icon: Heart, label: "Local\nShelters", color: "#C9666B" },
            ].map(({ Icon, label, color }) => (
              <button key={label}
                className="bg-white rounded-2xl p-3.5 text-left border shadow-sm active:shadow-none transition-all"
                style={{ borderColor: "#EAEDED" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                  style={{ backgroundColor: color + "18" }}>
                  <Icon size={16} color={color} />
                </div>
                <p className="font-medium leading-snug whitespace-pre-line"
                  style={{ fontSize: 11, color: "#1E1E1E" }}>{label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nura bottom nav */}
      <NuraNav />

      {/* ══════════════════════════════════════════
          PANIC BUTTON — bottom-right, thumb-level
          Visually: a routine shortcut/sync button
          ══════════════════════════════════════════ */}
      <button
        onClick={() => nav.go("habit-home")}
        className="absolute right-4 flex items-center justify-center rounded-full transition-transform active:scale-95 z-10"
        style={{
          bottom: 70,
          width: 56,
          height: 56,
          backgroundColor: "#1F4D4F",
          boxShadow: "0 4px 20px rgba(31,77,79,0.5), 0 2px 8px rgba(0,0,0,0.12)",
        }}
        aria-label="Quick switch"
        title="Quick switch"
      >
        <Activity size={24} color="white" strokeWidth={2} />
      </button>
    </div>
  );
}

// ─── Screen 2 · Panic Transition ─────────────────────────────────────────────

// PanicTransitionScreen removed - instant switch now

// ─── Screen 3 · Bloom Home ────────────────────────────────────────────────────

function BloomHomeScreen({ nav }: { nav: Nav }) {
  // Auto-dismiss welcome toast after 3 seconds
  const [showToast, setShowToast] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "insights" | "journal" | "settings">("home");
  
  // Habit state management
  const initialHabits = [
    { label: "Morning meditation", sub: "10 minutes", done: true },
    { label: "Drink 8 glasses of water", sub: "Daily goal", done: true },
    { label: "30 min walk", sub: "Outdoor", done: true },
    { label: "Read 20 pages", sub: "Current book", done: true },
    { label: "Evening journal", sub: "Reflection", done: false },
    { label: "Gratitude log", sub: "3 things", done: false },
  ];
  const [habits, setHabits] = useState(initialHabits);

  useEffect(() => {
    const timer = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const toggleHabit = (index: number) => {
    const newHabits = [...habits];
    newHabits[index].done = !newHabits[index].done;
    setHabits(newHabits);
  };

  // Settings navigation state
  const [settingsView, setSettingsView] = useState<"main" | "account" | "preferences" | "privacy" | "about">("main");

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#F7F8F7" }}>
      <div className="bg-white shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#7FA89C" }}>
              <Activity size={16} color="white" strokeWidth={2} />
            </div>
            <span className="text-base font-semibold text-[#1E1E1E]">Bloom</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ backgroundColor: "#FFF8E8" }}>
              <Flame size={13} color="#E0B663" />
              <span className="font-semibold" style={{ fontSize: 11, color: "#E0B663" }}>12</span>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#A8C5B8" }}>
              <User size={14} color="white" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {activeTab === "home" && (
          <>
            <div>
              <p className="text-xs text-[#9AA3A3]">Thursday, May 21</p>
              <h2 className="text-lg font-semibold text-[#1E1E1E]">Good afternoon, Sarah</h2>
            </div>

            {/* Progress ring card */}
            <div className="bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-4" style={{ borderColor: "#EAEDED" }}>
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#EAEDED" strokeWidth="6" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#7FA89C" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - 4 / 6)}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-[#1E1E1E]">4/6</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1E1E1E]">4 of 6 habits done</p>
                <p className="text-xs text-[#9AA3A3] mt-0.5">2 remaining today</p>
                <div className="flex items-center gap-1 mt-2">
                  <Star size={11} color="#E0B663" fill="#E0B663" />
                  <span className="text-xs text-[#9AA3A3]">12-day streak · keep it up!</span>
                </div>
              </div>
            </div>

            {/* Habit list */}
            <div className="bg-white rounded-2xl px-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
              <p className="font-semibold uppercase tracking-widest pt-3 pb-1" style={{ fontSize: 10, color: "#9AA3A3" }}>
                {"Today's Habits"}
              </p>
              {habits.map((h, i) => (
                <HabitRow key={h.label} label={h.label} done={h.done} sub={h.sub} onClick={() => toggleHabit(i)} />
              ))}
              <div className="py-1.5" />
            </div>

            {/* Weekly view */}
            <div className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
              <p className="font-semibold uppercase tracking-widest mb-3" style={{ fontSize: 10, color: "#9AA3A3" }}>This Week</p>
              <div className="flex justify-between">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: i < 4 ? "#7FA89C" : i === 4 ? "#1F4D4F" : "#F7F8F7", border: i === 4 ? "2px solid #1F4D4F" : "none" }}>
                      {i < 4 && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 10, color: i === 4 ? "#1F4D4F" : "#9AA3A3", fontWeight: i === 4 ? 700 : 400 }}>{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "insights" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-[#1E1E1E]">Your Insights</h2>
              <p className="text-xs text-[#9AA3A3] mt-1">Performance over the last 30 days</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
              <p className="font-semibold text-sm text-[#1E1E1E] mb-3">Completion Rate</p>
              <div className="flex items-end gap-1.5 h-24">
                {[85, 92, 88, 95, 82, 90, 88].map((rate, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${rate}%`, backgroundColor: "#7FA89C" }} />
                    <span style={{ fontSize: 9, color: "#9AA3A3" }}>W{i + 1}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#9AA3A3] mt-3">Average completion: <span className="font-semibold text-[#1E1E1E]">89%</span></p>
            </div>

            <div className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
              <p className="font-semibold text-sm text-[#1E1E1E] mb-3">Most Consistent</p>
              <div className="space-y-2">
                {["Morning meditation", "Drink water", "30 min walk"].map((habit) => (
                  <div key={habit} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#7FA89C" }} />
                    <span className="text-sm text-[#1E1E1E]">{habit}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "journal" && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-[#1E1E1E]">Journal Entries</h2>
              <p className="text-xs text-[#9AA3A3] mt-1">Recent reflections</p>
            </div>

            {[
              { date: "Today", time: "2:30 PM", content: "Great workout today! Feeling energized and ready for the week." },
              { date: "May 20", time: "9:15 PM", content: "Completed all habits for the second day in a row. Momentum is building!" },
              { date: "May 19", time: "8:45 PM", content: "Started the day strong with meditation. It really sets the tone." },
            ].map((entry, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm text-[#1E1E1E]">{entry.date}</p>
                  <span style={{ fontSize: 10, color: "#9AA3A3" }}>{entry.time}</span>
                </div>
                <p className="text-sm text-[#1E1E1E] leading-relaxed">{entry.content}</p>
              </div>
            ))}
          </>
        )}

        {activeTab === "settings" && (
          <>
            {settingsView === "main" && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-[#1E1E1E]">Settings</h2>
                </div>

                <div className="bg-white rounded-2xl px-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
                  <SettingsRow icon={User} label="Account" color="#7FA89C" onClick={() => setSettingsView("account")} />
                  <SettingsRow icon={Settings} label="Preferences" color="#5E8BBF" onClick={() => setSettingsView("preferences")} />
                  <SettingsRow icon={Lock} label="Privacy" color="#9AA3A3" onClick={() => setSettingsView("privacy")} />
                  <SettingsRow icon={Info} label="About" color="#7FA89C" onClick={() => setSettingsView("about")} />
                  <SettingsRow icon={ArrowLeft} label="Return to Nura" onClick={() => nav.go("nura-return")} color="#1F4D4F" />
                </div>
              </>
            )}

            {settingsView === "account" && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setSettingsView("main")} className="p-1">
                    <ArrowLeft size={20} color="#1E1E1E" />
                  </button>
                  <h2 className="text-lg font-semibold text-[#1E1E1E]">Account</h2>
                </div>

                <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-3" style={{ borderColor: "#EAEDED" }}>
                  <div>
                    <p className="font-semibold text-sm text-[#1E1E1E]">Name</p>
                    <p className="text-sm text-[#9AA3A3] mt-1">Sarah Mitchell</p>
                  </div>
                  <div style={{ borderTop: "1px solid #EAEDED", paddingTop: 12 }}>
                    <p className="font-semibold text-sm text-[#1E1E1E]">Email</p>
                    <p className="text-sm text-[#9AA3A3] mt-1">sarah.mitchell@example.com</p>
                  </div>
                  <div style={{ borderTop: "1px solid #EAEDED", paddingTop: 12 }}>
                    <p className="font-semibold text-sm text-[#1E1E1E]">Member Since</p>
                    <p className="text-sm text-[#9AA3A3] mt-1">January 15, 2024</p>
                  </div>
                </div>
              </>
            )}

            {settingsView === "preferences" && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setSettingsView("main")} className="p-1">
                    <ArrowLeft size={20} color="#1E1E1E" />
                  </button>
                  <h2 className="text-lg font-semibold text-[#1E1E1E]">Preferences</h2>
                </div>

                <div className="bg-white rounded-2xl px-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
                  <SettingsRow icon={Calendar} label="Week starts on" value="Monday" color="#7FA89C" />
                  <SettingsRow icon={Bell} label="Default reminder" value="8:00 AM" color="#5E8BBF" />
                  <SettingsRow icon={Globe} label="Language" value="English" color="#9AA3A3" />
                </div>
              </>
            )}

            {settingsView === "privacy" && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setSettingsView("main")} className="p-1">
                    <ArrowLeft size={20} color="#1E1E1E" />
                  </button>
                  <h2 className="text-lg font-semibold text-[#1E1E1E]">Privacy</h2>
                </div>

                <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-3" style={{ borderColor: "#EAEDED" }}>
                  <div>
                    <p className="font-semibold text-sm text-[#1E1E1E]">Data Storage</p>
                    <p className="text-xs text-[#9AA3A3] mt-1">Your data is encrypted and stored securely on your device.</p>
                  </div>
                  <div style={{ borderTop: "1px solid #EAEDED", paddingTop: 12 }}>
                    <p className="font-semibold text-sm text-[#1E1E1E]">Third-party Access</p>
                    <p className="text-xs text-[#9AA3A3] mt-1">We never share your personal information with third parties.</p>
                  </div>
                </div>
              </>
            )}

            {settingsView === "about" && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setSettingsView("main")} className="p-1">
                    <ArrowLeft size={20} color="#1E1E1E" />
                  </button>
                  <h2 className="text-lg font-semibold text-[#1E1E1E]">About</h2>
                </div>

                <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-3" style={{ borderColor: "#EAEDED" }}>
                  <div>
                    <p className="font-semibold text-sm text-[#1E1E1E]">App Version</p>
                    <p className="text-sm text-[#9AA3A3] mt-1">1.0.0</p>
                  </div>
                  <div style={{ borderTop: "1px solid #EAEDED", paddingTop: 12 }}>
                    <p className="font-semibold text-sm text-[#1E1E1E]">Build</p>
                    <p className="text-sm text-[#9AA3A3] mt-1">2024.05.21</p>
                  </div>
                  <div style={{ borderTop: "1px solid #EAEDED", paddingTop: 12 }}>
                    <p className="font-semibold text-sm text-[#1E1E1E]">© 2024 Bloom</p>
                    <p className="text-xs text-[#9AA3A3] mt-1">All rights reserved</p>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BloomNav active={activeTab} onTab={(tab) => {
        if (tab === "settings") setActiveTab("settings");
        else if (tab === "insights") setActiveTab("insights");
        else if (tab === "journal") setActiveTab("journal");
        else setActiveTab("home");
      }} />
    </div>
  );
}

// ─── Screen 4 · Bloom Settings ────────────────────────────────────────────────

function BloomSettingsScreen({ nav }: { nav: Nav }) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#F7F8F7" }}>
      <div className="bg-white shrink-0">
        <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: "#EAEDED" }}>
          <button onClick={() => nav.go("habit-home")} className="mr-3">
            <ArrowLeft size={20} color="#1E1E1E" />
          </button>
          <span className="text-base font-semibold text-[#1E1E1E]">Settings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Profile */}
        <div className="bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-3" style={{ borderColor: "#EAEDED" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#A8C5B8" }}>
            <User size={22} color="white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1E1E1E]">Sarah M.</p>
            <p className="text-xs text-[#9AA3A3]">sarah.m@email.com</p>
          </div>
          <ChevronRight size={16} color="#D6DADB" />
        </div>

        <div>
          <p className="font-semibold uppercase tracking-widest mb-2 px-1" style={{ fontSize: 10, color: "#9AA3A3" }}>Preferences</p>
          <div className="bg-white rounded-2xl px-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
            <SettingsRow icon={Settings} label="General" color="#7FA89C" onClick={() => nav.go("settings-general")} />
            <SettingsRow icon={Bell} label="Notifications" color="#5E8BBF" />
            <SettingsRow icon={Star} label="Appearance" color="#E0B663" />
          </div>
        </div>

        <div>
          <p className="font-semibold uppercase tracking-widest mb-2 px-1" style={{ fontSize: 10, color: "#9AA3A3" }}>Privacy</p>
          <div className="bg-white rounded-2xl px-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
            <SettingsRow icon={Lock} label="Privacy Settings" color="#9AA3A3" />
            <SettingsRow icon={Globe} label="Data & Storage" color="#9AA3A3" />
          </div>
        </div>

        <div>
          <p className="font-semibold uppercase tracking-widest mb-2 px-1" style={{ fontSize: 10, color: "#9AA3A3" }}>About</p>
          <div className="bg-white rounded-2xl px-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
            <SettingsRow icon={Info} label="App Info" value="v2.1.0" color="#9AA3A3" />
            <SettingsRow icon={Heart} label="Help Center" color="#C9666B" />
          </div>
        </div>
      </div>

      <BloomNav active="settings" onTab={(tab) => { if (tab === "home") nav.go("habit-home"); }} />
    </div>
  );
}

// ─── Screen 5 · Settings › General ───────────────────────────────────────────

function GeneralSettingsScreen({ nav }: { nav: Nav }) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#F7F8F7" }}>
      <div className="bg-white shrink-0">
        <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: "#EAEDED" }}>
          <button onClick={() => nav.go("habit-settings")} className="mr-3">
            <ArrowLeft size={20} color="#1E1E1E" />
          </button>
          <span className="text-base font-semibold text-[#1E1E1E]">General</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <p className="font-semibold uppercase tracking-widest mb-2 px-1" style={{ fontSize: 10, color: "#9AA3A3" }}>Preferences</p>
          <div className="bg-white rounded-2xl px-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
            <SettingsRow icon={Calendar} label="Week starts on" value="Monday" color="#7FA89C" />
            <SettingsRow icon={Bell} label="Default reminder" value="8:00 AM" color="#5E8BBF" />
            <SettingsRow icon={Globe} label="Language" value="English" color="#9AA3A3" />
          </div>
        </div>

        {/* Gateway row — highlighted */}
        <div>
          <p className="font-semibold uppercase tracking-widest mb-2 px-1" style={{ fontSize: 10, color: "#9AA3A3" }}>Interface</p>
          <div className="bg-white rounded-2xl px-4 border-2 shadow-sm" style={{ borderColor: "#1F4D4F33" }}>
            <SettingsRow icon={Layers} label="App Interface" value="Bloom" color="#1F4D4F" onClick={() => nav.go("app-mode")} />
          </div>
          <p className="text-[10px] text-[#9AA3A3] mt-1.5 px-1.5">Manage which interface is currently active</p>
        </div>

        <div>
          <p className="font-semibold uppercase tracking-widest mb-2 px-1" style={{ fontSize: 10, color: "#9AA3A3" }}>Sync</p>
          <div className="bg-white rounded-2xl px-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
            <div className="flex items-center gap-3 py-3 border-b" style={{ borderColor: "#EAEDED" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#7FA89C22" }}>
                <Heart size={16} color="#7FA89C" />
              </div>
              <span className="flex-1 text-sm text-[#1E1E1E]">Sync with Health</span>
              <div className="w-10 h-6 rounded-full flex items-center px-0.5" style={{ backgroundColor: "#7FA89C" }}>
                <div className="w-5 h-5 rounded-full bg-white shadow-sm ml-auto" />
              </div>
            </div>
            <SettingsRow icon={RefreshCw} label="iCloud Backup" value="On" color="#5E8BBF" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 6 · App Interface / Mode ─────────────────────────────────────────

function AppModeScreen({ nav }: { nav: Nav }) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#F7F8F7" }}>
      <div className="bg-white shrink-0">
        <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: "#EAEDED" }}>
          <button onClick={() => nav.go("settings-general")} className="mr-3">
            <ArrowLeft size={20} color="#1E1E1E" />
          </button>
          <span className="text-base font-semibold text-[#1E1E1E]">App Interface</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <p className="text-sm text-[#9AA3A3] px-0.5 leading-relaxed">
          Switch between interfaces at any time. Your data in both is always kept safe and private.
        </p>

        {/* Active: Bloom */}
        <div className="bg-white rounded-2xl p-4 border-2 shadow-sm" style={{ borderColor: "#7FA89C" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#7FA89C" }}>
              <Activity size={22} color="white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-[#1E1E1E]">Bloom</p>
                <span className="text-white rounded-full px-2 py-0.5 font-semibold"
                  style={{ fontSize: 9, backgroundColor: "#7FA89C" }}>Active</span>
              </div>
              <p className="text-xs text-[#9AA3A3]">Habit tracker · Currently active</p>
            </div>
            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "#7FA89C" }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#7FA89C" }} />
            </div>
          </div>
        </div>

        {/* Switch to: Nura */}
        <div className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: "#EAEDED" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#1F4D4F" }}>
              <Moon size={22} color="white" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1E1E1E]">nura</p>
              <p className="text-xs text-[#9AA3A3]">Safety & evidence app</p>
            </div>
            <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "#D6DADB" }} />
          </div>
          <button
            onClick={() => nav.go("nura-return")}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#1F4D4F" }}>
            Switch to Nura
          </button>
        </div>

        <p className="text-center text-[#9AA3A3] px-4" style={{ fontSize: 11 }}>
          Both interfaces are fully private. No notifications or banners will indicate a switch.
        </p>
      </div>
    </div>
  );
}

// ─── Screen 7 · Switch Confirmation ──────────────────────────────────────────

function SwitchConfirmScreen({ nav }: { nav: Nav }) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#F7F8F7" }}>
        <div className="bg-white shrink-0">
        <div className="flex items-center px-4 py-3">
          <button onClick={() => nav.go("app-mode")} className="mr-3">
            <ArrowLeft size={20} color="#1E1E1E" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 rounded-[28px] flex items-center justify-center shadow-xl"
          style={{ backgroundColor: "#1F4D4F" }}>
          <Moon size={36} color="white" strokeWidth={1.5} />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#1E1E1E]">Return to Nura?</h2>
          <p className="text-sm text-[#9AA3A3] mt-2 leading-relaxed">
            Bloom will continue running quietly in the background.
            Your habits and progress are saved.
          </p>
        </div>

        <div className="w-full space-y-3 mt-1">
          <button onClick={() => nav.go("nura-return")}
            className="w-full py-4 rounded-2xl text-sm font-semibold text-white shadow-lg transition-colors"
            style={{ backgroundColor: "#1F4D4F" }}>
            Switch to Nura
          </button>
          <button onClick={() => nav.go("habit-home")}
            className="w-full py-4 rounded-2xl text-sm font-medium text-[#1E1E1E] bg-white border transition-colors"
            style={{ borderColor: "#EAEDED" }}>
            Stay in Bloom
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen Renderer ──────────────────────────────────────────────────────────

function ScreenRenderer({ screen, nav }: { screen: ScreenId; nav: Nav }) {
  switch (screen) {
    case "nura-home": return <NuraHomeScreen nav={nav} />;
    case "panic-transition": return <BloomHomeScreen nav={nav} />; // instant switch
    case "habit-home": return <BloomHomeScreen nav={nav} />;
    case "habit-settings": return <BloomSettingsScreen nav={nav} />;
    case "settings-general": return <GeneralSettingsScreen nav={nav} />;
    case "app-mode": return <AppModeScreen nav={nav} />;
    case "switch-confirm": return <NuraHomeScreen nav={nav} isReturn />; // instant return
    case "nura-return": return <NuraHomeScreen nav={nav} isReturn />;
  }
}

// ─── Phone Frame ──────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative" style={{ width: 375, height: 740, flexShrink: 0 }}>
      <div className="absolute inset-0 rounded-[44px]"
        style={{ background: "#1A1A1A", boxShadow: "0 40px 100px rgba(0,0,0,0.38), 0 10px 30px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06) inset" }} />
      <div className="absolute top-2 left-2 right-2 bottom-2 rounded-[36px] overflow-hidden" style={{ backgroundColor: "#F7F8F7" }}>
        {/* Dynamic Island */}
        <div className="absolute left-1/2 z-20 flex items-center justify-center"
          style={{ top: 10, transform: "translateX(-50%)", width: 120, height: 34, backgroundColor: "#1A1A1A", borderRadius: 20 }} />
        {/* Content */}
        <div className="absolute inset-0 overflow-hidden" style={{ paddingTop: 50 }}>
          {children}
        </div>
        {/* Home indicator */}
        <div className="absolute left-1/2 rounded-full"
          style={{ bottom: 6, transform: "translateX(-50%)", width: 120, height: 5, backgroundColor: "#1A1A1A", opacity: 0.18 }} />
      </div>
      {/* Volume buttons */}
      <div className="absolute rounded-l-sm" style={{ left: -4, top: 108, width: 4, height: 28, backgroundColor: "#2A2A2A" }} />
      <div className="absolute rounded-l-sm" style={{ left: -4, top: 152, width: 4, height: 44, backgroundColor: "#2A2A2A" }} />
      <div className="absolute rounded-l-sm" style={{ left: -4, top: 208, width: 4, height: 44, backgroundColor: "#2A2A2A" }} />
      {/* Power */}
      <div className="absolute rounded-r-sm" style={{ right: -4, top: 168, width: 4, height: 60, backgroundColor: "#2A2A2A" }} />
    </div>
  );
}

// ─── Flow Indicator ───────────────────────────────────────────────────────────

function FlowIndicator({ current, onSelect }: { current: ScreenId; onSelect: (id: ScreenId) => void }) {
  const idx = FLOW.findIndex((s) => s.id === current);
  const getColor = (app: "dv" | "mid" | "habit") =>
    app === "dv" ? "#1F4D4F" : app === "habit" ? "#7FA89C" : "#9AA3A3";

  return (
    <div className="w-full max-w-2xl px-2">
      <div className="flex items-start">
        {FLOW.map((step, i) => {
          const isActive = step.id === current;
          const isPast = i < idx;
          const color = getColor(step.app);
          return (
            <div key={step.id} className="flex items-start flex-1 last:flex-none">
              <button onClick={() => onSelect(step.id)}
                className="flex flex-col items-center gap-1 transition-opacity hover:opacity-80" style={{ minWidth: 0 }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
                  style={{ backgroundColor: isActive || isPast ? color : "transparent", borderColor: color, color: isActive || isPast ? "white" : color, fontSize: 11, fontWeight: 700 }}>
                  {isPast ? <Check size={14} /> : i + 1}
                </div>
                <span className="text-center leading-tight"
                  style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? "#1E1E1E" : "#9AA3A3", maxWidth: 58 }}>
                  {step.label}
                </span>
              </button>
              {i < FLOW.length - 1 && (
                <div className="transition-all"
                  style={{ flex: 1, height: 2, marginTop: 14, marginLeft: 2, marginRight: 2, backgroundColor: isPast ? color : "#EAEDED", borderRadius: 2 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("nura-home");
  const nav: Nav = { go: setScreen };

  return (
    <div className="h-screen overflow-hidden"
      style={{ fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <ScreenRenderer screen={screen} nav={nav} />
    </div>
  );
}
