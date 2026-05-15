import React from "react";

export default function StateActionButton({
  variant = "primary",
  done = false,
  loading = false,
  disabled = false,
  onClick,
  label,
  doneLabel,
  loadingLabel,
  t,
}) {
  const className = ["action-btn", `action-btn--${variant}`, done ? "is-done" : "", loading ? "is-loading" : ""]
    .filter(Boolean)
    .join(" ");

  const text = done ? doneLabel : loading ? loadingLabel : label;

  return (
    <button className={className} disabled={disabled || loading} onClick={onClick}>
      {t ? t(text) : text}
    </button>
  );
}
