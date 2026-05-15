export default function WorkspaceFooter({
  openSupport,
  openHelp,
  openSettings,
  t,
}) {
  return (
    <div className="workspace-footer-bar">
      <div className="footer-links">
        <button className="footer-link-btn" onClick={openSupport} title="Get support">
          <span className="material-symbols-outlined">support_agent</span>
          <span>{t("Support")}</span>
        </button>
        <button className="footer-link-btn" onClick={openHelp} title="Get help">
          <span className="material-symbols-outlined">help</span>
          <span>{t("Help")}</span>
        </button>
        <button className="footer-link-btn" onClick={() => window.open("#", "_blank")} title="About ServiGo">
          <span className="material-symbols-outlined">info</span>
          <span>{t("About")}</span>
        </button>
      </div>
    </div>
  );
}
