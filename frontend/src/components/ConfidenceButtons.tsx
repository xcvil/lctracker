interface Props {
  onSelect: (confidence: number) => void;
}

const levels = [
  { value: 1, label: "完全忘了", className: "conf-1" },
  { value: 2, label: "很模糊", className: "conf-2" },
  { value: 3, label: "勉强记得", className: "conf-3" },
  { value: 4, label: "比较清晰", className: "conf-4" },
  { value: 5, label: "非常熟练", className: "conf-5" },
];

export default function ConfidenceButtons({ onSelect }: Props) {
  return (
    <div className="confidence-buttons">
      {levels.map((l) => (
        <button
          key={l.value}
          className={`conf-btn ${l.className}`}
          onClick={() => onSelect(l.value)}
        >
          <span className="conf-num">{l.value}</span>
          <span className="conf-label">{l.label}</span>
        </button>
      ))}
    </div>
  );
}
