import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

const client = axios.create({
  baseURL: API_BASE_URL,
});

const tokenClient = axios.create({
  baseURL: API_BASE_URL,
});

tokenClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("servigo_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  login: async (email, password) => {
    const response = await axios.post("/api/token/", {
      email,
      password,
    });
    return response.data;
  },
  platformSummary: async () => {
    const response = await client.get("/platform/summary/");
    return response.data;
  },
  register: async (payload) => {
    const response = await client.post("/auth/register/", payload);
    return response.data;
  },
  me: async () => {
    const response = await tokenClient.get("/users/me/");
    return response.data;
  },
  updatePresence: async (payload) => {
    const response = await tokenClient.post("/users/presence/", payload);
    return response.data;
  },
  services: async (query = "") => {
    const hasToken = Boolean(localStorage.getItem("servigo_access_token"));
    const requester = hasToken ? tokenClient : client;
    const response = await requester.get(`/services/${query}`);
    return response.data;
  },
  categories: async () => {
    const response = await client.get("/categories/");
    return response.data;
  },
  createService: async (payload) => {
    const response = await tokenClient.post("/services/", payload);
    return response.data;
  },
  bookings: async (params = {}) => {
    const response = await tokenClient.get("/bookings/", { params });
    return response.data;
  },
  adminBookings: async () => {
    const response = await tokenClient.get("/bookings/admin_all/");
    return response.data;
  },
  reassignStaleBookings: async () => {
    const response = await tokenClient.post("/bookings/reassign_stale/");
    return response.data;
  },
  createBooking: async (payload) => {
    const response = await tokenClient.post("/bookings/", payload);
    return response.data;
  },
  updateBookingStatus: async (id, status) => {
    const response = await tokenClient.post(`/bookings/${id}/set_status/`, { status });
    return response.data;
  },
  initiatePayment: async (payload) => {
    const response = await tokenClient.post("/payments/initiate/", payload);
    return response.data;
  },
  verifyPayment: async (transaction_reference) => {
    const response = await tokenClient.post("/payments/verify/", { transaction_reference });
    return response.data;
  },
  releasePayment: async (id) => {
    const response = await tokenClient.post(`/payments/${id}/release/`, { release: true });
    return response.data;
  },
  payments: async () => {
    const response = await tokenClient.get("/payments/");
    return response.data;
  },
  wallet: async () => {
    const response = await tokenClient.get("/payments/wallet/");
    return response.data;
  },
  providerWallet: async () => {
    const response = await tokenClient.get("/payments/provider_wallet/");
    return response.data;
  },
  commissionConfig: async () => {
    const response = await tokenClient.get("/payments/commission_config/");
    return response.data;
  },
  updateCommissionConfig: async (commission_rate) => {
    const response = await tokenClient.post("/payments/commission_config/", { commission_rate });
    return response.data;
  },
  receipts: async () => {
    const response = await tokenClient.get("/payments/receipts/");
    return response.data;
  },
  receiptPdf: async (paymentId) => {
    const response = await tokenClient.get(`/payments/${paymentId}/receipt_pdf/`, { responseType: "blob" });
    return response.data;
  },
  generateReceipt: async (paymentId) => {
    const response = await tokenClient.post(`/payments/${paymentId}/generate_receipt/`);
    return response.data;
  },
  reviews: async () => {
    const response = await tokenClient.get("/reviews/");
    return response.data;
  },
  createReview: async (payload) => {
    const response = await tokenClient.post("/reviews/", payload);
    return response.data;
  },
  ratings: async () => {
    const response = await tokenClient.get("/ratings/");
    return response.data;
  },
  createRating: async (payload) => {
    const response = await tokenClient.post("/ratings/", payload);
    return response.data;
  },
  notifications: async () => {
    const response = await tokenClient.get("/notifications/");
    return response.data;
  },
  smsGateway: async () => {
    const response = await tokenClient.get("/notifications/sms_gateway/");
    return response.data;
  },
  updateSmsGateway: async (payload) => {
    const response = await tokenClient.post("/notifications/sms_gateway/", payload);
    return response.data;
  },
  markAllNotificationsRead: async () => {
    const response = await tokenClient.post("/notifications/mark_all_read/");
    return response.data;
  },
  clearNotifications: async () => {
    const response = await tokenClient.post("/notifications/clear_all/");
    return response.data;
  },
  chats: async () => {
    const response = await tokenClient.get("/chats/");
    return response.data;
  },
  chatMessages: async (id) => {
    const response = await tokenClient.get(`/chats/${id}/messages/`);
    return response.data;
  },
  sendChatMessage: async (id, message) => {
    const response = await tokenClient.post(`/chats/${id}/messages/`, { message });
    return response.data;
  },
  exchangeContacts: async (id) => {
    const response = await tokenClient.post(`/chats/${id}/exchange_contacts/`);
    return response.data;
  },
  users: async (params = {}) => {
    const response = await tokenClient.get("/users/", { params });
    return response.data;
  },
  updateUser: async (userId, payload) => {
    const response = await tokenClient.patch(`/users/${userId}/`, payload);
    return response.data;
  },
  deleteUser: async (userId) => {
    const response = await tokenClient.delete(`/users/${userId}/`);
    return response.data;
  },
  approveProvider: async (userId, is_provider_approved = true) => {
    const response = await tokenClient.post(`/users/${userId}/approve_provider/`, { is_provider_approved });
    return response.data;
  },
  verifyProvider: async (provider_id, is_provider_approved = true) => {
    const response = await tokenClient.post("/users/verify_provider/", { provider_id, is_provider_approved });
    return response.data;
  },
  nearbyProviders: async ({ lat, lng, radius = 10, category = "" }) => {
    const params = { lat, lng, radius };
    if (category) params.category = category;
    const response = await tokenClient.get("/users/nearby_providers/", { params });
    return response.data;
  },
  updateService: async (serviceId, payload) => {
    const response = await tokenClient.patch(`/services/${serviceId}/`, payload);
    return response.data;
  },
  deleteService: async (serviceId) => {
    const response = await tokenClient.delete(`/services/${serviceId}/`);
    return response.data;
  },
  publishService: async (serviceId, publish = true) => {
    const response = await tokenClient.post(`/services/${serviceId}/publish/`, { publish });
    return response.data;
  },
  redirectBooking: async (bookingId, target_provider_id) => {
    const response = await tokenClient.post(`/bookings/${bookingId}/redirect_provider/`, { target_provider_id });
    return response.data;
  },
};
