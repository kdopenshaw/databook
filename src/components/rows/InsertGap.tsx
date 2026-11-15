type Props = {
  onInsert: () => void;
  label?: string;
};

/** Quiet Jupyter-style (+) between rows — hover reveals the control. */
export function InsertGap({ onInsert, label = 'Insert markdown' }: Props) {
  return (
    <div className="dbk-insert-gap">
      <button type="button" className="dbk-insert-gap-btn" onClick={onInsert} aria-label={label} title={label}>
        <span className="dbk-insert-gap-line" aria-hidden="true" />
        <span className="dbk-insert-gap-plus" aria-hidden="true">
          +
        </span>
        <span className="dbk-insert-gap-line" aria-hidden="true" />
      </button>
    </div>
  );
}
