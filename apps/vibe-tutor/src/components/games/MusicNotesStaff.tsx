/* ---------- Music Notes Game — SVG Staff Renderer ---------- */

import type { NoteData } from './musicNotesData';

const STAFF_W = 280;
const STAFF_H = 160;
const LINE_GAP = 14;
const TOP_LINE_Y = 44;
const NOTE_X = 160;
const NOTE_R = 8;

/** Convert staffPos (0=C4) to Y coordinate on SVG. Bottom staff line = E4 (pos 2). */
function posToY(staffPos: number): number {
  const bottomLineY = TOP_LINE_Y + 4 * LINE_GAP;
  return bottomLineY - (staffPos - 2) * (LINE_GAP / 2);
}

interface StaffSVGProps {
  note: NoteData;
  feedback: 'correct' | 'wrong' | null;
}

export default function StaffSVG({ note, feedback: fb }: StaffSVGProps) {
  const y = posToY(note.staffPos);
  const needsLedger = note.staffPos <= 0;
  const noteColor = fb === 'correct' ? '#c084fc' : fb === 'wrong' ? '#ef4444' : '#e2e8f0';
  const noteGlow =
    fb === 'correct' ? '#c084fc44' : fb === 'wrong' ? '#ef444444' : 'transparent';

  return (
    <svg width={STAFF_W} height={STAFF_H} viewBox={`0 0 ${STAFF_W} ${STAFF_H}`}>
      {/* Staff lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={30}
          y1={TOP_LINE_Y + i * LINE_GAP}
          x2={STAFF_W - 20}
          y2={TOP_LINE_Y + i * LINE_GAP}
          stroke="#475569"
          strokeWidth={1.5}
        />
      ))}

      {/* Treble clef glyph */}
      <text
        x={38}
        y={TOP_LINE_Y + 3.2 * LINE_GAP}
        fontSize={52}
        fill="#94a3b8"
        fontFamily="serif"
        style={{ userSelect: 'none' }}
      >
        𝄞
      </text>

      {/* Ledger line for middle C */}
      {needsLedger && (
        <line
          x1={NOTE_X - 16}
          y1={y}
          x2={NOTE_X + 16}
          y2={y}
          stroke="#475569"
          strokeWidth={1.5}
        />
      )}

      {/* Note glow */}
      <circle cx={NOTE_X} cy={y} r={NOTE_R + 6} fill={noteGlow} />

      {/* Note head */}
      <ellipse
        cx={NOTE_X}
        cy={y}
        rx={NOTE_R}
        ry={NOTE_R - 2}
        fill={noteColor}
        stroke={noteColor}
        strokeWidth={1}
        style={{ transition: 'fill 0.15s ease' }}
      />

      {/* Stem */}
      <line
        x1={NOTE_X + NOTE_R - 1}
        y1={y}
        x2={NOTE_X + NOTE_R - 1}
        y2={y - 36}
        stroke={noteColor}
        strokeWidth={2}
      />

      {/* Accidental symbol */}
      {note.accidental === '#' && (
        <text
          x={NOTE_X - 22}
          y={y + 5}
          fontSize={16}
          fill="#f59e0b"
          fontWeight="bold"
          fontFamily="serif"
        >
          ♯
        </text>
      )}
      {note.accidental === 'b' && (
        <text
          x={NOTE_X - 20}
          y={y + 5}
          fontSize={16}
          fill="#a78bfa"
          fontWeight="bold"
          fontFamily="serif"
        >
          ♭
        </text>
      )}
    </svg>
  );
}
