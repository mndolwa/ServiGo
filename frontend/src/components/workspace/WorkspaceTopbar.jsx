export default function WorkspaceTopbar({
  setMobileNavOpen,
  setSection,
  headerMessage,
  user,
  unreadCount,
  notificationsOpen,
  setNotificationsOpen,
  userMenuOpen,
  setUserMenuOpen,
  clearNotifications,
  fetchCore,
  openSupport,
  openHelp,
  openSettings,
  logout,
  api,
  t,
  wallet,
}) {
  return (
    <header className="workspace-topbar">
      <button className="menu-icon" onClick={() => setMobileNavOpen((v) => !v)} aria-label="Open navigation">
        <span className="material-symbols-outlined">menu</span>
      </button>
      <button className="brand-link" onClick={() => setSection("Dashboard")}>
        <img src="/badge.PNG" alt="ServiGo badge" className="brand-badge" />
        ServiGo
      </button>
      <div className="topbar-center-copy">
        <span>{headerMessage}</span>
        <small>{user.first_name ? `Welcome back, ${user.first_name}` : `Signed in as ${user.role}`}</small>
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" title="Notifications" onClick={() => { setNotificationsOpen((v) => !v); setUserMenuOpen(false); }}>
          <span className="material-symbols-outlined">notifications</span>
          {unreadCount > 0 && <span className="icon-badge">{Math.min(unreadCount, 9)}+</span>}
        </button>
        <button className="icon-btn" title="Account" onClick={() => { setUserMenuOpen((v) => !v); setNotificationsOpen(false); }}>
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
      {notificationsOpen && (
        <div className="floating-menu floating-right">
          <button onClick={() => { setSection("Notifications"); setNotificationsOpen(false); }}>{t("Open notifications")}</button>
          <button onClick={() => { api.markAllNotificationsRead().then(fetchCore); setNotificationsOpen(false); }}>{t("Mark all as read")}</button>
          <button onClick={() => { clearNotifications(); setNotificationsOpen(false); }}>{t("Clear notifications")}</button>
        </div>
      )}
      {userMenuOpen && (
        <div className="floating-menu floating-right floating-user">
          {wallet && (
            <div className="wallet-menu-block">
              {wallet.type === 'admin' ? (
                <div>
                  <div className="wallet-label">{t('Admin Wallet')}</div>
                  <div className="wallet-value">{Number(wallet.balance || 0).toLocaleString()}</div>
                  <div className="wallet-sublabel">{t('Balance')}</div>
                </div>
              ) : (
                <div>
                  <div className="wallet-label">{t('Your Wallet')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                    <div>
                      <div className="wallet-value">{Number(wallet.balance || 0).toLocaleString()}</div>
                      <div className="wallet-sublabel">{t('Available')}</div>
                    </div>
                    <div>
                      <div className="wallet-value">{Number(wallet.pending_balance || 0).toLocaleString()}</div>
                      <div className="wallet-sublabel">{t('Pending')}</div>
                    </div>
                  </div>
                </div>
              )}
              <button onClick={() => { setSection('Wallet'); setUserMenuOpen(false); }} className="wallet-open-btn">{t('View Details')}</button>
            </div>
          )}
          <button onClick={() => { setSection(user.role === "provider" ? "ProviderProfile" : "ProfileSettings"); setUserMenuOpen(false); }}>{t("Profile")}</button>
          <button onClick={openSettings}>{t("Settings")}</button>
          <button onClick={() => { logout(); setUserMenuOpen(false); }}>{t("Logout")}</button>
        </div>
      )}
    </header>
  );
}
