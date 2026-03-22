import { useState, useEffect } from "react";
import { Routes, Route, NavLink, useLocation, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import MorningBriefing from "@/pages/MorningBriefing";
import TreeList from "@/pages/TreeList";
import TreeDetail from "@/pages/TreeDetail";
import HealthScan from "@/components/HealthScan";
import TrainingLiveView from "@/pages/TrainingLiveView";
import ExperimentDetail from "@/pages/ExperimentDetail";
import ConfigWizard from "@/pages/ConfigWizard";
import DeployPage from "@/pages/DeployPage";

function HealthScanWrapper() {
  const { id } = useParams<{ id: string }>();
  return <HealthScan treeId={id || "tree-1"} />;
}

export default function App() {
  const location = useLocation();
  const [latestSessionId, setLatestSessionId] = useState("sess-1");

  useEffect(() => {
    fetch("/api/sessions/")
      .then((r) => r.json())
      .then((sessions) => {
        if (sessions.length > 0) setLatestSessionId(sessions[0].id);
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { to: "/", label: "Briefing", icon: "\u25C8" },
    { to: "/trees", label: "Agent Trees", icon: "\u25E6" },
    { to: `/training/${latestSessionId}`, label: "Training", icon: "\u25B7" },
    { to: "/configure", label: "Configure", icon: "\u2699" },
    { to: "/deploy", label: "Deploy", icon: "\u2B06" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-surface border-r border-border flex flex-col fixed h-screen z-30">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-border">
          <h1 className="font-['Sora'] text-lg font-semibold tracking-tight text-text">
            <span className="text-accent">Auto</span>Agent
          </h1>
          <p className="text-[11px] text-text-dim mt-0.5 tracking-wide uppercase">
            Observatory
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                  isActive
                    ? "bg-accent/12 text-accent border border-accent/20"
                    : "text-text-soft hover:text-text hover:bg-white/[0.03] border border-transparent"
                )
              }
            >
              <span className="text-base w-5 text-center">{icon}</span>
              <span className="font-['Sora'] font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
            <span className="text-xs text-text-dim">System Online</span>
          </div>
          <p className="text-[10px] text-text-dim mt-2">v3.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1" style={{ marginLeft: "15rem" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="min-h-screen"
          >
            <Routes location={location}>
              <Route path="/" element={<MorningBriefing />} />
              <Route path="/trees" element={<TreeList />} />
              <Route path="/trees/:id" element={<TreeDetail />} />
              <Route path="/health/:id" element={<HealthScanWrapper />} />
              <Route path="/training/:id" element={<TrainingLiveView />} />
              <Route path="/experiments/:id" element={<ExperimentDetail />} />
              <Route path="/configure" element={<ConfigWizard />} />
              <Route path="/deploy" element={<DeployPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
