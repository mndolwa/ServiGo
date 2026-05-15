export default function IconActionButton({
  icon,
  label,
  onClick,
  variant = "neutral",
  disabled = false,
  revealOnRowHover = false,
  className = "",
}) {
  const classes = [
    "icon-action-btn",
    `icon-action-btn--${variant}`,
    revealOnRowHover ? "icon-action-btn--reveal" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      data-tooltip={label}
    >
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
    </button>
  );
}
