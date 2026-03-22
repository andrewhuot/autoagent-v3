import { useMemo, useState } from "react";
import type { Agent } from "@/types";
import { agentColor, scoreColor } from "@/lib/constants";

interface Props {
  agents: Agent[];
  selectedId?: string | null;
  onSelect?: (agent: Agent) => void;
  showBefore?: boolean;
  width?: number;
  height?: number;
}

interface LayoutNode {
  agent: Agent;
  x: number;
  y: number;
  r: number;
  depth: number;
  children: LayoutNode[];
}

function buildTree(agents: Agent[]): LayoutNode | null {
  const root = agents.find((a) => a.parent_agent_id === null);
  if (!root) return null;

  const byParent = new Map<string, Agent[]>();
  for (const a of agents) {
    if (a.parent_agent_id) {
      const list = byParent.get(a.parent_agent_id) || [];
      list.push(a);
      byParent.set(a.parent_agent_id, list);
    }
  }

  function makeNode(agent: Agent, depth: number): LayoutNode {
    const children = (byParent.get(agent.id) || []).map((c) =>
      makeNode(c, depth + 1)
    );
    const r = depth === 0 ? 28 : depth === 1 ? 22 : 18;
    return { agent, x: 0, y: 0, r, depth, children };
  }

  return makeNode(root, 0);
}

function layoutTree(node: LayoutNode, width: number, height: number): LayoutNode {
  const levels: LayoutNode[][] = [];

  function collect(n: LayoutNode, depth: number) {
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(n);
    for (const c of n.children) collect(c, depth + 1);
  }
  collect(node, 0);

  const vSpacing = height / (levels.length + 1);

  for (let d = 0; d < levels.length; d++) {
    const row = levels[d];
    const hSpacing = width / (row.length + 1);
    for (let i = 0; i < row.length; i++) {
      row[i].x = hSpacing * (i + 1);
      row[i].y = vSpacing * (d + 1);
    }
  }

  return node;
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

function collectEdges(
  node: LayoutNode
): Array<{ from: LayoutNode; to: LayoutNode }> {
  const edges: Array<{ from: LayoutNode; to: LayoutNode }> = [];
  for (const child of node.children) {
    edges.push({ from: node, to: child });
    edges.push(...collectEdges(child));
  }
  return edges;
}

function collectNodes(node: LayoutNode): LayoutNode[] {
  return [node, ...node.children.flatMap(collectNodes)];
}

export default function AgentTreeVisualizer({
  agents,
  selectedId,
  onSelect,
  showBefore = false,
  width = 700,
  height = 420,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const rootNode = useMemo(() => {
    const tree = buildTree(agents);
    if (!tree) return null;
    return layoutTree(tree, width, height);
  }, [agents, width, height]);

  if (!rootNode) {
    return (
      <div className="flex items-center justify-center h-48 text-text-dim text-sm">
        No agents to visualize
      </div>
    );
  }

  const edges = collectEdges(rootNode);
  const nodes = collectNodes(rootNode);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      style={{ maxHeight: height }}
    >
      <defs>
        {nodes.map((n) => {
          const score = showBefore ? n.agent.score_before : n.agent.score;
          const color = scoreColor(score);
          return (
            <radialGradient
              key={`glow-${n.agent.id}`}
              id={`glow-${n.agent.id}`}
            >
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          );
        })}
      </defs>

      {/* Edges */}
      {edges.map(({ from, to }) => {
        const toScore = showBefore ? to.agent.score_before : to.agent.score;
        const edgeColor = scoreColor(toScore);
        return (
          <path
            key={`${from.agent.id}-${to.agent.id}`}
            d={bezierPath(
              from.x,
              from.y + from.r,
              to.x,
              to.y - to.r
            )}
            fill="none"
            stroke={edgeColor}
            strokeWidth={1.5}
            strokeOpacity={0.35}
            strokeDasharray={to.agent.is_shared ? "4 3" : undefined}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const score = showBefore ? n.agent.score_before : n.agent.score;
        const color = scoreColor(score);
        const isSelected = selectedId === n.agent.id;
        const isHovered = hovered === n.agent.id;

        return (
          <g
            key={n.agent.id}
            className="cursor-pointer"
            onClick={() => onSelect?.(n.agent)}
            onMouseEnter={() => setHovered(n.agent.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Glow */}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r * 2.2}
              fill={`url(#glow-${n.agent.id})`}
              opacity={isSelected || isHovered ? 1 : 0.6}
            />

            {/* Node circle */}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill="#0a0a1e"
              stroke={color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              opacity={isSelected || isHovered ? 1 : 0.85}
            />

            {/* Score text */}
            <text
              x={n.x}
              y={n.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={color}
              fontSize={n.depth === 0 ? 11 : n.depth === 1 ? 9 : 8}
              fontFamily="'DM Mono', monospace"
              fontWeight={500}
            >
              {score}%
            </text>

            {/* Agent name */}
            <text
              x={n.x}
              y={n.y + n.r + 14}
              textAnchor="middle"
              fill="#e4e4f0"
              fontSize={10}
              fontFamily="'Sora', sans-serif"
              fontWeight={500}
            >
              {n.agent.name}
            </text>

            {/* Role badge */}
            <text
              x={n.x}
              y={n.y + n.r + 26}
              textAnchor="middle"
              fill={agentColor(n.agent.name)}
              fontSize={8}
              fontFamily="'DM Mono', monospace"
              opacity={0.7}
            >
              {n.agent.role}
            </text>

            {/* Shared indicator */}
            {n.agent.is_shared && (
              <circle
                cx={n.x + n.r - 2}
                cy={n.y - n.r + 2}
                r={4}
                fill="#40d0c0"
                stroke="#0a0a1e"
                strokeWidth={1.5}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
