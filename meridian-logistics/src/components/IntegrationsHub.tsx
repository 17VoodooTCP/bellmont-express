"use client";

/* Integrations hub — partner cards in two columns, joined to the Bellmont mark
   by curved connectors with a dot travelling along each one toward the centre.

   Geometry lives in one SVG viewBox so the cards, the paths and the moving
   dots all share a coordinate system and scale together; nothing is positioned
   with separate HTML overlays that would drift apart at other widths.

   The dots ride CSS `offset-path`, not SMIL, so a single reduced-motion media
   query parks them. */

import { INTEGRATION_LOGOS } from "./integrationLogos";

const VB_W = 1000;
const VB_H = 560;
const HUB = { x: 500, y: 280, r: 54 };
const CARD = 92;
const COL_LEFT = 120;
const COL_RIGHT = VB_W - COL_LEFT;

/* Official brand marks and colours, generated from simple-icons. */
const LEFT = ["shopify", "woocommerce", "wix", "bigcommerce"].map(
  (slug) => INTEGRATION_LOGOS[slug]
);
const RIGHT = ["ups", "fedex", "dhl", "usps"].map(
  (slug) => INTEGRATION_LOGOS[slug]
);

/* simple-icons paths are authored in a 24x24 box. */
const ICON_BOX = 24;
const ICON_SIZE = 50;

/* Four cards stacked and centred vertically in the viewBox. */
const GAP = 28;
const STACK = LEFT.length * CARD + (LEFT.length - 1) * GAP;
const TOP = (VB_H - STACK) / 2;
const centreY = (i: number) => TOP + i * (CARD + GAP) + CARD / 2;

/* A flat-ended S-curve from the inner edge of a card to the hub. The control
   points stay level with each end so the curve leaves and arrives horizontally,
   which is what keeps the bundle tidy where the lines converge. */
function connector(fromX: number, fromY: number, toX: number) {
  const midX = (fromX + toX) / 2;
  return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${HUB.y}, ${toX} ${HUB.y}`;
}

export default function IntegrationsHub() {
  const rows = [
    ...LEFT.map((p, i) => ({
      partner: p,
      x: COL_LEFT,
      y: centreY(i),
      path: connector(COL_LEFT + CARD / 2, centreY(i), HUB.x - HUB.r),
      delay: i * 0.9,
    })),
    ...RIGHT.map((p, i) => ({
      partner: p,
      x: COL_RIGHT,
      y: centreY(i),
      path: connector(COL_RIGHT - CARD / 2, centreY(i), HUB.x + HUB.r),
      delay: 0.45 + i * 0.9,
    })),
  ];

  return (
    <section className="integrations" aria-labelledby="integrations-title">
      <div className="hv2-container">
        <div className="hv2-sec-head">
          <span className="hv2-eyebrow">
            <span className="hv2-eyebrow-dot" />
            Integrations
          </span>
          <h2 id="integrations-title" className="hv2-h2">
            Connect the systems
            <span> you already run on.</span>
          </h2>
          <p className="hv2-sec-sub">
            Bellmont sits between your storefront and your carriers, so orders,
            rates and tracking move without anyone re-keying them.
          </p>
        </div>

        <div className="integrations-board">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="integrations-svg"
            role="img"
            aria-label="Bellmont connects commerce platforms on the left to carriers on the right"
          >
            <defs>
              <radialGradient id="hubGlow">
                <stop offset="0%" stopColor="#fca837" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#fca837" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* connectors first, so the cards and hub sit above them */}
            {rows.map(({ partner, path }) => (
              <path
                key={`line-${partner.slug}`}
                d={path}
                fill="none"
                stroke={partner.hex}
                strokeOpacity="0.42"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ))}

            {/* a dot per connector, riding the same path */}
            {rows.map(({ partner, path, delay }) => (
              <circle
                key={`dot-${partner.slug}`}
                r="4.5"
                fill={partner.hex}
                className="integrations-dot"
                style={{
                  offsetPath: `path("${path}")`,
                  animationDelay: `${delay}s`,
                } as React.CSSProperties}
              />
            ))}

            <circle cx={HUB.x} cy={HUB.y} r={HUB.r * 1.9} fill="url(#hubGlow)" />

            {rows.map(({ partner, x, y }) => (
              <g key={`card-${partner.slug}`} className="integrations-card">
                <title>{partner.title}</title>
                <rect
                  x={x - CARD / 2}
                  y={y - CARD / 2}
                  width={CARD}
                  height={CARD}
                  rx="22"
                  fill="#ffffff"
                />
                <g
                  transform={`translate(${x - ICON_SIZE / 2} ${y - ICON_SIZE / 2}) scale(${ICON_SIZE / ICON_BOX})`}
                >
                  <path d={partner.path} fill={partner.hex} />
                </g>
              </g>
            ))}

            {/* the Bellmont mark at the centre */}
            <g className="integrations-hub">
              <rect
                x={HUB.x - HUB.r}
                y={HUB.y - HUB.r}
                width={HUB.r * 2}
                height={HUB.r * 2}
                rx="28"
                fill="#fca837"
              />
              <text
                x={HUB.x}
                y={HUB.y + 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="integrations-hub-mark"
                fill="#ffffff"
              >
                B
              </text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
