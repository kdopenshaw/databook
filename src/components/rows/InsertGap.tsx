type Props = {
  onInsert: () => void;
  label?: string;
};

/** Quiet Jupyter-style (+) between rows — hover reveals the control. */
export function InsertGap({ onInsert, label = 'Insert markdown' }: Props) {
  return (
    <div className="cb-insert-gap">
      <button type="button" className="cb-insert-gap-btn" onClick={onInsert} aria-label={label} title={label}>
        <span className="cb-insert-gap-line" aria-hidden="true" />
        <span className="cb-insert-gap-plus" aria-hidden="true">
          +
        </span>
        <span className="cb-insert-gap-line" aria-hidden="true" />
      </button>
    </div>
  );
}
