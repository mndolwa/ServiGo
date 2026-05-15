export default function WorkspaceModals({
  supportOpen,
  setSupportOpen,
  helpOpen,
  setHelpOpen,
  settingsOpen,
  setSettingsOpen,
  theme,
  setTheme,
  language,
  setLanguage,
  t,
}) {
  return (
    <>
      {supportOpen && (
        <div className="modal-backdrop" onClick={() => setSupportOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{t("Support")}</h3>
            <p>Email: mndolwa26@gmail.com</p>
            <p>Phone: +255 786 225 687</p>
            <p>{t("Use this channel for account help, payment issues, and provider approval follow-up.")}</p>
            <button className="btn btn-primary" onClick={() => setSupportOpen(false)}>{t("Close")}</button>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{t("Help")}</h3>
            <p>{t("ServiGo keeps service seekers, providers, and admins in one secure workspace.")}</p>
            <p>Email: mndolwa26@gmail.com</p>
            <p>Phone: +255 786 225 687</p>
            <ul>
              <li>{t("Register and login with your email.")}</li>
              <li>{t("Providers wait for admin approval before publishing services.")}</li>
              <li>{t("Pending bookings can be cancelled immediately.")}</li>
              <li>{t("Approved/in-progress cancellations are reviewed by admin and may carry penalties.")}</li>
              <li>{t("Payments are released only after verification and approval flow.")}</li>
            </ul>
            <button className="btn btn-primary" onClick={() => setHelpOpen(false)}>{t("Close")}</button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{t("Settings")}</h3>
            <label className="setting-row">
              <span>{t("Theme")}</span>
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="light">{t("Light")}</option>
                <option value="dark">{t("Dark")}</option>
                <option value="system">{t("System")}</option>
              </select>
            </label>
            <label className="setting-row">
              <span>{t("Language")}</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="sw">Kiswahili</option>
              </select>
            </label>
            <button className="btn btn-primary" onClick={() => setSettingsOpen(false)}>{t("Save")}</button>
          </div>
        </div>
      )}
    </>
  );
}
