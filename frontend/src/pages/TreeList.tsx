import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { scoreColor } from "@/lib/constants";
import { mockTrees } from "@/lib/mockData";
import { useApiWithFallback } from "@/hooks/useApi";
import { fetchTrees } from "@/lib/api";
import type { AgentTree } from "@/types";

const statusStyles: Record<string, string> = {
  idle: "bg-text-dim/10 text-text-dim",
  training: "bg-accent/10 text-accent",
  evaluating: "bg-amber/10 text-amber",
  deploying: "bg-green/10 text-green",
};

export default function TreeList() {
  const { data: trees } = useApiWithFallback<AgentTree[]>(
    fetchTrees,
    mockTrees
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="font-['Sora'] text-2xl font-semibold text-text">
          Agent Trees
        </h1>
        <p className="text-sm text-text-soft mt-1">
          {trees.length} tree{trees.length !== 1 ? "s" : ""} registered
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trees.map((tree, i) => (
          <motion.div
            key={tree.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/trees/${tree.id}`}
              className="block bg-surface border border-border rounded-xl p-6 hover:border-accent/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-['Sora'] font-medium text-text group-hover:text-accent transition-colors">
                  {tree.name}
                </h3>
                <span
                  className={`text-[10px] font-['DM_Mono'] uppercase px-2 py-0.5 rounded ${
                    statusStyles[tree.status] || statusStyles.idle
                  }`}
                >
                  {tree.status}
                </span>
              </div>

              <p className="text-xs text-text-soft line-clamp-2 mb-4">
                {tree.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-text-dim">
                  <span>{tree.agent_count ?? tree.agents.length} agents</span>
                  <span>{tree.owner}</span>
                </div>
                <span
                  className="text-lg font-['DM_Mono'] font-medium"
                  style={{ color: scoreColor(tree.score) }}
                >
                  {tree.score}%
                </span>
              </div>

              {/* Score bar */}
              <div className="mt-3 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${tree.score}%`,
                    backgroundColor: scoreColor(tree.score),
                  }}
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
