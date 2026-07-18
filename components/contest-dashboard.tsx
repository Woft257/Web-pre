"use client";

import {
  ClipboardCheck,
  Clock3,
  ListOrdered,
  LogOut,
  Menu,
  RefreshCw,
  ScrollText,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AccessGate } from "@/components/access-gate";
import { ContestLeaderboard } from "@/components/contest-leaderboard";
import { MexcLogo } from "@/components/mexc-logo";
import { PredictionForm } from "@/components/prediction-form";
import { RulesView } from "@/components/rules-view";
import { TeamFlag } from "@/components/team-flag";
import { TimelineView } from "@/components/timeline-view";
import { apiRequest, formatBangkokTime } from "@/lib/client/api";
import type {
  ContestData,
  CurrentUser,
  LeaderboardData,
  Prediction,
  PredictionData,
} from "@/lib/client/types";

type Tab = "prediction" | "timeline" | "leaderboard" | "rules";

const emptyLeaderboard: LeaderboardData = { published: false, result: null, entries: [] };

export function ContestDashboard({
  initialContest,
  initialUser,
  initialPrediction,
}: {
  initialContest: ContestData;
  initialUser: CurrentUser | null;
  initialPrediction: PredictionData;
}) {
  const [contest, setContest] = useState(initialContest);
  const [user, setUser] = useState(initialUser);
  const [predictionData, setPredictionData] = useState(initialPrediction);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData>(emptyLeaderboard);
  const [activeTab, setActiveTab] = useState<Tab>("prediction");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timelinePage, setTimelinePage] = useState(initialPrediction.timelinePagination.page);
  const userId = user?.id ?? null;

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const nextContest = await apiRequest<ContestData>("/api/contest");
      setContest(nextContest);
      if (userId) {
        const [nextPrediction, nextLeaderboard] = await Promise.all([
          apiRequest<PredictionData>(`/api/predictions?page=${timelinePage}`),
          apiRequest<LeaderboardData>("/api/leaderboard"),
        ]);
        setPredictionData(nextPrediction);
        setLeaderboard(nextLeaderboard);
        setUser((current) => current ? {
          ...current,
          hasPrediction: Boolean(nextPrediction.prediction),
          submittedAt: nextPrediction.prediction?.submittedAt ?? null,
        } : null);
      }
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, [timelinePage, userId]);

  useEffect(() => {
    if (!userId) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [refresh, userId]);

  function authenticate(nextUser: CurrentUser) {
    setUser(nextUser);
    setActiveTab(nextUser.hasPrediction ? "timeline" : "prediction");
  }

  async function signOut() {
    await apiRequest<{ signedOut: boolean }>("/api/session", { method: "DELETE" });
    setUser(null);
    setPredictionData({
      prediction: null,
      timeline: [],
      timelinePagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });
    setTimelinePage(1);
    setLeaderboard(emptyLeaderboard);
    setActiveTab("prediction");
    setMobileMenu(false);
  }

  async function predictionSubmitted(prediction: Prediction) {
    setPredictionData((current) => ({ ...current, prediction }));
    setUser((current) => current ? { ...current, hasPrediction: true, submittedAt: prediction.submittedAt } : null);
    setTimelinePage(1);
    await refresh();
    setActiveTab("timeline");
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setMobileMenu(false);
  }

  return (
    <div className="contest-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand-link" href="/" aria-label="MEXC World Cup Prediction">
            <MexcLogo />
            <span className="brand-divider" />
            <strong>World Cup Final</strong>
          </Link>

          <nav className="desktop-nav" aria-label="Điều hướng chính">
            <NavButton active={activeTab === "prediction"} onClick={() => switchTab("prediction")} icon={<ClipboardCheck size={17} />} label="Dự đoán" />
            <NavButton active={activeTab === "timeline"} onClick={() => switchTab("timeline")} icon={<ListOrdered size={17} />} label="Timeline" />
            <NavButton active={activeTab === "leaderboard"} onClick={() => switchTab("leaderboard")} icon={<Trophy size={17} />} label="Bảng xếp hạng" />
            <NavButton active={activeTab === "rules"} onClick={() => switchTab("rules")} icon={<ScrollText size={17} />} label="Thể lệ" />
          </nav>

          <div className="header-actions">
            {user && <div className="user-pill"><UserRound size={16} /><span>{user.maskedUid}</span></div>}
            {user && <button className="icon-button desktop-only" type="button" onClick={() => void signOut()} title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={18} /></button>}
            <button className="icon-button" type="button" onClick={() => void refresh(true)} title="Làm mới" aria-label="Làm mới"><RefreshCw className={refreshing ? "spin" : ""} size={18} /></button>
            <button className="mobile-menu-button" type="button" onClick={() => setMobileMenu((open) => !open)} aria-label="Mở menu">{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
          </div>
        </div>
        {mobileMenu && (
          <div className="mobile-menu">
            <NavButton active={activeTab === "prediction"} onClick={() => switchTab("prediction")} icon={<ClipboardCheck size={17} />} label="Dự đoán" />
            <NavButton active={activeTab === "timeline"} onClick={() => switchTab("timeline")} icon={<ListOrdered size={17} />} label="Timeline" />
            <NavButton active={activeTab === "leaderboard"} onClick={() => switchTab("leaderboard")} icon={<Trophy size={17} />} label="Bảng xếp hạng" />
            <NavButton active={activeTab === "rules"} onClick={() => switchTab("rules")} icon={<ScrollText size={17} />} label="Thể lệ" />
            {user && <button type="button" onClick={() => void signOut()}><LogOut size={17} /> Đăng xuất</button>}
          </div>
        )}
      </header>

      <section className="contest-banner">
        <div className="contest-banner-overlay" />
        <div className="contest-banner-content">
          <div>
            <p className="eyebrow">MEXC Football Event 2026</p>
            <h1>Dự đoán chung kết World Cup 2026</h1>
            <p className="banner-subtitle"><Clock3 size={15} /> Nhận dự đoán đến {formatBangkokTime(contest.settings.submissionClosesAt)}</p>
          </div>
          <div className="match-lockup" aria-label="Argentina versus Spain">
            <div><TeamFlag code="ARG" size={45} /><strong>Argentina</strong></div>
            <span>VS</span>
            <div><TeamFlag code="ESP" size={45} /><strong>Tây Ban Nha</strong></div>
          </div>
          <div className="banner-stats">
            <div><span>Người tham gia</span><strong>{contest.stats.participants}</strong></div>
            <div><span>Dự đoán hợp lệ</span><strong>{contest.stats.predictions}</strong></div>
            <div><span>Tổng giải thưởng</span><strong>2,000 USDT</strong></div>
          </div>
        </div>
      </section>

      <div className="mobile-tab-bar">
        <NavButton active={activeTab === "prediction"} onClick={() => switchTab("prediction")} icon={<ClipboardCheck size={18} />} label="Dự đoán" />
        <NavButton active={activeTab === "timeline"} onClick={() => switchTab("timeline")} icon={<ListOrdered size={18} />} label="Timeline" />
        <NavButton active={activeTab === "leaderboard"} onClick={() => switchTab("leaderboard")} icon={<Trophy size={18} />} label="BXH" />
        <NavButton active={activeTab === "rules"} onClick={() => switchTab("rules")} icon={<ScrollText size={18} />} label="Thể lệ" />
      </div>

      <main className="contest-main">
        {user && activeTab === "prediction" && <PredictionForm settings={contest.settings} prediction={predictionData.prediction} onSubmitted={(saved) => void predictionSubmitted(saved)} />}
        {user && activeTab === "timeline" && (
          <TimelineView
            entries={predictionData.timeline}
            pagination={predictionData.timelinePagination}
            user={user}
            onPageChange={setTimelinePage}
          />
        )}
        {user && activeTab === "leaderboard" && <ContestLeaderboard data={leaderboard} />}
        {activeTab === "rules" && <RulesView />}
      </main>

      <footer className="site-footer"><span>MEXC Vietnam Community</span><span>Hoạt động tương tác cộng đồng / GMT+7</span></footer>
      {!user && <AccessGate onAuthenticated={authenticate} />}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" className={active ? "active" : ""} onClick={onClick}>{icon}<span>{label}</span></button>;
}
