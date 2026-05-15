import SystemAnalytics from "./SystemAnalytics";

function DashboardCard({ title, description, onClick, accent = "primary", count }) {
  return (
    <button className={`dashboard-card dashboard-card--${accent}`} onClick={onClick} type="button">
      <span className="dashboard-card__eyebrow">Open section</span>
      <strong>{title}</strong>
      <p>{description}</p>
      {typeof count === "number" && <small className="dashboard-card__meta">{count} items</small>}
    </button>
  );
}

export default function DashboardHub({ user, t, onNavigate, counts = {}, payments = [], bookings = [], users = [] }) {
  const seekerCards = [
    { title: t("Discover Services"), description: "Browse highlighted service categories and recent matches.", section: "ServicesList", accent: "teal" },
    { title: t("Service Marketplace"), description: "Open the full marketplace when you want to browse all visible services.", section: "ServicesList", accent: "slate" },
    { title: t("Bookings"), description: "Manage bookings, cancellations, redirects, and status updates.", section: "BookingsList", accent: "gold" },
    { title: t("Payments"), description: "Initiate payments, verify releases, and manage payment flow.", section: "PaymentsList", accent: "primary" },
    { title: t("Receipts"), description: "View generated receipts without scrolling through payments.", section: "Receipts", accent: "amber" },
    { title: t("Reviews"), description: "Submit completed-booking reviews and see your feedback history.", section: "ReviewsList", accent: "rose" },
    { title: t("Notifications"), description: "Read updates without scrolling through the full feed.", section: "Notifications", accent: "slate" },
    { title: t("Live Chat"), description: "Open the booking chat room and exchange contacts when allowed.", section: "ChatSupport", accent: "amber" },
  ];

  const providerCards = [
    { title: t("My Services"), description: "Open your own listings, then jump straight to the add form.", section: "MyServices", accent: "teal" },
    { title: t("Add Service"), description: "Create a new listing and submit it for review.", section: "AddService", accent: "rose" },
    { title: t("Service Marketplace"), description: "View the wider marketplace when needed.", section: "ServicesList", accent: "slate" },
    { title: t("Bookings"), description: "Handle incoming requests, accepted jobs, and completed work.", section: "BookingsList", accent: "gold" },
    { title: t("Reviews"), description: "Rate completed jobs and monitor feedback quality.", section: "ReviewsList", accent: "rose" },
    { title: t("Payments"), description: "Review payments and payout totals.", section: "PaymentsList", accent: "primary" },
    { title: t("Receipts"), description: "Open generated receipts for paid bookings.", section: "Receipts", accent: "amber" },
    { title: t("Notifications"), description: "Scan unread alerts and important workflow changes.", section: "Notifications", accent: "slate" },
    { title: t("Live Chat"), description: "Continue provider-side conversations without extra scrolling.", section: "ChatSupport", accent: "amber" },
  ];

  const adminCards = [
    { title: t("Users"), description: "Open the user directory and provider approvals.", section: "UsersList", accent: "teal" },
    { title: t("Services"), description: "Manage the marketplace and publication workflow.", section: "ServicesList", accent: "gold" },
    { title: t("Bookings"), description: "Track booking status across the platform.", section: "BookingsList", accent: "primary" },
    { title: t("Payments"), description: "Review payments, receipts, commissions, and payouts.", section: "PaymentsList", accent: "rose" },
    { title: t("Receipts"), description: "Open all generated receipts in one place.", section: "Receipts", accent: "amber" },
    { title: t("Support"), description: "Jump into tickets and live chat from one card.", section: "SupportTickets", accent: "slate" },
    { title: t("System Settings"), description: "Change theme and language from a single entry point.", section: "SystemSettings", accent: "amber" },
  ];

  const supportCards = [
    { title: t("Tickets"), description: "Open support tickets and follow active cases.", section: "SupportTickets", accent: "gold" },
    { title: t("Live Chat"), description: "Respond to chat requests without leaving the hub.", section: "ChatSupport", accent: "amber" },
    { title: t("Receipts"), description: "Review payment receipts when a case needs proof.", section: "Receipts", accent: "primary" },
    { title: t("Notifications"), description: "Review recent alerts and platform events.", section: "Notifications", accent: "primary" },
    { title: t("System Settings"), description: "Adjust workspace preferences if needed.", section: "SystemSettings", accent: "slate" },
  ];

  const cardsByRole = {
    seeker: seekerCards,
    provider: providerCards,
    admin: adminCards,
    it_support: supportCards,
  };

  const cards = cardsByRole[user.role] || seekerCards;

  return (
    <>
      <article className="panel full dashboard-hub">
        <div className="dashboard-hub__header">
          <div>
            <h3>Dashboard</h3>
            <p>Use the cards below to open the workspace sections you need. Detailed content stays hidden until you choose it.</p>
          </div>
        </div>
        <div className="dashboard-card-grid">
          {cards.map((card) => (
            <DashboardCard
              key={card.section}
              title={card.title}
              description={card.description}
              accent={card.accent}
              count={counts[card.section]}
              onClick={() => onNavigate(card.section)}
            />
          ))}
        </div>
      </article>

      {user.role === "admin" && (
        <SystemAnalytics
          payments={payments}
          bookings={bookings}
          users={users}
          t={t}
        />
      )}
    </>
  );
}
