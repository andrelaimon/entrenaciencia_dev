'use client';

const R = 28;
const W = R * Math.sqrt(3);

const TW = 1440; // tile width  — matches viewBox
const TH = 800;  // tile height — matches viewBox

function hexPts(cx: number, cy: number): string {
  const hw = W / 2;
  return [
    [cx,      cy - R    ],
    [cx + hw, cy - R / 2],
    [cx + hw, cy + R / 2],
    [cx,      cy + R    ],
    [cx - hw, cy + R / 2],
    [cx - hw, cy - R / 2],
  ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

const UP   = [[0, 0], [W, 0], [W / 2, -R * 1.5]];
const DOWN = [[0, 0], [W, 0], [W / 2,  R * 1.5]];
const LEFT = [[0, 0], [-W, 0], [-W / 2, -R * 1.5]];
const BENT = [[0, 0], [W, 0], [-W / 2, R * 1.5]];

const CLUSTERS: { ax: number; ay: number; shape: number[][]; ops: [number, number, number] }[] = [
  { ax: 55,   ay: 110, shape: UP,   ops: [0.10, 0.07, 0.04] },
  { ax: 140,  ay: 370, shape: DOWN, ops: [0.08, 0.05, 0.03] },
  { ax: 70,   ay: 680, shape: UP,   ops: [0.09, 0.06, 0.04] },
  { ax: 220,  ay: 700, shape: LEFT, ops: [0.06, 0.04, 0.02] },
  { ax: 30,   ay: 500, shape: BENT, ops: [0.07, 0.05, 0.03] },
  { ax: 160,  ay: 220, shape: UP,   ops: [0.06, 0.04, 0.02] },
  { ax: 1390, ay: 80,  shape: LEFT, ops: [0.09, 0.06, 0.04] },
  { ax: 1275, ay: 380, shape: DOWN, ops: [0.07, 0.05, 0.03] },
  { ax: 1385, ay: 640, shape: BENT, ops: [0.08, 0.05, 0.03] },
  { ax: 1200, ay: 130, shape: DOWN, ops: [0.05, 0.03, 0.02] },
  { ax: 1310, ay: 520, shape: UP,   ops: [0.06, 0.04, 0.02] },
  { ax: 1420, ay: 340, shape: LEFT, ops: [0.07, 0.05, 0.03] },
  { ax: 390,  ay: 30,  shape: DOWN, ops: [0.06, 0.04, 0.02] },
  { ax: 620,  ay: 20,  shape: UP,   ops: [0.05, 0.03, 0.02] },
  { ax: 850,  ay: 35,  shape: DOWN, ops: [0.06, 0.04, 0.02] },
  { ax: 1080, ay: 25,  shape: BENT, ops: [0.05, 0.03, 0.02] },
  { ax: 240,  ay: 50,  shape: UP,   ops: [0.07, 0.05, 0.03] },
  { ax: 1170, ay: 60,  shape: DOWN, ops: [0.06, 0.04, 0.02] },
  { ax: 1060, ay: 760, shape: UP,   ops: [0.07, 0.05, 0.03] },
  { ax: 300,  ay: 750, shape: DOWN, ops: [0.06, 0.04, 0.02] },
  { ax: 560,  ay: 770, shape: BENT, ops: [0.05, 0.03, 0.02] },
  { ax: 820,  ay: 755, shape: UP,   ops: [0.06, 0.04, 0.02] },
  { ax: 1250, ay: 730, shape: DOWN, ops: [0.07, 0.05, 0.03] },
  { ax: 140,  ay: 780, shape: LEFT, ops: [0.06, 0.04, 0.02] },
  { ax: 280,  ay: 300, shape: DOWN, ops: [0.05, 0.03, 0.02] },
  { ax: 1150, ay: 450, shape: UP,   ops: [0.05, 0.03, 0.02] },
  { ax: 480,  ay: 650, shape: LEFT, ops: [0.04, 0.03, 0.02] },
  { ax: 990,  ay: 580, shape: BENT, ops: [0.04, 0.03, 0.02] },
  { ax: 370,  ay: 520, shape: UP,   ops: [0.04, 0.03, 0.02] },
  { ax: 1080, ay: 200, shape: DOWN, ops: [0.04, 0.03, 0.02] },
];

// Tile offsets: render clusters 4× to cover the full scroll cycle seamlessly
const TILE_OFFSETS = [
  [0, 0],
  [-TW, -TH],
  [-TW, 0],
  [0, -TH],
];

function ClusterGroup({ ox, oy }: { ox: number; oy: number }) {
  return (
    <>
      {CLUSTERS.map((c, ci) =>
        c.shape.map(([dx, dy], hi) => (
          <polygon
            key={`${ci}-${hi}`}
            points={hexPts(c.ax + dx + ox, c.ay + dy + oy)}
            fill={`rgba(35,211,255,${(c.ops[hi] * 0.3).toFixed(3)})`}
            stroke="#23D3FF"
            strokeWidth="1"
            opacity={c.ops[hi]}
          />
        ))
      )}
    </>
  );
}

export default function HexClusters() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
        overflow: 'hidden',
      }}
      viewBox="0 0 1440 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <g className="hex-drift-group">
        {TILE_OFFSETS.map(([ox, oy]) => (
          <ClusterGroup key={`${ox}-${oy}`} ox={ox} oy={oy} />
        ))}
      </g>
    </svg>
  );
}
