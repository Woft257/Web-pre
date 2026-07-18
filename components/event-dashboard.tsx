"use client";

import {
  BarChart3,
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  Trophy,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { LeaderboardView } from "@/components/leaderboard-view";
import { MarketWorkspace } from "@/components/market-workspace";
import { MexcLogo } from "@/components/mexc-logo";
import { PortfolioView } from "@/components/portfolio-view";
import { UidGate } from "@/components/uid-gate";
import { apiRequest, formatPoints } from "@/lib/client/api";
import type {
  CurrentUser,
  LeaderboardEntry,
  MarketHistoryPoint,
  PortfolioData,
  PublicMarket,
} from "@/lib/client/types";
import { compactPriceHistory } from "@/lib/domain/history";
import { getBrowserClient } from "@/lib/supabase/browser";

type Tab = "markets" | "leaderboard" | "portfolio";

export function EventDashboard({
  initialMarkets,
  initialUser,
}: {
  initialMarkets: PublicMarket[];
  initialUser: CurrentUser | null;
}) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [user, setUser] = useState(initialUser);
  const [selectedMarketId, setSelectedMarketId] = useState(initialMarkets[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("markets");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [historyByMarket, setHistoryByMarket] = useState<Record<string, MarketHistoryPoint[]>>({});
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting");
  const [loadingView, setLoadingView] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const authEpoch = useRef(0);

  const runBackground = useCallback((task: Promise<unknown>) => {
    void task.catch(() => setConnection("offline"));
  }, []);

  const selectedMarket = markets.find((market) => market.id === selectedMarketId) ?? markets[0];
  const selectedPosition = portfolio?.positions.find((position) => position.marketId === selectedMarket?.id);
  const selectedHistory = useMemo(() => {
    if (!selectedMarket) return [];
    const cached = historyByMarket[selectedMarket.id] ?? [];
    if (!selectedMarket.oracleSourceAt) return cached;
    const currentPoint: MarketHistoryPoint = {
      homeProbability: selectedMarket.home.oracleProbability,
      awayProbability: selectedMarket.away.oracleProbability,
      sourceAt: selectedMarket.oracleSourceAt,
      oracleVersion: selectedMarket.oracleVersion,
      event: selectedMarket.latestEvent,
    };
    return compactPriceHistory(
      [...cached, currentPoint]
        .sort((left, right) => Date.parse(left.sourceAt) - Date.parse(right.sourceAt)),
    );
  }, [historyByMarket, selectedMarket]);

  const refreshMarkets = useCallback(async () => {
    const data = await apiRequest<PublicMarket[]>("/api/markets");
    setMarkets(data);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!user) return;
    const requestEpoch = authEpoch.current;
    const data = await apiRequest<CurrentUser>("/api/me");
    if (authEpoch.current === requestEpoch) setUser(data);
  }, [user]);

  const refreshLeaderboard = useCallback(async () => {
    setLoadingView(true);
    try {
      setLeaderboard(await apiRequest<LeaderboardEntry[]>("/api/leaderboard"));
    } finally {
      setLoadingView(false);
    }
  }, []);

  const refreshPortfolio = useCallback(async () => {
    if (!user) return;
    const requestEpoch = authEpoch.current;
    setLoadingView(true);
    try {
      const data = await apiRequest<PortfolioData>("/api/portfolio");
      if (authEpoch.current === requestEpoch) setPortfolio(data);
    } finally {
      if (authEpoch.current === requestEpoch) setLoadingView(false);
    }
  }, [user]);

  const refreshMarketDetail = useCallback(async (marketId: string) => {
    const data = await apiRequest<{ history: MarketHistoryPoint[] }>(
      `/api/markets/${marketId}`,
      { cache: "default" },
    );
    setHistoryByMarket((current) => {
      const merged = compactPriceHistory(
        [...data.history, ...(current[marketId] ?? [])]
          .sort((left, right) => Date.parse(left.sourceAt) - Date.parse(right.sourceAt)),
      );
      return { ...current, [marketId]: merged };
    });
  }, []);

  const refreshUserState = useCallback(async () => {
    await Promise.all([refreshMarkets(), refreshMe(), refreshPortfolio(), refreshLeaderboard()]);
  }, [refreshLeaderboard, refreshMarkets, refreshMe, refreshPortfolio]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      runBackground(refreshLeaderboard());
      if (user) runBackground(refreshPortfolio());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshLeaderboard, refreshPortfolio, runBackground, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedMarketId) runBackground(refreshMarketDetail(selectedMarketId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshMarketDetail, runBackground, selectedMarketId]);

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("public-event-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "markets" },
        () => {
          runBackground(refreshMarkets());
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_entries" },
        () => {
          runBackground(refreshLeaderboard());
          if (user) runBackground(Promise.all([refreshMe(), refreshPortfolio()]));
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("live");
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) setConnection("offline");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshLeaderboard, refreshMarkets, refreshMe, refreshPortfolio, runBackground, user]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      runBackground(refreshMarkets());
      if (connection !== "live") {
        runBackground(refreshLeaderboard());
      }
    }, connection === "live" ? 15_000 : 3_000);
    return () => window.clearInterval(interval);
  }, [connection, refreshLeaderboard, refreshMarkets, runBackground]);

  const totalPredictions = useMemo(
    () => leaderboard.reduce((sum, entry) => sum + entry.settledPredictions, 0),
    [leaderboard],
  );

  async function signOut() {
    authEpoch.current += 1;
    await apiRequest<{ signedOut: boolean }>("/api/session", { method: "DELETE" });
    setUser(null);
    setPortfolio(null);
    setMobileMenu(false);
    setAccountOpen(false);
  }

  function authenticateUser(nextUser: CurrentUser) {
    authEpoch.current += 1;
    setUser(nextUser);
  }

  function openAccountSecurity() {
    setMobileMenu(false);
    setAccountOpen(true);
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setMobileMenu(false);
    if (tab === "leaderboard") runBackground(refreshLeaderboard());
    if (tab === "portfolio") runBackground(refreshPortfolio());
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand-link" href="/" aria-label="MEXC Kickoff Markets">
            <MexcLogo />
            <span className="brand-divider" />
            <strong>Kickoff Markets</strong>
          </Link>

          <nav className="desktop-nav" aria-label="Primary">
            <NavButton active={activeTab === "markets"} onClick={() => switchTab("markets")} icon={<BarChart3 size={17} />} label="Markets" />
            <NavButton active={activeTab === "leaderboard"} onClick={() => switchTab("leaderboard")} icon={<Trophy size={17} />} label="Leaderboard" />
            <NavButton active={activeTab === "portfolio"} onClick={() => switchTab("portfolio")} icon={<WalletCards size={17} />} label="My predictions" />
          </nav>

          <div className="header-actions">
            <div className={`connection-indicator connection-${connection}`} title={`Realtime: ${connection}`}>
              <span /> {connection === "live" ? "Live" : connection}
            </div>
            {user && (
              <>
                <div className="user-pill">
                  <span><UserRound size={16} /> {user.maskedUid}</span>
                  <strong>{formatPoints(user.balance)} PTS</strong>
                </div>
                <div className="desktop-account-actions">
                  <button className="icon-button" type="button" onClick={openAccountSecurity} title="Change password" aria-label="Change password">
                    <KeyRound size={17} />
                  </button>
                  <button className="icon-button" type="button" onClick={() => void signOut()} title="Sign out" aria-label="Sign out">
                    <LogOut size={17} />
                  </button>
                </div>
              </>
            )}
            <button className="mobile-menu-button" type="button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu">
              {mobileMenu ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="mobile-menu">
            <NavButton active={activeTab === "markets"} onClick={() => switchTab("markets")} icon={<BarChart3 size={17} />} label="Markets" />
            <NavButton active={activeTab === "leaderboard"} onClick={() => switchTab("leaderboard")} icon={<Trophy size={17} />} label="Leaderboard" />
            <NavButton active={activeTab === "portfolio"} onClick={() => switchTab("portfolio")} icon={<WalletCards size={17} />} label="My predictions" />
            {user && <button type="button" onClick={openAccountSecurity}><KeyRound size={17} /> Change password</button>}
            {user && <button type="button" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button>}
          </div>
        )}
      </header>

      <section className="event-strip">
        <div className="event-strip-overlay" />
        <div className="event-strip-content">
          <div>
            <p className="eyebrow">MEXC Football Event 2026</p>
            <h1>Kickoff Markets</h1>
          </div>
          <div className="event-stats">
            <div><span>Markets</span><strong>{markets.length}</strong></div>
            <div><span>Players</span><strong>{leaderboard.length}</strong></div>
            <div><span>Settled picks</span><strong>{totalPredictions}</strong></div>
          </div>
        </div>
      </section>

      <div className="mobile-tab-bar">
        <button className={activeTab === "markets" ? "active" : ""} onClick={() => switchTab("markets")}><BarChart3 size={18} /><span>Markets</span></button>
        <button className={activeTab === "leaderboard" ? "active" : ""} onClick={() => switchTab("leaderboard")}><Trophy size={18} /><span>Ranking</span></button>
        <button className={activeTab === "portfolio" ? "active" : ""} onClick={() => switchTab("portfolio")}><WalletCards size={18} /><span>Portfolio</span></button>
      </div>

      <div className="main-content">
        {activeTab === "markets" && user && (
          <MarketWorkspace
            markets={markets}
            selectedId={selectedMarketId}
            onSelect={setSelectedMarketId}
            user={user}
            position={selectedPosition}
            history={selectedHistory}
            onTradeComplete={refreshUserState}
          />
        )}
        {activeTab === "leaderboard" && (
          <LeaderboardView entries={leaderboard} user={user} loading={loadingView} onRefresh={() => runBackground(refreshLeaderboard())} />
        )}
        {activeTab === "portfolio" && user && (
          <PortfolioView portfolio={portfolio} user={user} loading={loadingView} />
        )}
      </div>

      <footer className="site-footer">
        <span>MEXC Kickoff Markets</span>
        <span>Points event / GMT+7</span>
      </footer>

      {!user && <UidGate onAuthenticated={authenticateUser} />}
      {user && accountOpen && <ChangePasswordDialog onClose={() => setAccountOpen(false)} />}
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      {icon} {label} {active && <ChevronDown size={13} />}
    </button>
  );
}
