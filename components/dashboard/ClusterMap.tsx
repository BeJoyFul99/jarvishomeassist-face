import { useFleet } from "@/hooks/useFleet";

const ClusterMap = () => {
  const { nodes, activeNodeId, setActiveNodeId } = useFleet();

  const positions: Record<string, { x: number; y: number }> = {
    "node-01": { x: 120, y: 80 },
    "node-02": { x: 300, y: 60 },
    "node-03": { x: 420, y: 140 },
  };

  const statusColors: Record<string, string> = {
    online: "hsl(var(--cyan))",
    degraded: "hsl(var(--volcano))",
    offline: "hsl(var(--crimson))",
  };

  return (
    <div className="glass-card-hover p-5">
      <h3 className="text-sm font-medium text-foreground mb-3">Cluster Map</h3>
      <svg viewBox="0 0 540 200" className="w-full h-auto">
        {/* Connection lines */}
        {nodes.map((node, i) => {
          const pos = positions[node.id];
          return nodes.slice(i + 1).map(other => {
            const opos = positions[other.id];
            return (
              <line
                key={`${node.id}-${other.id}`}
                x1={pos.x} y1={pos.y} x2={opos.x} y2={opos.y}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray={node.status === "offline" || other.status === "offline" ? "4,4" : "none"}
                opacity={0.5}
              />
            );
          });
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const pos = positions[node.id];
          const isActive = node.id === activeNodeId;
          return (
            <g key={node.id} onClick={() => setActiveNodeId(node.id)} className="cursor-pointer">
              {/* Glow */}
              {isActive && (
                <circle
                  cx={pos.x} cy={pos.y} r="24"
                  fill="none"
                  stroke={statusColors[node.status]}
                  strokeWidth="1"
                  opacity={0.3}
                />
              )}
              <circle
                cx={pos.x} cy={pos.y} r="16"
                fill={isActive ? statusColors[node.status] : "hsl(var(--secondary))"}
                stroke={statusColors[node.status]}
                strokeWidth={isActive ? 2 : 1}
                opacity={node.status === "offline" ? 0.3 : 1}
              />
              <text
                x={pos.x} y={pos.y + 32}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {node.name}
              </text>
              <text
                x={pos.x} y={pos.y + 44}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize="8"
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
