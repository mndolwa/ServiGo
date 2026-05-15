export const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 30, "all"];

export const roles = [
  { value: "seeker", label: "Service Seeker" },
  { value: "provider", label: "Service Provider" },
];

export const navByRole = {
  seeker: [
    {
      title: "Workspace",
      items: [
        { key: "Dashboard", label: "Overview" },
        { key: "ServicesList", label: "Services" },
        { key: "BookingsList", label: "My Bookings" },
        { key: "PaymentsList", label: "Payments" },
      ],
    },
    {
      title: "Engagement",
      items: [
        { key: "ReviewsList", label: "Reviews" },
        { key: "ChatSupport", label: "Live Chat" },
      ],
    },
  ],
  provider: [
    {
      title: "Operations",
      items: [
        { key: "ProviderDashboard", label: "Dashboard" },
        { key: "IncomingRequests", label: "Incoming Requests" },
        { key: "AcceptedJobs", label: "Accepted Jobs" },
        { key: "CompletedJobs", label: "Completed Jobs" },
      ],
    },
    {
      title: "Business",
      items: [
        { key: "MyServices", label: "My Services" },
        { key: "AddService", label: "Add Service" },
        { key: "ReviewsList", label: "Reviews" },
        { key: "PaymentsList", label: "Earnings" },
        { key: "ChatSupport", label: "Live Chat" },
      ],
    },
  ],
  admin: [
    {
      title: "Management",
      items: [
        { key: "Dashboard", label: "Overview" },
        { key: "UsersList", label: "Users" },
        { key: "ProvidersList", label: "Providers" },
        { key: "ServicesList", label: "Services" },
        { key: "BookingsList", label: "Bookings" },
      ],
    },
    {
      title: "Finance",
      items: [
        { key: "PaymentsList", label: "Payments" },
        { key: "Transactions", label: "Transactions" },
        { key: "RevenueReports", label: "Revenue Reports" },
      ],
    },
    {
      title: "System",
      items: [
        { key: "ReviewsList", label: "Reviews" },
        { key: "SupportTickets", label: "Support" },
        { key: "SystemSettings", label: "Settings" },
        { key: "ChatSupport", label: "Live Chat" },
      ],
    },
  ],
  it_support: [
    {
      title: "Support",
      items: [
        { key: "Dashboard", label: "Overview" },
        { key: "SupportTickets", label: "Tickets" },
        { key: "ChatSupport", label: "Live Chat" },
      ],
    },
  ],
};
