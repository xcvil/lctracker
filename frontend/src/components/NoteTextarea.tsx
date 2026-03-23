import { useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export default function NoteTextarea({ value, onChange, rows = 6, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = ref.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const spaces = "    ";
      const newValue = value.substring(0, start) + spaces + value.substring(end);
      onChange(newValue);
      // Restore cursor position after React re-renders
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + spaces.length;
      });
    }
  };

  return (
    <textarea
      ref={ref}
      className="note-textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      rows={rows}
      placeholder={placeholder || "Write your notes in Markdown..."}
    />
  );
}
