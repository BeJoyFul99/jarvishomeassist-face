import { useFleet } from "@/hooks/useFleet";

const VIEW_W = 400;
const VIEW_H = 170;

const statusColors: Record<string, string> = {
  online: "hsl(var(--cyan))",
  degraded: "hsl(var(--amber))",
  offline: "hsl(var(--crimson))",
};

const ClusterMap = () => {
  const { nodes, activeNodeId, setActiveNodeId } = useFleet();

  // Distribute nodes evenly across the map, whatever the fleet size
  const positioned = nodes.map((node, i) => ({
    node,
    x: ((i + 1) * VIEW_W) / (nodes.length + 1),
    y: nodes.length > 1 ? (i % 2 === 0 ? 60 : 95) : 70,
  }));

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Cluster Map</h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
        </span>
      </div>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto">
        {/* Connection lines */}
        {positioned.map((a, i) =>
          positioned.slice(i + 1).map((b) => (
            <line
              key={`${a.node.id}-${b.node.id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray={
                a.node.status === "offline" || b.node.status === "offline"
                  ? "4,4"
                  : undefined
              }
              opacity={0.5}
            />
          ))
        )}

        {/* Nodes */}
        {positioned.map(({ node, x, y }) => {
          const isActive = node.id === activeNodeId;
          const color =
            statusColors[node.status] ?? "hsl(var(--muted-foreground))";
          return (
            <g
              key={node.id}
              onClick={() => setActiveNodeId(node.id)}
              className="cursor-pointer"
            >
              {/* Enlarged invisible hit area for touch */}
              <circle cx={x} cy={y} r="26" fill="transparent" />
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r="23"
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity={0.3}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r="16"
                fill={isActive ? color : "hsl(var(--secondary))"}
                stroke={color}
                strokeWidth={isActive ? 2 : 1}
                opacity={node.status === "offline" ? 0.3 : 1}
              />
              <text
                x={x}
                y={y + 36}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {node.name}
              </text>
              <text
                x={x}
                y={y + 50}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                opacity={0.6}
              >
                {node.location}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default ClusterMap;
