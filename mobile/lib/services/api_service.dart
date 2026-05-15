import 'dart:convert';
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/service_item.dart';

class ApiService {
  static const String _compiledApiRoot = String.fromEnvironment(
    'SERVIGO_API_ROOT',
    defaultValue: '',
  );
  static const String _androidApiRoot = String.fromEnvironment(
    'SERVIGO_ANDROID_API_ROOT',
    defaultValue: '',
  );
  static const String _androidLanDefault = String.fromEnvironment(
    'SERVIGO_ANDROID_LAN_API_ROOT',
    defaultValue: 'http://192.168.1.129:8000',
  );
  static const Duration _requestTimeout = Duration(seconds: 12);
  static const Duration _probeTimeout = Duration(seconds: 3);

  String? _resolvedApiRoot;

  List<String> _candidateApiRoots() {
    if (_compiledApiRoot.isNotEmpty) {
      return [_compiledApiRoot];
    }

    if (kIsWeb) {
      return const ['http://127.0.0.1:8000'];
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return [
          if (_androidApiRoot.isNotEmpty) _androidApiRoot,
          _androidLanDefault,
          'http://10.0.2.2:8000',
          'http://127.0.0.1:8000',
        ];
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
        return const ['http://127.0.0.1:8000'];
      default:
        return const ['http://127.0.0.1:8000'];
    }
  }

  Future<String> _resolveApiRoot() async {
    if (_resolvedApiRoot != null && _resolvedApiRoot!.isNotEmpty) {
      return _resolvedApiRoot!;
    }

    final candidates = _candidateApiRoots();
    for (final root in candidates) {
      try {
        final probe = await http
            .get(Uri.parse('$root/api/categories/'))
            .timeout(_probeTimeout);
        if (probe.statusCode < 500) {
          _resolvedApiRoot = root;
          return root;
        }
      } catch (_) {
        // Try next candidate.
      }
    }

    _resolvedApiRoot = candidates.first;
    return _resolvedApiRoot!;
  }

  Future<String> debugSelectedBackendHost() async {
    final root = await _resolveApiRoot();
    return _prettyRoot(root);
  }

  String _prettyRoot(String root) {
    try {
      final uri = Uri.parse(root);
      return '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
    } catch (_) {
      return root;
    }
  }

  String _connectivityHint(String operation) {
    final root = _resolvedApiRoot;
    if (root == null || root.isEmpty) {
      return '$operation could not find a reachable backend server. Make sure the backend is running and the phone is pointed to the same server as web.';
    }
    return '$operation could not reach ${_prettyRoot(root)}. Check that the backend is running, the phone can reach the server IP, and the selected server matches the web app.';
  }

  Future<String> _api() async {
    final root = await _resolveApiRoot();
    return '$root/api';
  }

  Future<http.Response> _awaitResponse(Future<http.Response> request, String operation) async {
    try {
      return await request.timeout(_requestTimeout);
    } on TimeoutException {
      throw Exception(_connectivityHint(operation));
    }
  }

  Exception _buildError(String operation, http.Response response) {
    return Exception('$operation failed (${response.statusCode}): ${response.body}');
  }

  Future<void> login(String email, String password) async {
    final api = await _api();
    final response = await _awaitResponse(
      http.post(
        Uri.parse('$api/token/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      ),
      'Login',
    );

    if (response.statusCode >= 400) {
      throw _buildError('Login', response);
    }

    final data = jsonDecode(response.body);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access', data['access']);
    await prefs.setString('refresh', data['refresh']);
  }

  Future<void> register(Map<String, dynamic> payload) async {
    final api = await _api();
    final response = await _awaitResponse(
      http.post(
        Uri.parse('$api/auth/register/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      ),
      'Registration',
    );

    if (response.statusCode >= 400) {
      throw _buildError('Registration', response);
    }
  }

  Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access');
  }

  Future<Map<String, dynamic>> me() async {
    final api = await _api();
    final token = await _token();
    final response = await _awaitResponse(
      http.get(
        Uri.parse('$api/users/me/'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ),
      'User profile',
    );
    if (response.statusCode >= 400) {
      throw _buildError('User profile', response);
    }
    return jsonDecode(response.body);
  }

  Future<List<ServiceItem>> services() async {
    final api = await _api();
    final token = await _token();
    final headers = <String, String>{};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await _awaitResponse(
      http.get(Uri.parse('$api/services/'), headers: headers),
      'Load services',
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load services', response);
    }
    final data = jsonDecode(response.body);
    final list = (data is Map<String, dynamic> ? data['results'] ?? [] : data) as List<dynamic>;
    return list.map((item) => ServiceItem.fromJson(item)).toList();
  }

  Future<void> createBooking({
    required int serviceId,
    required String scheduledAt,
    String notes = '',
  }) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/bookings/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'service': serviceId,
        'scheduled_at': scheduledAt,
        'notes': notes,
      }),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Create booking', response);
    }
  }

  Future<void> initiatePayment({
    required int bookingId,
    required String method,
    required String phone,
  }) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/payments/initiate/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'booking_id': bookingId,
        'method': method,
        'phone': phone,
      }),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Payment initiation', response);
    }
  }

  Future<List<Map<String, dynamic>>> bookings() async {
    final api = await _api();
    final token = await _token();
    final response = await _awaitResponse(
      http.get(
        Uri.parse('$api/bookings/'),
        headers: {'Authorization': 'Bearer $token'},
      ),
      'Load bookings',
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load bookings', response);
    }
    final data = jsonDecode(response.body);
    final list = (data is Map<String, dynamic> ? data['results'] ?? [] : data) as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> payments() async {
    final api = await _api();
    final token = await _token();
    final response = await _awaitResponse(
      http.get(
        Uri.parse('$api/payments/'),
        headers: {'Authorization': 'Bearer $token'},
      ),
      'Load payments',
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load payments', response);
    }
    final data = jsonDecode(response.body);
    final list = (data is Map<String, dynamic> ? data['results'] ?? [] : data) as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  Future<void> verifyPayment(String transactionReference) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/payments/verify/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'transaction_reference': transactionReference}),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Payment verification', response);
    }
  }

  Future<void> releasePayment(int paymentId) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/payments/$paymentId/release/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'release': true}),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Payment release', response);
    }
  }

  Future<List<Map<String, dynamic>>> receipts() async {
    final api = await _api();
    final token = await _token();
    final response = await _awaitResponse(
      http.get(
        Uri.parse('$api/payments/receipts/'),
        headers: {'Authorization': 'Bearer $token'},
      ),
      'Load receipts',
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load receipts', response);
    }
    final data = jsonDecode(response.body);
    final list = (data is Map<String, dynamic> ? data['results'] ?? [] : data) as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> generateReceipt(int paymentId) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/payments/$paymentId/generate_receipt/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );
    if (response.statusCode >= 400) {
      throw _buildError('Generate receipt', response);
    }
    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) {
      return data;
    }
    return {'detail': 'Receipt generated'};
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access');
    await prefs.remove('refresh');
  }

  Future<List<Map<String, dynamic>>> categories() async {
    final api = await _api();
    final response = await _awaitResponse(
      http.get(Uri.parse('$api/categories/')),
      'Load categories',
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load categories', response);
    }
    final data = jsonDecode(response.body);
    final list = (data is Map<String, dynamic> ? data['results'] ?? [] : data) as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  Future<void> createService(Map<String, dynamic> payload) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/services/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Create service', response);
    }
  }

  Future<Map<String, dynamic>> updateBookingStatus(int bookingId, String status) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/bookings/$bookingId/set_status/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'status': status}),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Update booking status', response);
    }
    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) {
      return data;
    }
    return {'detail': 'Booking status updated'};
  }

  Future<void> redirectBooking(int bookingId, int targetProviderId) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/bookings/$bookingId/redirect_provider/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'target_provider_id': targetProviderId}),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Redirect booking', response);
    }
  }

  Future<List<Map<String, dynamic>>> reviews() async {
    final api = await _api();
    final token = await _token();
    final response = await _awaitResponse(
      http.get(
        Uri.parse('$api/reviews/'),
        headers: {'Authorization': 'Bearer $token'},
      ),
      'Load reviews',
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load reviews', response);
    }
    final data = jsonDecode(response.body);
    final list = (data is Map<String, dynamic> ? data['results'] ?? [] : data) as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  Future<void> createReview(Map<String, dynamic> payload) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/reviews/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Create review', response);
    }
  }

  Future<List<Map<String, dynamic>>> notifications() async {
    final api = await _api();
    final token = await _token();
    final response = await _awaitResponse(
      http.get(
        Uri.parse('$api/notifications/'),
        headers: {'Authorization': 'Bearer $token'},
      ),
      'Load notifications',
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load notifications', response);
    }
    final data = jsonDecode(response.body);
    final list = (data is Map<String, dynamic> ? data['results'] ?? [] : data) as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  Future<void> markAllNotificationsRead() async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/notifications/mark_all_read/'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode >= 400) {
      throw _buildError('Mark notifications read', response);
    }
  }

  Future<void> clearNotifications() async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/notifications/clear_all/'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode >= 400) {
      throw _buildError('Clear notifications', response);
    }
  }

  Future<List<Map<String, dynamic>>> chats() async {
    final api = await _api();
    final token = await _token();
    final response = await _awaitResponse(
      http.get(
        Uri.parse('$api/chats/'),
        headers: {'Authorization': 'Bearer $token'},
      ),
      'Load chats',
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load chats', response);
    }
    final data = jsonDecode(response.body);
    final list = (data is Map<String, dynamic> ? data['results'] ?? [] : data) as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> chatMessages(int roomId) async {
    final api = await _api();
    final token = await _token();
    final response = await _awaitResponse(
      http.get(
        Uri.parse('$api/chats/$roomId/messages/'),
        headers: {'Authorization': 'Bearer $token'},
      ),
      'Load chat messages',
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load chat messages', response);
    }
    final data = jsonDecode(response.body) as List<dynamic>;
    return data.cast<Map<String, dynamic>>();
  }

  Future<void> sendChatMessage(int roomId, String message) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/chats/$roomId/messages/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'message': message}),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Send chat message', response);
    }
  }

  Future<void> exchangeContacts(int roomId) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/chats/$roomId/exchange_contacts/'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );
    if (response.statusCode >= 400) {
      throw _buildError('Exchange contacts', response);
    }
  }

  Future<List<Map<String, dynamic>>> users({Map<String, String>? params}) async {
    final api = await _api();
    final token = await _token();
    final uri = Uri.parse('$api/users/').replace(queryParameters: params);
    final response = await http.get(
      uri,
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode >= 400) {
      throw _buildError('Load users', response);
    }
    final data = jsonDecode(response.body);
    final list = (data is Map<String, dynamic> ? data['results'] ?? [] : data) as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> updateUser(int userId, Map<String, dynamic> payload) async {
    final api = await _api();
    final token = await _token();
    final response = await http.patch(
      Uri.parse('$api/users/$userId/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Update user', response);
    }
    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) {
      return data;
    }
    return {'detail': 'User updated'};
  }

  Future<void> deleteUser(int userId) async {
    final api = await _api();
    final token = await _token();
    final response = await http.delete(
      Uri.parse('$api/users/$userId/'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );
    if (response.statusCode >= 400) {
      throw _buildError('Delete user', response);
    }
  }

  Future<Map<String, dynamic>> approveProvider(int userId, {bool isProviderApproved = true}) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/users/$userId/approve_provider/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'is_provider_approved': isProviderApproved}),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Approve provider', response);
    }
    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) {
      return data;
    }
    return {'detail': 'Provider approval updated'};
  }

  Future<Map<String, dynamic>> updateService(int serviceId, Map<String, dynamic> payload) async {
    final api = await _api();
    final token = await _token();
    final response = await http.patch(
      Uri.parse('$api/services/$serviceId/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Update service', response);
    }
    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) {
      return data;
    }
    return {'detail': 'Service updated'};
  }

  Future<void> deleteService(int serviceId) async {
    final api = await _api();
    final token = await _token();
    final response = await http.delete(
      Uri.parse('$api/services/$serviceId/'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );
    if (response.statusCode >= 400) {
      throw _buildError('Delete service', response);
    }
  }

  Future<Map<String, dynamic>> publishService(int serviceId, {bool publish = true}) async {
    final api = await _api();
    final token = await _token();
    final response = await http.post(
      Uri.parse('$api/services/$serviceId/publish/'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'publish': publish}),
    );
    if (response.statusCode >= 400) {
      throw _buildError('Publish service', response);
    }
    final data = jsonDecode(response.body);
    if (data is Map<String, dynamic>) {
      return data;
    }
    return {'detail': 'Service publication updated'};
  }
}
