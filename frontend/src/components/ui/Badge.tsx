interface BadgeProps {
  label: string;
  color?: string;
  emoji?: string;
}

export function Badge({ label, color = '#1D9E75', emoji }: BadgeProps) {
  return (
    <span
      style={{ backgroundColor: color + '22', color, borderColor: color + '44' }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </span>
  );
}
