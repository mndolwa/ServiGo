import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api } from "./api";
import { translate } from "./i18n/translations";
import ListPagination from "./components/common/ListPagination";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import { ITEMS_PER_PAGE_OPTIONS, navByRole } from "./constants/navigation";
import { money } from "./utils/formatters";
import WorkspaceTopbar from "./components/workspace/WorkspaceTopbar";
import WorkspaceSidebar from "./components/workspace/WorkspaceSidebar";
import WorkspaceModals from "./components/workspace/WorkspaceModals";
import BookingsPanel from "./components/workspace/sections/BookingsPanel";
import PaymentsPanel from "./components/workspace/sections/PaymentsPanel";
import UserDirectoryPanel from "./components/workspace/sections/UserDirectoryPanel";
import ChatPanel from "./components/workspace/sections/ChatPanel";
import ApprovalPanel from "./components/workspace/sections/ApprovalPanel";
import BookingDetailsPanel from "./components/workspace/sections/BookingDetailsPanel";
import ServicesPanel from "./components/workspace/sections/ServicesPanel";
import PublishServicePanel from "./components/workspace/sections/PublishServicePanel";
import ReviewsPanel from "./components/workspace/sections/ReviewsPanel";
import NotificationsPanel from "./components/workspace/sections/NotificationsPanel";
import SupportCenterPanel from "./components/workspace/sections/SupportCenterPanel";
import SystemSettingsPanel from "./components/workspace/sections/SystemSettingsPanel";
import ProfileDetailsPanel from "./components/workspace/sections/ProfileDetailsPanel";
import FallbackPanel from "./components/workspace/sections/FallbackPanel";
import DashboardHub from "./components/workspace/DashboardHub";
import MyServicesPanel from "./components/workspace/sections/MyServicesPanel";
import ReceiptsPanel from "./components/workspace/sections/ReceiptsPanel";

function AppShell({ user, logout, initialSection }) {
  const [section, setSection] = useState(initialSection || "Dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("servigo_sidebar_collapsed") === "true");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [commissionConfig, setCommissionConfig] = useState(null);
  const [smsGateway, setSmsGateway] = useState(null);
  const [nearbyProviderIds, setNearbyProviderIds] = useState([]);
  const [nearbySearchMeta, setNearbySearchMeta] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [filters, setFilters] = useState({ q: "", location: "", category: "" });
  const [serviceForm, setServiceForm] = useState({ title: "", category: "", description: "", price: "", duration_minutes: 60 });
  const [bookingForm, setBookingForm] = useState({ service: "", scheduled_at: "", notes: "", response_timeout_seconds: 300 });
  const [paymentForm, setPaymentForm] = useState({ booking_id: "", method: "mpesa", phone: "" });
  const [reviewForm, setReviewForm] = useState({ booking: "", to_user: "", rating: 5, comment: "" });
  const [workspaceError, setWorkspaceError] = useState("");
  const [users, setUsers] = useState([]);
  const [adminRoleFilter, setAdminRoleFilter] = useState("all");
  const [listPageSizes, setListPageSizes] = useState({
    services: 10,
    bookings: 10,
    payments: 10,
    users: 10,
    receipts: 10,
    reviews: 10,
    notifications: 10,
    chatRooms: 10,
    chatMessages: 10,
    topCategories: 10,
    recentServices: 10,
    mostBookedServices: 10,
    interestingServices: 10,
  });
  const [listPages, setListPages] = useState({
    services: 1,
    bookings: 1,
    payments: 1,
    users: 1,
    receipts: 1,
    reviews: 1,
    notifications: 1,
    chatRooms: 1,
    chatMessages: 1,
    topCategories: 1,
    recentServices: 1,
    mostBookedServices: 1,
    interestingServices: 1,
  });
  const [providerOptions, setProviderOptions] = useState([]);
  const [redirectTargets, setRedirectTargets] = useState({});
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("servigo_theme") || "light");
  const [language, setLanguage] = useState(() => localStorage.getItem("servigo_language") || "en");
  const [actionLoading, setActionLoading] = useState({});
  const [actionDone, setActionDone] = useState({});
  const [submittedForms, setSubmittedForms] = useState({
    booking: false,
    payment: false,
    review: false,
    service: false,
  });
  const t = (text) => translate(language, text);

  const navGroups = navByRole[user.role] || navByRole.seeker;
  const navItems = navGroups.flatMap((group) => group.items);
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(navGroups.map((group) => [group.title, true]))
  );
  const currentNavItem = navItems.find((item) => item.key === section);
  const headerMessageByRole = {
    seeker: "Trusted help, secure payments, and real-time support in one place.",
    provider: "Turn great service into loyal customers and reliable growth.",
    admin: "Lead the marketplace with clarity, trust, and control.",
    it_support: "Keep every user moving with fast, calm, dependable support.",
  };
  const headerMessage = t(headerMessageByRole[user.role] || "Move confidently with a workspace built for service and trust.");
  const isDashboardSection = section === "Dashboard" || section === "ProviderDashboard";
  const focusedWorkspace = !isDashboardSection;
  const profileSection = section === "ProfileSettings" || section === "ProviderProfile";
  const providerPending = user.role === "provider" && !user.is_provider_approved;
  const knownSections = new Set([
    "Dashboard",
    "ProviderDashboard",
    "ProfileSettings",
    "ProviderProfile",
    "ServicesList",
    "BookingsList",
    "BookingDetails",
    "UpdateBookingStatus",
    "IncomingRequests",
    "AcceptedJobs",
    "CompletedJobs",
    "PaymentsList",
    "Transactions",
    "RevenueReports",
    "MyServices",
    "AddService",
    "EditService",
    "Receipts",
    "ReviewsList",
    "Notifications",
    "ChatSupport",
    "UsersList",
    "ProvidersList",
    "SupportTickets",
    "SystemSettings",
  ]);

  useEffect(() => {
    const resolved = theme === "system" ? "light" : theme;
    document.documentElement.setAttribute("data-theme", resolved);
    localStorage.setItem("servigo_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("servigo_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("servigo_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (initialSection) {
      setSection(initialSection);
    }
  }, [initialSection]);

  const fetchCore = async () => {
    setWorkspaceError("");
    const bookingsRequest = user.role === "admin" ? api.adminBookings() : api.bookings();
    const requests = [
      api.services(),
      bookingsRequest,
      api.payments(),
      api.notifications(),
      api.reviews(),
      api.ratings(),
      api.categories(),
      api.chats(),
    ];
    if (user.role === "admin") {
      requests.push(api.users());
    }
    const [svc, bkg, pay, ntf, rev, rat, cat, chats, adminUsers] = await Promise.allSettled(requests);

    if (svc.status === "fulfilled") setServices(svc.value.results || svc.value);
    if (bkg.status === "fulfilled") setBookings(bkg.value.results || bkg.value);
    if (pay.status === "fulfilled") setPayments(pay.value.results || pay.value);
    if (ntf.status === "fulfilled") setNotifications(ntf.value.results || ntf.value);
    if (rev.status === "fulfilled") setReviews(rev.value.results || rev.value);
    if (rat.status === "fulfilled") setRatings(rat.value.results || rat.value);
    if (cat.status === "fulfilled") setCategories(cat.value.results || cat.value);
    if (chats.status === "fulfilled") {
      const roomList = chats.value.results || chats.value;
      setChatRooms(roomList);
      if (!activeRoomId && roomList.length) {
        setActiveRoomId(roomList[0].id);
      }
    }
    if (adminUsers?.status === "fulfilled") {
      setUsers(adminUsers.value.results || adminUsers.value);
    }

    if (user.role !== "seeker") {
      try {
        const providersResponse = await api.users({ role: "provider", exclude_self: "true" });
        setProviderOptions((providersResponse.results || providersResponse).filter((entry) => entry.is_provider_approved));
      } catch {
        setProviderOptions([]);
      }
    }

    try {
      const receiptsResponse = await api.receipts();
      setReceipts(receiptsResponse.results || receiptsResponse);
    } catch {
      setReceipts([]);
    }

    if (user.role === "admin") {
      try {
        setWallet(await api.wallet());
      } catch {
        setWallet(null);
      }
      try {
        setCommissionConfig(await api.commissionConfig());
      } catch {
        setCommissionConfig(null);
      }
      try {
        const smsResponse = await api.smsGateway();
        setSmsGateway(smsResponse.config || smsResponse);
      } catch {
        setSmsGateway(null);
      }
    } else if (user.role === "provider") {
      try {
        setWallet(await api.providerWallet());
      } catch {
        setWallet(null);
      }
    }

    const failed = [svc, bkg, pay, ntf, rev, rat, cat, chats, adminUsers].filter((r) => r && r.status === "rejected");
    if (failed.length) {
      setWorkspaceError("Some modules could not load. Check backend connection and migrations.");
    }
  };

  const fetchMessages = async () => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }
    const list = await api.chatMessages(activeRoomId);
    setMessages(list);
  };

  useEffect(() => {
    fetchCore();
  }, []);

  useEffect(() => {
    if (!user) return;

    let stop = false;
    const sendPresence = async (isOnline, coords = null, locationName = "") => {
      if (stop) return;
      try {
        await api.updatePresence({
          is_online: isOnline,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          location: locationName || undefined,
        });
      } catch {
        // Intentionally quiet to avoid noisy UX on intermittent networks.
      }
    };

    const bootstrapPresence = async () => {
      const needsLocation = !user.location || user.latitude == null || user.longitude == null;
      if (!needsLocation || !navigator?.geolocation) {
        await sendPresence(true);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          let locationName = "";
          try {
            const geoResp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
            );
            const geoData = await geoResp.json();
            locationName = geoData?.display_name || "";
          } catch {
            locationName = "";
          }
          await sendPresence(true, coords, locationName);
          await fetchCore();
        },
        async () => {
          await sendPresence(true);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    };

    bootstrapPresence();
    const pingInterval = setInterval(() => sendPresence(true), 45000);
    const markOffline = () => {
      sendPresence(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendPresence(false);
      } else {
        sendPresence(true);
      }
    };

    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop = true;
      clearInterval(pingInterval);
      markOffline();
      window.removeEventListener("beforeunload", markOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    fetchMessages();
  }, [activeRoomId]);

  useEffect(() => {
    if (providerPending) {
      setSection("ProviderDashboard");
    }
  }, [providerPending]);

  const filteredServices = useMemo(() => {
    const query = String(filters.q || "").trim().toLowerCase();
    const location = String(filters.location || "").trim().toLowerCase();
    const category = String(filters.category || "").trim();

    const base = services.filter((service) => {
      const matchesLocation = !location || String(service.provider_location || "").toLowerCase().includes(location);
      const matchesNearby = !nearbyProviderIds.length || nearbyProviderIds.includes(service.provider);
      return matchesLocation && matchesNearby;
    });

    const ranked = base.map((service) => {
      const title = String(service.title || "").toLowerCase();
      const description = String(service.description || "").toLowerCase();
      const providerName = String(service.provider_name || "").toLowerCase();
      const serviceCategory = String(service.category || "");

      let score = 0;
      if (query) {
        if (title.includes(query)) score += 5;
        if (description.includes(query)) score += 3;
        if (providerName.includes(query)) score += 2;
      }
      if (category && serviceCategory === category) {
        score += 6;
      }

      return { service, score };
    });

    return ranked
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        const rightBookings = Number(right.service.booking_count || 0);
        const leftBookings = Number(left.service.booking_count || 0);
        return rightBookings - leftBookings;
      })
      .map((entry) => entry.service);
  }, [services, filters, nearbyProviderIds]);

  useEffect(() => {
    setListPages((prev) => ({ ...prev, services: 1 }));
  }, [filters.q, filters.location, filters.category]);

  const handleItemsPerPageChange = (listKey, rawValue) => {
    const nextValue = rawValue === "all" ? "all" : Number(rawValue);
    setListPageSizes((prev) => ({ ...prev, [listKey]: nextValue }));
    setListPages((prev) => ({ ...prev, [listKey]: 1 }));
  };

  const getPaginatedList = (items, listKey) => {
    const configuredSize = listPageSizes[listKey] || 10;
    const effectivePageSize = configuredSize === "all" ? Math.max(items.length, 1) : configuredSize;
    const totalPages = Math.max(1, Math.ceil(items.length / effectivePageSize));
    const currentPage = Math.min(listPages[listKey] || 1, totalPages);
    const start = (currentPage - 1) * effectivePageSize;
    const pagedItems = items.slice(start, start + effectivePageSize);
    return {
      items: pagedItems,
      totalPages,
      currentPage,
      totalItems: items.length,
      configuredSize,
    };
  };

  const servicesPageData = getPaginatedList(filteredServices, "services");
  const receiptsPageData = getPaginatedList(receipts, "receipts");
  const notificationsPageData = getPaginatedList(notifications, "notifications");
  const chatRoomsPageData = getPaginatedList(chatRooms, "chatRooms");
  const messagesPageData = getPaginatedList(messages, "chatMessages");

  const jumpToServiceList = (nextFilters = {}) => {
    setFilters((prev) => ({ ...prev, ...nextFilters }));
    setSection("ServicesList");
  };

  const openServiceDetails = (service) => {
    setSelectedServiceId(service.id);
    setBookingForm((prev) => ({ ...prev, service: String(service.id) }));
    setSection("BookingDetails");
  };

  const findNearbyProviders = async (radiusKm = 10) => {
    const hasProfileCoords = Number.isFinite(Number(user?.latitude)) && Number.isFinite(Number(user?.longitude));
    let lat = hasProfileCoords ? Number(user.latitude) : null;
    let lng = hasProfileCoords ? Number(user.longitude) : null;

    if (!hasProfileCoords && navigator?.geolocation) {
      const browserPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
      });
      lat = browserPosition.coords.latitude;
      lng = browserPosition.coords.longitude;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setWorkspaceNotice("Nearby search needs your location coordinates in profile or browser location access.");
      return;
    }

    try {
      const nearby = await api.nearbyProviders({ lat, lng, radius: radiusKm, category: filters.category || "" });
      const ids = (nearby.results || []).map((entry) => entry.provider?.id).filter(Boolean);
      setNearbyProviderIds(ids);
      setNearbySearchMeta({ count: nearby.count || 0, radiusKm, lat, lng });
      setWorkspaceNotice(`Nearby providers updated. Found ${nearby.count || 0} providers within ${radiusKm} km.`);
    } catch {
      setWorkspaceNotice("Failed to fetch nearby provider suggestions.");
    }
  };

  const clearNearbyProvidersFilter = () => {
    setNearbyProviderIds([]);
    setNearbySearchMeta(null);
    setWorkspaceNotice("Nearby provider filter cleared.");
  };

  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map((c) => [String(c.id), c.name])),
    [categories]
  );
  const recentServices = useMemo(
    () => [...services].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4),
    [services]
  );
  const mostBookedServices = useMemo(
    () => [...services].sort((a, b) => Number(b.booking_count || 0) - Number(a.booking_count || 0)).slice(0, 4),
    [services]
  );
  const interestingServices = useMemo(
    () => [...services].sort((a, b) => Number(b.provider_rating || 0) - Number(a.provider_rating || 0)).slice(0, 4),
    [services]
  );
  const providerServices = useMemo(
    () => services.filter((service) => String(service.provider) === String(user.id)),
    [services, user.id]
  );
  const bookingSectionItems = useMemo(() => {
    if (section === "IncomingRequests") {
      return bookings.filter((booking) => booking.status === "pending");
    }
    if (section === "AcceptedJobs") {
      return bookings.filter((booking) => ["accepted", "arrived", "in_progress"].includes(booking.status));
    }
    if (section === "CompletedJobs") {
      return bookings.filter((booking) => ["completed", "paid"].includes(booking.status));
    }
    return bookings;
  }, [bookings, section]);
  const bookingsPageData = getPaginatedList(bookingSectionItems, "bookings");
  const topCategories = useMemo(() => {
    const tally = {};
    services.forEach((s) => {
      const key = String(s.category || "uncategorized");
      tally[key] = (tally[key] || 0) + 1;
    });
    return Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key, count]) => ({
        id: key,
        name: categoryNameById[key] || "Uncategorized",
        count,
      }));
  }, [services, categoryNameById]);
  const topCategoriesPageData = getPaginatedList(topCategories, "topCategories");
  const recentServicesPageData = getPaginatedList(recentServices, "recentServices");
  const mostBookedServicesPageData = getPaginatedList(mostBookedServices, "mostBookedServices");
  const interestingServicesPageData = getPaginatedList(interestingServices, "interestingServices");

  const visibleUsers = useMemo(() => {
    if (adminRoleFilter === "all") return users;
    return users.filter((entry) => entry.role === adminRoleFilter);
  }, [users, adminRoleFilter]);
  const usersForCurrentSection = useMemo(
    () => visibleUsers.filter((entry) => section !== "ProvidersList" || entry.role === "provider"),
    [visibleUsers, section]
  );
  const usersPageData = getPaginatedList(usersForCurrentSection, "users");

  const financeSectionItems = useMemo(() => {
    if (section === "Transactions") {
      return payments.filter((payment) => payment.status === "released" || payment.status === "held");
    }
    if (section === "RevenueReports") {
      return payments.filter((payment) => payment.status === "released");
    }
    return payments;
  }, [payments, section]);
  const financePageData = getPaginatedList(financeSectionItems, "payments");

  const reviewSectionItems = useMemo(() => {
    if (section === "ReviewsList" && user.role === "admin") {
      return [...reviews, ...ratings].map((entry) => ({
        ...entry,
        __entry_type: entry.booking ? "review" : "rating",
      }));
    }
    if (section === "ReviewsList" && user.role === "provider") {
      return ratings;
    }
    return reviews;
  }, [ratings, reviews, section, user.role]);
  const reviewSectionPageData = getPaginatedList(reviewSectionItems, "reviews");

  const dashboardCounts = useMemo(
    () => ({
      ServicesList: services.length,
      BookingsList: bookings.length,
      PaymentsList: payments.length,
      Receipts: receipts.length,
      ReviewsList: reviews.length,
      Notifications: notifications.length,
      ChatSupport: chatRooms.length,
      UsersList: users.length,
      MyServices: providerServices.length,
    }),
    [services.length, bookings.length, payments.length, receipts.length, reviews.length, notifications.length, chatRooms.length, users.length, providerServices.length]
  );

  const activeRoom = chatRooms.find((room) => room.id === activeRoomId);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const sidebarVisible = mobileNavOpen;

  const sendMessage = async () => {
    if (!activeRoomId || !chatInput.trim()) return;
    await api.sendChatMessage(activeRoomId, chatInput.trim());
    setChatInput("");
    fetchMessages();
  };

  const runTrackedAction = async (actionKey, action) => {
    setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
    try {
      await action();
      setActionDone((prev) => ({ ...prev, [actionKey]: true }));
      return true;
    } catch {
      setActionDone((prev) => ({ ...prev, [actionKey]: false }));
      return false;
    } finally {
      setActionLoading((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const actionClassName = (variant, done = false, loading = false) => {
    const classes = ["action-btn", `action-btn--${variant}`];
    if (done) classes.push("is-done");
    if (loading) classes.push("is-loading");
    return classes.join(" ");
  };

  const renderListPagination = (listKey, pageData) => (
    <ListPagination
      listKey={listKey}
      pageData={pageData}
      onSizeChange={handleItemsPerPageChange}
      onPrev={() => setListPages((prev) => ({ ...prev, [listKey]: Math.max(1, pageData.currentPage - 1) }))}
      onNext={() => setListPages((prev) => ({ ...prev, [listKey]: Math.min(pageData.totalPages, pageData.currentPage + 1) }))}
      t={t}
    />
  );

  const createService = async (e) => {
    e.preventDefault();
    try {
      await api.createService(serviceForm);
      setServiceForm({ title: "", category: "", description: "", price: "", duration_minutes: 60 });
      setSubmittedForms((prev) => ({ ...prev, service: true }));
      setWorkspaceNotice("Service submitted successfully. ServiGo admin will review and publish it.");
      fetchCore();
    } catch {
      setSubmittedForms((prev) => ({ ...prev, service: false }));
      setWorkspaceNotice("Service submission failed. Please check the form and try again.");
    }
  };

  const createBooking = async (e) => {
    e.preventDefault();
    try {
      await api.createBooking(bookingForm);
      setBookingForm({ service: "", scheduled_at: "", notes: "", response_timeout_seconds: 300 });
      setSubmittedForms((prev) => ({ ...prev, booking: true }));
      setWorkspaceNotice("Booking created successfully.");
      fetchCore();
    } catch (err) {
      setSubmittedForms((prev) => ({ ...prev, booking: false }));
      setWorkspaceNotice(err?.response?.data?.detail || "Booking failed. Please review details and try again.");
    }
  };

  const initiatePayment = async (e) => {
    e.preventDefault();
    try {
      await api.initiatePayment(paymentForm);
      setSubmittedForms((prev) => ({ ...prev, payment: true }));
      setWorkspaceNotice("Payment initiated successfully.");
      fetchCore();
    } catch (err) {
      setSubmittedForms((prev) => ({ ...prev, payment: false }));
      setWorkspaceNotice(err?.response?.data?.detail || "Payment initiation failed. Please verify booking and payment details.");
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      if (user.role === "seeker") {
        await api.createReview(reviewForm);
      } else {
        await api.createRating({
          to_user: Number(reviewForm.to_user),
          rating: Number(reviewForm.rating),
          review: reviewForm.comment,
        });
      }
      setReviewForm({ booking: "", to_user: "", rating: 5, comment: "" });
      setSubmittedForms((prev) => ({ ...prev, review: true }));
      setWorkspaceNotice("Review submitted successfully.");
      fetchCore();
    } catch {
      setSubmittedForms((prev) => ({ ...prev, review: false }));
      setWorkspaceNotice("Review submission failed. Please try again.");
    }
  };

  const clearNotifications = async () => {
    try {
      await api.clearNotifications();
      setWorkspaceNotice("Notifications cleared.");
      await fetchCore();
    } catch {
      setWorkspaceNotice("Failed to clear notifications.");
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await api.updateBookingStatus(bookingId, status);
      setWorkspaceNotice(`Booking #${bookingId} marked as ${status}.`);
      fetchCore();
    } catch (err) {
      setWorkspaceNotice(err?.response?.data?.detail || `Failed to update booking #${bookingId}.`);
    }
  };

  const publishService = async (serviceId, publish = true) => {
    try {
      await api.publishService(serviceId, publish);
      setWorkspaceNotice("Service publication updated successfully.");
      await fetchCore();
    } catch {
      setWorkspaceNotice("Service publication update failed.");
    }
  };

  const updateService = async (serviceId, payload) => {
    try {
      await api.updateService(serviceId, payload);
      setWorkspaceNotice("Service updated successfully.");
      await fetchCore();
    } catch {
      setWorkspaceNotice("Service update failed.");
    }
  };

  const deleteService = async (serviceId) => {
    try {
      await api.deleteService(serviceId);
      if (selectedServiceId === serviceId) {
        setSelectedServiceId(null);
      }
      setWorkspaceNotice("Service deleted successfully.");
      await fetchCore();
    } catch {
      setWorkspaceNotice("Service delete failed.");
    }
  };

  const updateUserProfile = async (userId, payload) => {
    try {
      await api.updateUser(userId, payload);
      setWorkspaceNotice("User updated successfully.");
      await fetchCore();
    } catch {
      setWorkspaceNotice("User update failed.");
    }
  };

  const deleteUser = async (userId) => {
    try {
      await api.deleteUser(userId);
      setWorkspaceNotice("User deleted successfully.");
      await fetchCore();
    } catch {
      setWorkspaceNotice("User delete failed.");
    }
  };

  const openSupport = () => {
    setSupportOpen(true);
    setUserMenuOpen(false);
  };

  const openHelp = () => {
    setHelpOpen(true);
    setUserMenuOpen(false);
  };

  const openSettings = () => {
    setSettingsOpen(true);
    setUserMenuOpen(false);
  };

  const cancelBooking = async (bookingId) => {
    try {
      const response = await api.updateBookingStatus(bookingId, "cancelled");
      if (response?.detail) {
        setWorkspaceNotice(response.detail);
      } else {
        setWorkspaceNotice("Booking cancellation submitted.");
      }
      await fetchCore();
    } catch {
      setWorkspaceNotice("Booking cancellation failed.");
    }
  };

  const redirectBooking = async (bookingId) => {
    const targetProviderId = redirectTargets[bookingId];
    if (!targetProviderId) return;
    try {
      await api.redirectBooking(bookingId, targetProviderId);
      setWorkspaceNotice("Booking redirected successfully. Seeker, providers, and admins were notified.");
      await fetchCore();
    } catch {
      setWorkspaceNotice("Booking redirect failed.");
    }
  };

  const saveCommissionRate = async (commissionRate) => {
    try {
      const updated = await api.updateCommissionConfig(commissionRate);
      setCommissionConfig(updated);
      setWorkspaceNotice("Commission rate updated successfully.");
      await fetchCore();
    } catch {
      setWorkspaceNotice("Commission rate update failed.");
    }
  };

  const saveSmsGateway = async (payload) => {
    try {
      const updated = await api.updateSmsGateway(payload);
      setSmsGateway(updated.config || updated);
      setWorkspaceNotice("SMS gateway settings updated successfully.");
      await fetchCore();
    } catch {
      setWorkspaceNotice("SMS gateway update failed.");
    }
  };

  const generateReceipt = async (paymentId) => {
    try {
      const receipt = await api.generateReceipt(paymentId);
      setWorkspaceNotice(`Receipt generated: ${receipt.receipt_number}`);
      setSection("Receipts");
      await fetchCore();
    } catch {
      setWorkspaceNotice("Failed to generate receipt.");
    }
  };

  const selectedService = services.find((entry) => entry.id === selectedServiceId) || null;
  const rateTargets = useMemo(() => {
    if (user.role !== "provider") return [];
    const map = new Map();
    bookings
      .filter((booking) => booking.status === "completed")
      .filter((booking) => String(booking.assigned_provider_id || booking.provider_id) === String(user.id))
      .forEach((booking) => {
        if (!map.has(booking.seeker)) {
          map.set(booking.seeker, {
            id: booking.seeker,
            name: booking.seeker_name || `Seeker #${booking.seeker}`,
          });
        }
      });
    return Array.from(map.values());
  }, [bookings, user.id, user.role]);

  const reviewEntries = user.role === "seeker" ? reviews : ratings;
  const openHubSection = (targetSection) => {
    if (targetSection === "ServicesList") {
      setFilters({ q: "", location: "", category: "" });
    }
    setSection(targetSection);
  };

  return (
    <div className={`workspace-wrap ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <WorkspaceTopbar
        setMobileNavOpen={setMobileNavOpen}
        setSection={setSection}
        headerMessage={headerMessage}
        user={user}
        unreadCount={unreadCount}
        notificationsOpen={notificationsOpen}
        setNotificationsOpen={setNotificationsOpen}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        clearNotifications={clearNotifications}
        fetchCore={fetchCore}
        openSupport={openSupport}
        openHelp={openHelp}
        openSettings={openSettings}
        logout={logout}
        api={api}
        t={t}
      />

      <WorkspaceSidebar
        sidebarVisible={sidebarVisible}
        isCollapsed={sidebarCollapsed}
        toggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        user={user}
        navGroups={navGroups}
        openGroups={openGroups}
        setOpenGroups={setOpenGroups}
        section={section}
        setSection={setSection}
        setMobileNavOpen={setMobileNavOpen}
        t={t}
      />

      <div className="workspace-main">
        <header className="workspace-header">
          <div>
            <h3>{providerPending ? t("Provider Approval") : t(currentNavItem?.label || section)}</h3>
            <p>{providerPending ? "Your provider account is pending admin approval before publishing services." : "Navigate bookings, payments, notifications, and communication in one workspace."}</p>
            {workspaceError && <p className="error">{t(workspaceError)}</p>}
            {workspaceNotice && <p className="notice">{t(workspaceNotice)}</p>}
          </div>
          <div className="head-actions">
            <button className="btn btn-ghost" onClick={fetchCore}>{t("Refresh Data")}</button>
          </div>
        </header>

        <main className={`workspace-grid ${focusedWorkspace ? "focused" : ""}`}>
          {providerPending && (
            <ApprovalPanel />
          )}

          {!providerPending && (section === "Dashboard" || section === "ProviderDashboard") && (
            <DashboardHub user={user} t={t} onNavigate={openHubSection} counts={dashboardCounts} />
          )}

          {!providerPending && section === "BookingDetails" && selectedService && (
            <BookingDetailsPanel
              selectedService={selectedService}
              money={money}
              user={user}
              createBooking={createBooking}
              bookingForm={bookingForm}
              setBookingForm={setBookingForm}
              submittedForms={submittedForms}
              t={t}
            />
          )}

          {!providerPending && section === "ServicesList" && (
            <ServicesPanel
              t={t}
              filters={filters}
              setFilters={setFilters}
              categories={categories}
              services={filteredServices}
              servicesPageData={servicesPageData}
              user={user}
              money={money}
              actionClassName={actionClassName}
              actionDone={actionDone}
              actionLoading={actionLoading}
              runTrackedAction={runTrackedAction}
              publishService={publishService}
              updateService={updateService}
              deleteService={deleteService}
              openServiceDetails={openServiceDetails}
              findNearbyProviders={findNearbyProviders}
              clearNearbyProvidersFilter={clearNearbyProvidersFilter}
              nearbySearchMeta={nearbySearchMeta}
              nearbyFilterActive={nearbyProviderIds.length > 0}
              renderListPagination={renderListPagination}
            />
          )}

          {!providerPending && (
            section === "BookingsList" ||
            section === "UpdateBookingStatus" ||
            section === "IncomingRequests" ||
            section === "AcceptedJobs" ||
            section === "CompletedJobs"
          ) && (
            <BookingsPanel
              t={t}
              user={user}
              section={section}
              createBooking={createBooking}
              bookingForm={bookingForm}
              setBookingForm={setBookingForm}
              filteredServices={filteredServices}
              submittedForms={submittedForms}
              bookingsPageData={bookingsPageData}
              money={money}
              actionDone={actionDone}
              actionLoading={actionLoading}
              runTrackedAction={runTrackedAction}
              cancelBooking={cancelBooking}
              updateBookingStatus={updateBookingStatus}
              providerOptions={providerOptions}
              redirectTargets={redirectTargets}
              setRedirectTargets={setRedirectTargets}
              redirectBooking={redirectBooking}
              renderListPagination={renderListPagination}
            />
          )}

          {!providerPending && (section === "PaymentsList" || section === "Transactions" || section === "RevenueReports") && (
            <PaymentsPanel
              t={t}
              user={user}
              wallet={wallet}
              payments={financeSectionItems}
              money={money}
              initiatePayment={initiatePayment}
              paymentForm={paymentForm}
              setPaymentForm={setPaymentForm}
              bookings={bookings}
              submittedForms={submittedForms}
              paymentsPageData={financePageData}
              actionDone={actionDone}
              actionLoading={actionLoading}
              runTrackedAction={runTrackedAction}
              api={api}
              fetchCore={fetchCore}
              generateReceipt={generateReceipt}
              renderListPagination={renderListPagination}
              onViewReceipts={() => setSection("Receipts")}
            />
          )}

          {!providerPending && section === "MyServices" && user.role === "provider" && (
            <MyServicesPanel
              t={t}
              user={user}
              providerServices={providerServices}
              money={money}
              onAddService={() => setSection("AddService")}
              onOpenMarketplace={() => setSection("ServicesList")}
            />
          )}

          {!providerPending && (section === "AddService" || section === "EditService") && user.role === "provider" && (
            <PublishServicePanel
              t={t}
              createService={createService}
              serviceForm={serviceForm}
              setServiceForm={setServiceForm}
              categories={categories}
              submittedForms={submittedForms}
              onViewMyServices={() => setSection("MyServices")}
              onOpenMarketplace={() => setSection("ServicesList")}
            />
          )}

          {!providerPending && section === "ReviewsList" && (user.role === "seeker" || user.role === "provider" || user.role === "admin") && (
            <ReviewsPanel
              t={t}
              user={user}
              submitReview={submitReview}
              reviewForm={reviewForm}
              setReviewForm={setReviewForm}
              bookings={bookings}
              rateTargets={rateTargets}
              submittedForms={submittedForms}
              reviewsPageData={reviewSectionPageData}
              renderListPagination={renderListPagination}
            />
          )}

          {!providerPending && section === "Notifications" && (
            <NotificationsPanel
              t={t}
              api={api}
              fetchCore={fetchCore}
              clearNotifications={clearNotifications}
              notifications={notifications}
              notificationsPageData={notificationsPageData}
              runTrackedAction={runTrackedAction}
              actionLoading={actionLoading}
              renderListPagination={renderListPagination}
            />
          )}

          {!providerPending && section === "Receipts" && (
            <ReceiptsPanel
              t={t}
              money={money}
              receiptsPageData={receiptsPageData}
              renderListPagination={renderListPagination}
              setSection={setSection}
              api={api}
              setWorkspaceNotice={setWorkspaceNotice}
            />
          )}

          {!providerPending && section === "SupportTickets" && (
            <SupportCenterPanel t={t} openSupport={openSupport} />
          )}

          {!providerPending && section === "SystemSettings" && (
            <SystemSettingsPanel
              t={t}
              theme={theme}
              setTheme={setTheme}
              language={language}
              setLanguage={setLanguage}
              user={user}
              commissionConfig={commissionConfig}
              saveCommissionRate={saveCommissionRate}
              smsGateway={smsGateway}
              saveSmsGateway={saveSmsGateway}
            />
          )}

          {profileSection && (
            <ProfileDetailsPanel t={t} user={user} />
          )}

          {!providerPending && (section === "UsersList" || section === "ProvidersList") && user.role === "admin" && (
            <UserDirectoryPanel
              t={t}
              setAdminRoleFilter={setAdminRoleFilter}
              usersPageData={usersPageData}
              api={api}
              fetchCore={fetchCore}
              runTrackedAction={runTrackedAction}
              actionLoading={actionLoading}
              actionDone={actionDone}
              updateUserProfile={updateUserProfile}
              deleteUser={deleteUser}
              renderListPagination={renderListPagination}
            />
          )}

          {!providerPending && section === "ChatSupport" && (
            <ChatPanel
              t={t}
              chatRoomsPageData={chatRoomsPageData}
              activeRoomId={activeRoomId}
              setActiveRoomId={setActiveRoomId}
              renderListPagination={renderListPagination}
              messagesPageData={messagesPageData}
              user={user}
              activeRoom={activeRoom}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendMessage={sendMessage}
              api={api}
              fetchCore={fetchCore}
            />
          )}

          {!knownSections.has(section) && (
            <FallbackPanel section={section} />
          )}
        </main>

        <footer className="workspace-footer">
          <p>ServiGo platform workspace • secure bookings, communication, and protected payouts.</p>
        </footer>

        <WorkspaceModals
          supportOpen={supportOpen}
          setSupportOpen={setSupportOpen}
          helpOpen={helpOpen}
          setHelpOpen={setHelpOpen}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          theme={theme}
          setTheme={setTheme}
          language={language}
          setLanguage={setLanguage}
          t={t}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const loadUser = async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      localStorage.removeItem("servigo_access_token");
      localStorage.removeItem("servigo_refresh_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("servigo_access_token")) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("servigo_access_token");
    localStorage.removeItem("servigo_refresh_token");
    setUser(null);
  };

  if (loading) return <div className="loading">Loading ServiGo...</div>;

  const initialSection = new URLSearchParams(location.search).get("section") || undefined;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={user ? <Navigate to={`/workspace${location.search}`} replace /> : <Auth onLoggedIn={loadUser} />} />
      <Route path="/workspace" element={user ? <AppShell user={user} logout={logout} initialSection={initialSection} /> : <Navigate to={`/auth${location.search}`} replace />} />
    </Routes>
  );
}
