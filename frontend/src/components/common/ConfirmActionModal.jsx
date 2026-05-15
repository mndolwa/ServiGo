export default function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  confirmClassName = "action-btn action-btn--danger",
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title || "Confirm action"}>
      <div className="modal-card">
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="inline-actions">
          <button type="button" onClick={onCancel}>{cancelLabel || "Cancel"}</button>
          <button
            type="button"
            className={confirmClassName}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : (confirmLabel || "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
