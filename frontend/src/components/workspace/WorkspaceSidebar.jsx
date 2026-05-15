export default function WorkspaceSidebar({
  sidebarVisible,
  isCollapsed,
  toggleCollapsed,
  user,
  navGroups,
  openGroups,
  setOpenGroups,
  section,
  setSection,
  setMobileNavOpen,
  t,
}) {
  const iconBySection = {
    Dashboard: "dashboard",
    ProviderDashboard: "dashboard",
    ServicesList: "storefront",
    BookingsList: "calendar_month",
    BookingDetails: "description",
    UpdateBookingStatus: "sync_alt",
    IncomingRequests: "inbox",
    AcceptedJobs: "task_alt",
    CompletedJobs: "done_all",
    PaymentsList: "payments",
    Transactions: "receipt_long",
    RevenueReports: "monitoring",
    MyServices: "inventory_2",
    AddService: "add_circle",
    EditService: "edit",
    Receipts: "receipt",
    ReviewsList: "reviews",
    Notifications: "notifications",
    ChatSupport: "chat",
    UsersList: "group",
    ProvidersList: "engineering",
    SupportTickets: "support_agent",
    SystemSettings: "settings",
  };

  return (
    <aside className={`sidebar ${sidebarVisible ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top-row">
        <h2>{isCollapsed ? "SG" : "ServiGo"}</h2>
        <button className="sidebar-collapse-btn" type="button" onClick={toggleCollapsed} title={isCollapsed ? t("Expand sidebar") : t("Collapse sidebar") }>
          <span className="material-symbols-outlined">{isCollapsed ? "right_panel_open" : "left_panel_close"}</span>
        </button>
      </div>
      {!isCollapsed && (
        <>
          <p>{user.first_name} {user.last_name}</p>
          <small>{user.role}</small>
        </>
      )}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <section className="sidebar-group" key={group.title}>
            {!isCollapsed && (
              <button
                className="group-toggle"
                onClick={() => setOpenGroups((prev) => ({ ...prev, [group.title]: !prev[group.title] }))}
              >
                <span>{t(group.title)}</span>
                <span>{openGroups[group.title] ? "-" : "+"}</span>
              </button>
            )}
            {(openGroups[group.title] || isCollapsed) && (
              <div className="subnav-container">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    className={section === item.key ? "active" : ""}
                    title={t(item.label)}
                    onClick={() => { setSection(item.key); setMobileNavOpen(false); }}
                  >
                    <span className="material-symbols-outlined nav-item-icon">{iconBySection[item.key] || "apps"}</span>
                    {!isCollapsed && <span>{t(item.label)}</span>}
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </nav>
    </aside>
  );
}
