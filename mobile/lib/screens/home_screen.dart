import 'package:flutter/material.dart';

import '../models/service_item.dart';
import '../services/api_service.dart';

class _PageSlice<T> {
  final List<T> items;
  final int totalPages;
  final int currentPage;
  final int totalItems;
  final int configuredPageSize;

  const _PageSlice({
    required this.items,
    required this.totalPages,
    required this.currentPage,
    required this.totalItems,
    required this.configuredPageSize,
  });
}

class HomeScreen extends StatefulWidget {
  final VoidCallback onLogout;
  const HomeScreen({super.key, required this.onLogout});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const List<int> _itemsPerPageOptions = <int>[5, 10, 20, 30, -1];
  final api = ApiService();
  final bookingDateController = TextEditingController();
  final bookingTimeController = TextEditingController();
  final bookingNoteController = TextEditingController();
  final paymentPhoneController = TextEditingController(text: '+255700000000');
  final chatController = TextEditingController();
  final serviceTitleController = TextEditingController();
  final serviceDescController = TextEditingController();
  final servicePriceController = TextEditingController();
  final serviceDurationController = TextEditingController(text: '60');
  final supportEmail = 'mndolwa26@gmail.com';
  final supportPhone = '+255 786 225 687';

  String section = 'Dashboard';
  int? selectedServiceId;
  int? selectedBookingId;
  int? selectedReviewBookingId;
  int? selectedChatRoomId;
  String paymentMethod = 'mpesa';
  int reviewRating = 5;
  String reviewComment = '';
  int? selectedCategoryId;

  List<ServiceItem> services = [];
  List<Map<String, dynamic>> bookings = [];
  List<Map<String, dynamic>> payments = [];
  List<Map<String, dynamic>> categories = [];
  List<Map<String, dynamic>> reviews = [];
  List<Map<String, dynamic>> notifications = [];
  List<Map<String, dynamic>> chatRooms = [];
  List<Map<String, dynamic>> chatMessages = [];
  List<Map<String, dynamic>> users = [];
  List<Map<String, dynamic>> providerOptions = [];
  List<Map<String, dynamic>> receipts = [];
  Map<String, dynamic>? user;
  bool loading = true;
  String? error;
  final Map<String, int> _pageSizes = {
    'services': 10,
    'bookings': 10,
    'payments': 10,
    'receipts': 10,
    'reviews': 10,
    'notifications': 10,
    'chatMessages': 10,
    'users': 10,
  };
  final Map<String, int> _pages = {
    'services': 1,
    'bookings': 1,
    'payments': 1,
    'receipts': 1,
    'reviews': 1,
    'notifications': 1,
    'chatMessages': 1,
    'users': 1,
  };

  final Map<String, List<List<Map<String, String>>>> navByRole = {
    'seeker': [
      [
        {'key': 'Dashboard', 'label': 'Overview'},
        {'key': 'ServicesList', 'label': 'Services'},
        {'key': 'BookingsList', 'label': 'Bookings'},
        {'key': 'PaymentsList', 'label': 'Payments'},
        {'key': 'Receipts', 'label': 'Receipts'},
      ],
      [
        {'key': 'ReviewsList', 'label': 'Reviews'},
        {'key': 'Notifications', 'label': 'Notifications'},
        {'key': 'ChatSupport', 'label': 'Live Chat'},
      ],
    ],
    'provider': [
      [
        {'key': 'ProviderDashboard', 'label': 'Dashboard'},
        {'key': 'IncomingRequests', 'label': 'Incoming Requests'},
        {'key': 'AcceptedJobs', 'label': 'Accepted Jobs'},
        {'key': 'CompletedJobs', 'label': 'Completed Jobs'},
      ],
      [
        {'key': 'MyServices', 'label': 'My Services'},
        {'key': 'AddService', 'label': 'Add Service'},
        {'key': 'PaymentsList', 'label': 'Earnings'},
        {'key': 'Receipts', 'label': 'Receipts'},
        {'key': 'Notifications', 'label': 'Notifications'},
        {'key': 'ChatSupport', 'label': 'Live Chat'},
      ],
    ],
    'admin': [
      [
        {'key': 'Dashboard', 'label': 'Overview'},
        {'key': 'UsersList', 'label': 'Users'},
        {'key': 'ProvidersList', 'label': 'Providers'},
        {'key': 'ServicesList', 'label': 'Services'},
        {'key': 'BookingsList', 'label': 'Bookings'},
      ],
      [
        {'key': 'PaymentsList', 'label': 'Payments'},
        {'key': 'Transactions', 'label': 'Transactions'},
        {'key': 'RevenueReports', 'label': 'Revenue Reports'},
        {'key': 'Receipts', 'label': 'Receipts'},
      ],
      [
        {'key': 'ReviewsList', 'label': 'Reviews'},
        {'key': 'Notifications', 'label': 'Notifications'},
        {'key': 'SupportTickets', 'label': 'Support'},
        {'key': 'ChatSupport', 'label': 'Live Chat'},
      ],
    ],
    'it_support': [
      [
        {'key': 'Dashboard', 'label': 'Overview'},
        {'key': 'SupportTickets', 'label': 'Tickets'},
        {'key': 'Receipts', 'label': 'Receipts'},
        {'key': 'Notifications', 'label': 'Notifications'},
        {'key': 'ChatSupport', 'label': 'Live Chat'},
      ],
    ],
  };

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final me = await api.me();
      final results = await Future.wait([
        api.services(),
        api.bookings(),
        api.payments(),
        api.receipts(),
        api.categories(),
        api.reviews(),
        api.notifications(),
        api.chats(),
      ]);

      final list = results[0] as List<ServiceItem>;
      final bookingsList = results[1] as List<Map<String, dynamic>>;
      final paymentsList = results[2] as List<Map<String, dynamic>>;
      final receiptList = results[3] as List<Map<String, dynamic>>;
      final categoryList = results[4] as List<Map<String, dynamic>>;
      final reviewList = results[5] as List<Map<String, dynamic>>;
      final notificationList = results[6] as List<Map<String, dynamic>>;
      final chatRoomList = results[7] as List<Map<String, dynamic>>;

      List<Map<String, dynamic>> usersList = [];
      if ((me['role'] ?? '') == 'admin') {
        usersList = await api.users();
      }

      List<Map<String, dynamic>> providerList = [];
      if ((me['role'] ?? '') != 'seeker') {
        providerList = await api.users(params: {'role': 'provider', 'exclude_self': 'true'});
        providerList = providerList.where((entry) => entry['is_provider_approved'] == true).toList();
      }

      List<Map<String, dynamic>> messageList = [];
      final roomId = selectedChatRoomId ?? (chatRoomList.isNotEmpty ? chatRoomList.first['id'] as int : null);
      if (roomId != null) {
        messageList = await api.chatMessages(roomId);
      }

      setState(() {
        user = me;
        services = list;
        bookings = bookingsList;
        payments = paymentsList;
        receipts = receiptList;
        categories = categoryList;
        reviews = reviewList;
        notifications = notificationList;
        chatRooms = chatRoomList;
        chatMessages = messageList;
        users = usersList;
        providerOptions = providerList;
        selectedChatRoomId = roomId;
      });
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> makeBooking(ServiceItem service) async {
    final dateText = bookingDateController.text.trim();
    final timeText = bookingTimeController.text.trim();
    final when = (dateText.isNotEmpty && timeText.isNotEmpty)
        ? DateTime.tryParse('${dateText}T$timeText:00')
        : DateTime.now().add(const Duration(hours: 2));
    if (when == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Use valid date and time')));
      return;
    }
    try {
      await api.createBooking(
        serviceId: service.id,
        scheduledAt: when.toIso8601String(),
        notes: bookingNoteController.text.trim().isEmpty ? 'Booked from ServiGo mobile app' : bookingNoteController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booking created for ${service.title}')),
      );
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  Future<void> initiateBookingPayment(int bookingId) async {
    try {
      await api.initiatePayment(bookingId: bookingId, method: 'mpesa', phone: '+255700000000');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment initiated')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> verifyPayment(String txRef) async {
    try {
      await api.verifyPayment(txRef);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment verified and held')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> releasePayment(int paymentId) async {
    try {
      await api.releasePayment(paymentId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment released')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> generateReceipt(int paymentId) async {
    try {
      final receipt = await api.generateReceipt(paymentId);
      if (!mounted) return;
      final number = receipt['receipt_number']?.toString() ?? 'created';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Receipt generated: $number')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> submitReview() async {
    if (selectedReviewBookingId == null) return;
    try {
      await api.createReview({
        'booking': selectedReviewBookingId,
        'rating': reviewRating,
        'comment': reviewComment,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review submitted')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> createProviderService() async {
    if (selectedCategoryId == null) return;
    try {
      await api.createService({
        'title': serviceTitleController.text.trim(),
        'category': selectedCategoryId,
        'description': serviceDescController.text.trim(),
        'price': servicePriceController.text.trim(),
        'duration_minutes': int.tryParse(serviceDurationController.text.trim()) ?? 60,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Service published')));
      serviceTitleController.clear();
      serviceDescController.clear();
      servicePriceController.clear();
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _approveProvider(int userId) async {
    try {
      await api.approveProvider(userId, isProviderApproved: true);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Provider approved')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _updateUserRecord(Map<String, dynamic> entry) async {
    final firstName = TextEditingController(text: '${entry['first_name'] ?? ''}');
    final lastName = TextEditingController(text: '${entry['last_name'] ?? ''}');
    final phone = TextEditingController(text: '${entry['phone'] ?? ''}');
    final location = TextEditingController(text: '${entry['location'] ?? ''}');
    String role = '${entry['role'] ?? 'seeker'}';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              title: const Text('Edit user'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(controller: firstName, decoration: const InputDecoration(labelText: 'First name')),
                    TextField(controller: lastName, decoration: const InputDecoration(labelText: 'Last name')),
                    TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone')),
                    TextField(controller: location, decoration: const InputDecoration(labelText: 'Location')),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: role,
                      items: const [
                        DropdownMenuItem(value: 'seeker', child: Text('Seeker')),
                        DropdownMenuItem(value: 'provider', child: Text('Provider')),
                        DropdownMenuItem(value: 'admin', child: Text('Admin')),
                        DropdownMenuItem(value: 'it_support', child: Text('IT Support')),
                      ],
                      onChanged: (value) => setModalState(() => role = value ?? 'seeker'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
              ],
            );
          },
        );
      },
    );

    if (confirmed != true) return;

    try {
      await api.updateUser(entry['id'] as int, {
        'first_name': firstName.text.trim(),
        'last_name': lastName.text.trim(),
        'phone': phone.text.trim(),
        'location': location.text.trim(),
        'role': role,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User updated')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _deleteUserRecord(Map<String, dynamic> entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete user'),
        content: Text('Delete ${entry['email']}? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await api.deleteUser(entry['id'] as int);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User deleted')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _editServiceRecord(ServiceItem service) async {
    final title = TextEditingController(text: service.title);
    final description = TextEditingController(text: service.description);
    final price = TextEditingController(text: service.price.toStringAsFixed(2));
    final duration = TextEditingController(text: '60');
    int? categoryId = service.categoryId;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              title: const Text('Edit service'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(controller: title, decoration: const InputDecoration(labelText: 'Title')),
                    TextField(controller: description, decoration: const InputDecoration(labelText: 'Description')),
                    TextField(controller: price, decoration: const InputDecoration(labelText: 'Price')),
                    TextField(controller: duration, decoration: const InputDecoration(labelText: 'Duration minutes')),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<int>(
                      value: categoryId,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: categories
                          .map((c) => DropdownMenuItem<int>(value: c['id'] as int, child: Text('${c['name']}')))
                          .toList(),
                      onChanged: (value) => setModalState(() => categoryId = value),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
              ],
            );
          },
        );
      },
    );
    if (confirmed != true) return;

    try {
      await api.updateService(service.id, {
        'title': title.text.trim(),
        'description': description.text.trim(),
        'price': double.tryParse(price.text.trim()) ?? service.price,
        'duration_minutes': int.tryParse(duration.text.trim()) ?? 60,
        'category': categoryId,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Service updated')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _deleteServiceRecord(ServiceItem service) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete service'),
        content: Text('Delete ${service.title}? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await api.deleteService(service.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Service deleted')));
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _toggleServicePublication(ServiceItem service) async {
    try {
      await api.publishService(service.id, publish: !service.isPublished);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(service.isPublished ? 'Service unpublished' : 'Service published')),
      );
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> acceptOrComplete(int bookingId, String status) async {
    try {
      final response = await api.updateBookingStatus(bookingId, status);
      final detail = response['detail']?.toString();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(detail?.isNotEmpty == true ? detail! : 'Booking updated to $status')),
      );
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> sendChat() async {
    if (selectedChatRoomId == null || chatController.text.trim().isEmpty) return;
    try {
      await api.sendChatMessage(selectedChatRoomId!, chatController.text.trim());
      chatController.clear();
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> enableContactExchange() async {
    if (selectedChatRoomId == null) return;
    try {
      await api.exchangeContacts(selectedChatRoomId!);
      await load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  String get sectionLabel {
    final roleGroups = navByRole[user?['role'] ?? 'seeker'] ?? navByRole['seeker']!;
    for (final group in roleGroups) {
      for (final item in group) {
        if (item['key'] == section) return item['label']!;
      }
    }
    return section;
  }

  _PageSlice<T> _paginate<T>(List<T> source, String key) {
    final configuredSize = _pageSizes[key] ?? 10;
    final effectiveSize = configuredSize == -1 ? (source.isEmpty ? 1 : source.length) : configuredSize;
    final totalPages = (source.isEmpty ? 1 : (source.length / effectiveSize).ceil());
    final currentPage = (_pages[key] ?? 1).clamp(1, totalPages);
    final start = (currentPage - 1) * effectiveSize;
    final end = (start + effectiveSize).clamp(0, source.length);
    return _PageSlice<T>(
      items: source.sublist(start, end),
      totalPages: totalPages,
      currentPage: currentPage,
      totalItems: source.length,
      configuredPageSize: configuredSize,
    );
  }

  String _pageSizeLabel(int value) => value == -1 ? 'All' : '$value';

  Widget _pager(String key, _PageSlice<dynamic> data) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        const Text('Items/page'),
        SizedBox(
          width: 95,
          child: DropdownButtonFormField<int>(
            value: data.configuredPageSize,
            decoration: const InputDecoration(isDense: true, border: OutlineInputBorder()),
            items: _itemsPerPageOptions
                .map((value) => DropdownMenuItem<int>(value: value, child: Text(_pageSizeLabel(value))))
                .toList(),
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _pageSizes[key] = value;
                _pages[key] = 1;
              });
            },
          ),
        ),
        OutlinedButton(
          onPressed: data.currentPage <= 1
              ? null
              : () => setState(() => _pages[key] = data.currentPage - 1),
          child: const Text('Prev'),
        ),
        Text('Page ${data.currentPage}/${data.totalPages} (${data.totalItems})'),
        OutlinedButton(
          onPressed: data.currentPage >= data.totalPages
              ? null
              : () => setState(() => _pages[key] = data.currentPage + 1),
          child: const Text('Next'),
        ),
      ],
    );
  }

  Future<void> _openProfileSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${user?['first_name'] ?? ''} ${user?['last_name'] ?? ''}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('${user?['email'] ?? ''}'),
              const SizedBox(height: 4),
              Text('Role: ${user?['role'] ?? ''}'),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        setState(() => section = user?['role'] == 'provider' ? 'ProviderProfile' : 'ProfileSettings');
                      },
                      icon: const Icon(Icons.person_outline),
                      label: const Text('Profile'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        Navigator.pop(context);
                        await api.logout();
                        widget.onLogout();
                      },
                      icon: const Icon(Icons.logout),
                      label: const Text('Logout'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ActionChip(label: const Text('Support'), onPressed: _openSupportSheet),
                  ActionChip(label: const Text('Help'), onPressed: _openHelpSheet),
                  ActionChip(label: const Text('Settings'), onPressed: _openSettingsSheet),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openNotificationsSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) {
        final unread = notifications.where((n) => n['is_read'] != true).length;
        var sheetPageSize = 10;
        var sheetPage = 1;
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final effectiveSize = sheetPageSize == -1 ? (notifications.isEmpty ? 1 : notifications.length) : sheetPageSize;
            final totalPages = notifications.isEmpty ? 1 : (notifications.length / effectiveSize).ceil();
            final currentPage = sheetPage.clamp(1, totalPages);
            final start = (currentPage - 1) * effectiveSize;
            final end = (start + effectiveSize).clamp(0, notifications.length);
            final pagedNotifications = notifications.sublist(start, end);

            return Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Notifications', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                      const Spacer(),
                      Text('$unread unread'),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 260,
                    child: ListView(
                      children: pagedNotifications
                          .map((n) => ListTile(
                                title: Text('${n['title']}'),
                                subtitle: Text('${n['message']}'),
                              ))
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      const Text('Items/page'),
                      SizedBox(
                        width: 95,
                        child: DropdownButtonFormField<int>(
                          value: sheetPageSize,
                          decoration: const InputDecoration(isDense: true, border: OutlineInputBorder()),
                          items: _itemsPerPageOptions
                              .map((value) => DropdownMenuItem<int>(value: value, child: Text(_pageSizeLabel(value))))
                              .toList(),
                          onChanged: (value) {
                            if (value == null) return;
                            setSheetState(() {
                              sheetPageSize = value;
                              sheetPage = 1;
                            });
                          },
                        ),
                      ),
                      OutlinedButton(
                        onPressed: currentPage <= 1
                            ? null
                            : () => setSheetState(() => sheetPage = currentPage - 1),
                        child: const Text('Prev'),
                      ),
                      Text('Page $currentPage/$totalPages (${notifications.length})'),
                      OutlinedButton(
                        onPressed: currentPage >= totalPages
                            ? null
                            : () => setSheetState(() => sheetPage = currentPage + 1),
                        child: const Text('Next'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            Navigator.pop(context);
                            await api.markAllNotificationsRead();
                            await load();
                          },
                          icon: const Icon(Icons.done_all),
                          label: const Text('Mark all as read'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            setState(() => section = 'Notifications');
                          },
                          icon: const Icon(Icons.open_in_new),
                          label: const Text('Open'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () async {
                      Navigator.pop(context);
                      await api.clearNotifications();
                      await load();
                    },
                    icon: const Icon(Icons.clear_all),
                    label: const Text('Clear notifications'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openSupportSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Support', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('Email: $supportEmail'),
              Text('Phone: $supportPhone'),
              const SizedBox(height: 12),
              const Text('Support keeps admin aware of account, booking, payment, and approval issues.'),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openHelpSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (context) {
        return const Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Help', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              SizedBox(height: 8),
              Text('Use ServiGo to book services, manage payments, follow notifications, and chat live.'),
              SizedBox(height: 8),
              Text('Email: mndolwa26@gmail.com'),
              Text('Phone: +255 786 225 687'),
              SizedBox(height: 8),
              Text('Providers wait for approval before publishing services.'),
              SizedBox(height: 8),
              Text('Bookings can be cancelled early or redirected if needed. Admin is notified for every major change.'),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openSettingsSheet() async {
    final themeMode = ValueNotifier<Brightness>(Theme.of(context).brightness);
    final language = ValueNotifier<String>('en');
    await showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Settings', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              ValueListenableBuilder<Brightness>(
                valueListenable: themeMode,
                builder: (_, value, __) {
                  return DropdownButtonFormField<Brightness>(
                    value: value,
                    items: const [
                      DropdownMenuItem(value: Brightness.light, child: Text('Light theme')),
                      DropdownMenuItem(value: Brightness.dark, child: Text('Dark theme')),
                    ],
                    onChanged: (newValue) => themeMode.value = newValue ?? Brightness.light,
                    decoration: const InputDecoration(labelText: 'Theme'),
                  );
                },
              ),
              const SizedBox(height: 10),
              ValueListenableBuilder<String>(
                valueListenable: language,
                builder: (_, value, __) {
                  return DropdownButtonFormField<String>(
                    value: value,
                    items: const [
                      DropdownMenuItem(value: 'en', child: Text('English')),
                      DropdownMenuItem(value: 'sw', child: Text('Swahili')),
                    ],
                    onChanged: (newValue) => language.value = newValue ?? 'en',
                    decoration: const InputDecoration(labelText: 'Language'),
                  );
                },
              ),
              const SizedBox(height: 12),
              const Text('Theme and language preferences are kept inside the app shell for now.'),
            ],
          ),
        );
      },
    );
  }

  List<Map<String, String>> _groupTitlesForRole(String role) {
    if (role == 'admin') {
      return [
        {'title': 'Management'},
        {'title': 'Finance'},
        {'title': 'System'},
      ];
    }
    if (role == 'provider') {
      return [
        {'title': 'Operations'},
        {'title': 'Business'},
      ];
    }
    if (role == 'it_support') {
      return [
        {'title': 'Support'},
      ];
    }
    return [
      {'title': 'Workspace'},
      {'title': 'Engagement'},
    ];
  }

  Widget _buildDrawer() {
    final role = user?['role'] ?? 'seeker';
    final groups = navByRole[role] ?? navByRole['seeker']!;
    final titles = _groupTitlesForRole(role);
    return Drawer(
      child: Container(
        color: const Color(0xFF1F3F5F),
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(12),
            children: [
              const Text('ServiGo', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(
                '${user?['first_name'] ?? ''} ${user?['last_name'] ?? ''}',
                style: const TextStyle(color: Color(0xFFD5E0EE)),
              ),
              Text(
                '${user?['role'] ?? ''}',
                style: const TextStyle(color: Color(0xFFD5E0EE)),
              ),
              const SizedBox(height: 14),
              for (var i = 0; i < groups.length; i++)
                Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2A4E72),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      initiallyExpanded: true,
                      title: Text(
                        titles[i]['title']!,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                      ),
                      iconColor: Colors.white,
                      collapsedIconColor: Colors.white,
                      children: [
                        for (final item in groups[i])
                          ListTile(
                            dense: true,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            tileColor: section == item['key'] ? Colors.white : Colors.transparent,
                            title: Text(
                              item['label']!,
                              style: TextStyle(
                                color: section == item['key'] ? const Color(0xFF1F3F5F) : const Color(0xFFDCE8F4),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            onTap: () {
                              Navigator.pop(context);
                              setState(() => section = item['key']!);
                            },
                          ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionIntro() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(sectionLabel, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
            const SizedBox(height: 4),
            const Text('Use grouped modules to manage services, bookings, payments, notifications, and live chat.'),
          ],
        ),
      ),
    );
  }

  Widget _dashboardCard({required String title, required String subtitle, required String targetSection, required Color accent}) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => setState(() => section = targetSection),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: LinearGradient(
            colors: [accent.withOpacity(0.12), Colors.white],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(color: accent.withOpacity(0.18)),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: accent.withOpacity(0.14), borderRadius: BorderRadius.circular(999)),
              child: const Text('Open section', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
            const SizedBox(height: 6),
            Text(subtitle, style: const TextStyle(color: Color(0xFF6A7A8B))),
          ],
        ),
      ),
    );
  }

  Widget _dashboardHub() {
    final role = user?['role'] ?? 'seeker';
    final cards = switch (role) {
      'provider' => [
        ('My Services', 'See your own services and jump to the add service form.', 'MyServices', const Color(0xFF1F8A70)),
        ('Add Service', 'Create a new listing from a separate quick entry point.', 'AddService', const Color(0xFF9C3B57)),
        ('Services', 'Browse the marketplace and compare services.', 'ServicesList', const Color(0xFF6B7D8D)),
        ('Bookings', 'Manage incoming, active, and completed jobs.', 'BookingsList', const Color(0xFFD9A11A)),
        ('Payments', 'Review earnings and payment flow.', 'PaymentsList', const Color(0xFF1F3F5F)),
        ('Receipts', 'Open generated receipts without extra scrolling.', 'Receipts', const Color(0xFFE48A00)),
        ('Notifications', 'Scan recent alerts and updates.', 'Notifications', const Color(0xFF6B7D8D)),
        ('Live Chat', 'Continue chats and exchange contacts when allowed.', 'ChatSupport', const Color(0xFFCA6E13)),
      ],
      'admin' => [
        ('Users', 'Open the user directory and approvals.', 'UsersList', const Color(0xFF1F8A70)),
        ('Services', 'Manage marketplace listings.', 'ServicesList', const Color(0xFFD9A11A)),
        ('Bookings', 'Track booking status across the platform.', 'BookingsList', const Color(0xFF1F3F5F)),
        ('Payments', 'Review payments and payouts.', 'PaymentsList', const Color(0xFF9C3B57)),
        ('Receipts', 'Open all generated receipts.', 'Receipts', const Color(0xFFE48A00)),
        ('Support', 'Jump into tickets and chat.', 'SupportTickets', const Color(0xFF6B7D8D)),
        ('Settings', 'Adjust system settings and themes.', 'SystemSettings', const Color(0xFFCA6E13)),
      ],
      'it_support' => [
        ('Support', 'Open support tickets and active cases.', 'SupportTickets', const Color(0xFFD9A11A)),
        ('Receipts', 'Review receipts for payment proof.', 'Receipts', const Color(0xFFE48A00)),
        ('Notifications', 'Check recent platform events.', 'Notifications', const Color(0xFF1F3F5F)),
        ('Live Chat', 'Respond to support conversations.', 'ChatSupport', const Color(0xFFCA6E13)),
      ],
      _ => [
        ('Discover Services', 'Browse highlighted service categories and recent matches.', 'ServicesList', const Color(0xFF1F8A70)),
        ('Services', 'Open the full marketplace.', 'ServicesList', const Color(0xFF6B7D8D)),
        ('Bookings', 'Manage bookings and status updates.', 'BookingsList', const Color(0xFFD9A11A)),
        ('Payments', 'Initiate payments and verify releases.', 'PaymentsList', const Color(0xFF1F3F5F)),
        ('Receipts', 'Open generated receipts anytime.', 'Receipts', const Color(0xFFE48A00)),
        ('Reviews', 'Submit and review feedback.', 'ReviewsList', const Color(0xFF9C3B57)),
        ('Notifications', 'Read updates without extra scrolling.', 'Notifications', const Color(0xFF6B7D8D)),
        ('Live Chat', 'Open the chat room and continue conversations.', 'ChatSupport', const Color(0xFFCA6E13)),
      ],
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Dashboard', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
            const SizedBox(height: 6),
            const Text('Use the cards below to jump into each section. Content stays hidden until you choose it.'),
            const SizedBox(height: 12),
            GridView.count(
              shrinkWrap: true,
              crossAxisCount: MediaQuery.of(context).size.width > 700 ? 2 : 1,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.8,
              children: cards
                  .map((card) => _dashboardCard(
                        title: card.$1,
                        subtitle: card.$2,
                        targetSection: card.$3,
                        accent: card.$4,
                      ))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _servicesPanel() {
    final visibleServices = section == 'MyServices'
        ? services.where((s) => s.providerId == user?['id']).toList()
        : services;
    final servicesPage = _paginate<ServiceItem>(visibleServices, 'services');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Services Marketplace', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
            const SizedBox(height: 10),
            TextFormField(
              controller: bookingDateController,
              decoration: const InputDecoration(labelText: 'Booking date (YYYY-MM-DD)'),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: bookingTimeController,
              decoration: const InputDecoration(labelText: 'Booking time (HH:mm)'),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: bookingNoteController,
              decoration: const InputDecoration(labelText: 'Booking note'),
            ),
            const SizedBox(height: 10),
            ...servicesPage.items.map((service) {
              return Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(service.title, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF1F3F5F))),
                            const SizedBox(height: 4),
                            Text('${service.providerName} • ${service.providerLocation}'),
                            const SizedBox(height: 3),
                            Text(service.description),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      ConstrainedBox(
                            constraints: BoxConstraints(
                              minWidth: 96,
                              maxWidth: user?['role'] == 'admin' ? 140 : 100,
                            ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('\$${service.price.toStringAsFixed(2)}'),
                            const SizedBox(height: 6),
                            SizedBox(
                              width: double.infinity,
                              child: Column(
                                children: [
                                  if (user?['role'] == 'seeker')
                                    ElevatedButton(
                                      onPressed: () => makeBooking(service),
                                      child: const Text('Book'),
                                    ),
                                  if (user?['role'] == 'admin') ...[
                                    OutlinedButton(
                                      onPressed: () => _toggleServicePublication(service),
                                      child: Text(service.isPublished ? 'Unpublish' : 'Publish'),
                                    ),
                                    OutlinedButton(
                                      onPressed: () => _editServiceRecord(service),
                                      child: const Text('Edit'),
                                    ),
                                    OutlinedButton(
                                      onPressed: () => _deleteServiceRecord(service),
                                      child: const Text('Delete'),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 8),
            _pager('services', servicesPage),
          ],
        ),
      ),
    );
  }

  Widget _myServicesPanel() {
    final providerId = user?['id'];
    final providerOwned = services.where((service) => service.providerId == providerId).toList();
    final published = providerOwned.where((service) => service.isPublished).length;
    final pending = providerOwned.length - published;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(child: Text('My Services', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F)))),
                TextButton(onPressed: () => setState(() => section = 'AddService'), child: const Text('Add Service')),
              ],
            ),
            Text('Total: ${providerOwned.length} • Published: $published • Pending: $pending'),
            const SizedBox(height: 10),
            ...providerOwned.map((service) {
              return Card(
                child: ListTile(
                  title: Text(service.title),
                  subtitle: Text('${service.description}\n${service.isPublished ? 'Published' : 'Pending review'}'),
                  isThreeLine: true,
                  trailing: Text('\$${service.price.toStringAsFixed(2)}'),
                  onTap: () => setState(() => section = 'ServicesList'),
                ),
              );
            }),
            if (providerOwned.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('No services yet. Open Add Service to create your first listing.'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _bookingsPanel() {
    final filteredBookings = switch (section) {
      'IncomingRequests' => bookings.where((b) => b['status'] == 'pending').toList(),
      'AcceptedJobs' => bookings.where((b) => b['status'] == 'accepted' || b['status'] == 'in_progress').toList(),
      'CompletedJobs' => bookings.where((b) => b['status'] == 'completed').toList(),
      _ => bookings,
    };
    final bookingsPage = _paginate<Map<String, dynamic>>(filteredBookings, 'bookings');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Bookings', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
            const SizedBox(height: 8),
            ...bookingsPage.items.map((booking) {
              return Card(
                child: ListTile(
                  title: Text('#${booking['id']} - ${booking['service_title']}'),
                  subtitle: Text('${booking['status']} • ${booking['scheduled_at']}'),
                  trailing: Wrap(
                    spacing: 6,
                    children: [
                      if (user?['role'] == 'seeker' && (booking['status'] == 'pending' || booking['status'] == 'accepted' || booking['status'] == 'in_progress'))
                        OutlinedButton(
                          onPressed: () => acceptOrComplete(booking['id'] as int, 'cancelled'),
                          child: const Text('Cancel'),
                        ),
                      if (user?['role'] == 'seeker' && (booking['status'] == 'pending' || booking['status'] == 'accepted'))
                        ElevatedButton(
                          onPressed: () => initiateBookingPayment(booking['id'] as int),
                          child: const Text('Pay'),
                        ),
                      if ((user?['role'] == 'provider' || user?['role'] == 'admin') && booking['status'] == 'pending')
                        ElevatedButton(
                          onPressed: () => acceptOrComplete(booking['id'] as int, 'accepted'),
                          child: const Text('Accept'),
                        ),
                      if ((user?['role'] == 'provider' || user?['role'] == 'admin') && booking['status'] == 'accepted')
                        ElevatedButton(
                          onPressed: () => acceptOrComplete(booking['id'] as int, 'completed'),
                          child: const Text('Complete'),
                        ),
                      if ((user?['role'] == 'provider' || user?['role'] == 'admin') && providerOptions.isNotEmpty)
                        SizedBox(
                          width: 180,
                          child: DropdownButtonFormField<int>(
                            decoration: const InputDecoration(labelText: 'Redirect'),
                            items: providerOptions
                                .where((entry) => entry['id'] != user?['id'])
                                .map((entry) => DropdownMenuItem<int>(
                                      value: entry['id'] as int,
                                      child: Text('${entry['first_name'] ?? entry['email']}'),
                                    ))
                                .toList(),
                            onChanged: (value) async {
                              if (value == null) return;
                              try {
                                await api.redirectBooking(booking['id'] as int, value);
                                await load();
                              } catch (e) {
                                if (!mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                              }
                            },
                          ),
                        ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 8),
            _pager('bookings', bookingsPage),
          ],
        ),
      ),
    );
  }

  Widget _paymentsPanel() {
    final paymentsPage = _paginate<Map<String, dynamic>>(payments, 'payments');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Payments', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
            const SizedBox(height: 10),
            if (user?['role'] == 'seeker') ...[
              DropdownButtonFormField<int>(
                value: selectedBookingId,
                decoration: const InputDecoration(labelText: 'Select booking'),
                items: bookings
                    .map((b) => DropdownMenuItem<int>(value: b['id'] as int, child: Text('#${b['id']} - ${b['service_title']}')))
                    .toList(),
                onChanged: (v) => setState(() => selectedBookingId = v),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: paymentMethod,
                decoration: const InputDecoration(labelText: 'Payment method'),
                items: const [
                  DropdownMenuItem(value: 'mpesa', child: Text('M-Pesa')),
                  DropdownMenuItem(value: 'airtel', child: Text('Airtel Money')),
                  DropdownMenuItem(value: 'tigo', child: Text('Tigo Pesa')),
                  DropdownMenuItem(value: 'card', child: Text('Card')),
                ],
                onChanged: (v) => setState(() => paymentMethod = v ?? 'mpesa'),
              ),
              const SizedBox(height: 8),
              TextFormField(controller: paymentPhoneController, decoration: const InputDecoration(labelText: 'Payer phone')),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: selectedBookingId == null
                    ? null
                    : () async {
                        await api.initiatePayment(
                          bookingId: selectedBookingId!,
                          method: paymentMethod,
                          phone: paymentPhoneController.text.trim(),
                        );
                        await load();
                      },
                child: const Text('Initiate payment'),
              ),
              const SizedBox(height: 10),
            ],
            ...paymentsPage.items.map((payment) {
              final status = payment['status']?.toString() ?? '';
              final txRef = payment['transaction_reference']?.toString() ?? '';
              return Card(
                child: ListTile(
                  title: Text('Booking #${payment['booking']}'),
                  subtitle: Text('${payment['method']} • $status'),
                  trailing: Wrap(
                    spacing: 6,
                    children: [
                      if (status == 'pending')
                        ElevatedButton(
                          onPressed: txRef.isNotEmpty ? () => verifyPayment(txRef) : null,
                          child: const Text('Verify'),
                        ),
                      if (status == 'held')
                        ElevatedButton(
                          onPressed: () => releasePayment(payment['id'] as int),
                          child: const Text('Release'),
                        ),
                      if (status == 'released')
                        OutlinedButton(
                          onPressed: () => generateReceipt(payment['id'] as int),
                          child: const Text('Receipt'),
                        ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 8),
            _pager('payments', paymentsPage),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: () => setState(() => section = 'Receipts'),
                child: const Text('View receipts'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _reviewsPanel() {
    final completed = bookings.where((b) => b['status'] == 'completed').toList();
    final reviewsPage = _paginate<Map<String, dynamic>>(reviews, 'reviews');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Reviews', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
            const SizedBox(height: 8),
            if (user?['role'] == 'seeker') ...[
              DropdownButtonFormField<int>(
                value: selectedReviewBookingId,
                decoration: const InputDecoration(labelText: 'Completed booking'),
                items: completed
                    .map((b) => DropdownMenuItem<int>(value: b['id'] as int, child: Text('#${b['id']} - ${b['service_title']}')))
                    .toList(),
                onChanged: (v) => setState(() => selectedReviewBookingId = v),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<int>(
                value: reviewRating,
                decoration: const InputDecoration(labelText: 'Rating'),
                items: [1, 2, 3, 4, 5].map((r) => DropdownMenuItem(value: r, child: Text('$r'))).toList(),
                onChanged: (v) => setState(() => reviewRating = v ?? 5),
              ),
              const SizedBox(height: 8),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Comment'),
                onChanged: (v) => reviewComment = v,
              ),
              const SizedBox(height: 8),
              ElevatedButton(onPressed: submitReview, child: const Text('Submit review')),
              const Divider(),
            ],
            ...reviewsPage.items.map((r) => ListTile(title: Text('${r['rating']}/5'), subtitle: Text('${r['comment'] ?? ''}'))),
            const SizedBox(height: 8),
            _pager('reviews', reviewsPage),
          ],
        ),
      ),
    );
  }

  Widget _notificationsPanel() {
    final notificationsPage = _paginate<Map<String, dynamic>>(notifications, 'notifications');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Notifications', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
                Wrap(
                  spacing: 8,
                  children: [
                    TextButton(
                      onPressed: () async {
                        await api.markAllNotificationsRead();
                        await load();
                      },
                      child: const Text('Mark all read'),
                    ),
                    TextButton(
                      onPressed: () async {
                        await api.clearNotifications();
                        await load();
                      },
                      child: const Text('Clear all'),
                    ),
                  ],
                ),
              ],
            ),
            ...notificationsPage.items.map((n) => ListTile(title: Text('${n['title']}'), subtitle: Text('${n['message']}'))),
            const SizedBox(height: 8),
            _pager('notifications', notificationsPage),
          ],
        ),
      ),
    );
  }

  Widget _chatPanel() {
    final activeRoom = chatRooms.where((r) => r['id'] == selectedChatRoomId).cast<Map<String, dynamic>>().firstOrNull;
    final chatMessagesPage = _paginate<Map<String, dynamic>>(chatMessages, 'chatMessages');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Live Chat', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
            const SizedBox(height: 8),
            DropdownButtonFormField<int>(
              value: selectedChatRoomId,
              decoration: const InputDecoration(labelText: 'Chat room'),
              items: chatRooms
                  .map((room) => DropdownMenuItem<int>(value: room['id'] as int, child: Text('Booking #${room['booking_id']}')))
                  .toList(),
              onChanged: (v) async {
                setState(() => selectedChatRoomId = v);
                await load();
              },
            ),
            const SizedBox(height: 8),
            Container(
              constraints: const BoxConstraints(maxHeight: 260),
              child: ListView(
                shrinkWrap: true,
                children: chatMessagesPage.items
                    .map((m) => ListTile(
                          title: Text('${m['sender_name']}'),
                          subtitle: Text('${m['message']}'),
                        ))
                    .toList(),
              ),
            ),
            const SizedBox(height: 8),
            _pager('chatMessages', chatMessagesPage),
            if (activeRoom != null && activeRoom['contact_exchange_allowed'] == true) ...[
              const SizedBox(height: 8),
              Text('Seeker: ${activeRoom['seeker_phone']} | ${activeRoom['seeker_email']}'),
              Text('Provider: ${activeRoom['provider_phone']} | ${activeRoom['provider_email']}'),
            ],
            const SizedBox(height: 8),
            TextFormField(controller: chatController, decoration: const InputDecoration(labelText: 'Type a message')),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                ElevatedButton(onPressed: sendChat, child: const Text('Send')),
                if (activeRoom != null && activeRoom['contact_exchange_allowed'] != true)
                  OutlinedButton(onPressed: enableContactExchange, child: const Text('Exchange contacts')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _addServicePanel() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(child: Text('Add Service', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F)))),
                TextButton(onPressed: () => setState(() => section = 'MyServices'), child: const Text('My Services')),
              ],
            ),
            const SizedBox(height: 8),
            TextFormField(controller: serviceTitleController, decoration: const InputDecoration(labelText: 'Title')),
            const SizedBox(height: 8),
            DropdownButtonFormField<int>(
              value: selectedCategoryId,
              decoration: const InputDecoration(labelText: 'Category'),
              items: categories
                  .map((c) => DropdownMenuItem<int>(value: c['id'] as int, child: Text('${c['name']}')))
                  .toList(),
              onChanged: (v) => setState(() => selectedCategoryId = v),
            ),
            const SizedBox(height: 8),
            TextFormField(controller: serviceDescController, decoration: const InputDecoration(labelText: 'Description')),
            const SizedBox(height: 8),
            TextFormField(controller: servicePriceController, decoration: const InputDecoration(labelText: 'Price'), keyboardType: TextInputType.number),
            const SizedBox(height: 8),
            TextFormField(controller: serviceDurationController, decoration: const InputDecoration(labelText: 'Duration minutes'), keyboardType: TextInputType.number),
            const SizedBox(height: 8),
            ElevatedButton(onPressed: createProviderService, child: const Text('Publish')),
          ],
        ),
      ),
    );
  }

  Widget _receiptsPanel() {
    final receiptsPage = _paginate<Map<String, dynamic>>(receipts, 'receipts');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(child: Text('Receipts', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F)))),
                TextButton(onPressed: () => setState(() => section = 'PaymentsList'), child: const Text('Back to Payments')),
              ],
            ),
            const SizedBox(height: 8),
            ...receiptsPage.items.map((receipt) {
              return Card(
                child: ListTile(
                  title: Text('${receipt['receipt_number']}'),
                  subtitle: Text('Booking #${receipt['booking_id']} • ${receipt['service_title']}\n${receipt['payment_method']} • ${receipt['payment_status']}'),
                  trailing: Text('\$${receipt['payment_amount']}'),
                ),
              );
            }),
            if (receiptsPage.items.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('No receipts yet. Generate a receipt from a released payment to see it here.'),
              ),
            const SizedBox(height: 8),
            _pager('receipts', receiptsPage),
          ],
        ),
      ),
    );
  }

  Widget _adminUsersPanel() {
    final usersSource = section == 'ProvidersList'
        ? users.where((entry) => '${entry['role']}' == 'provider').toList()
        : users;
    final usersPage = _paginate<Map<String, dynamic>>(usersSource, 'users');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Users', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
            const SizedBox(height: 8),
            ...usersPage.items.map((u) => ListTile(
                  title: Text('${u['first_name']} ${u['last_name']}'),
                  subtitle: Text('${u['email']} • ${u['role']} • ${u['is_active'] == true ? 'Active' : 'Inactive'}'),
                  trailing: Wrap(
                    spacing: 6,
                    children: [
                      if ('${u['role']}' == 'provider' && u['is_provider_approved'] != true)
                        OutlinedButton(
                          onPressed: () => _approveProvider(u['id'] as int),
                          child: const Text('Approve'),
                        ),
                      OutlinedButton(
                        onPressed: () => _updateUserRecord(u),
                        child: const Text('Edit'),
                      ),
                      OutlinedButton(
                        onPressed: () => _deleteUserRecord(u),
                        child: const Text('Delete'),
                      ),
                    ],
                  ),
                )),
            const SizedBox(height: 8),
            _pager('users', usersPage),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildSectionCards() {
    if ((user?['role'] ?? '') == 'provider' && (user?['is_provider_approved'] != true)) {
      return [
        _sectionIntro(),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Approval In Progress', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF1F3F5F))),
                SizedBox(height: 8),
                Text('Your provider account is under admin review. You can update your profile while waiting for approval.'),
              ],
            ),
          ),
        ),
      ];
    }

    if ({'Dashboard', 'ProviderDashboard'}.contains(section)) {
      return [
        _dashboardHub(),
      ];
    }

    final widgets = <Widget>[_sectionIntro()];

    if ({'ServicesList'}.contains(section)) {
      widgets.add(_servicesPanel());
    }
    if ({
      'BookingsList',
      'BookingDetails',
      'UpdateBookingStatus',
      'IncomingRequests',
      'AcceptedJobs',
      'CompletedJobs'
    }.contains(section)) {
      widgets.add(_bookingsPanel());
    }
    if ({'PaymentsList', 'Transactions', 'RevenueReports'}.contains(section)) {
      widgets.add(_paymentsPanel());
    }
    if ({'Receipts'}.contains(section)) {
      widgets.add(_receiptsPanel());
    }
    if ({'ReviewsList'}.contains(section)) {
      widgets.add(_reviewsPanel());
    }
    if ({'Notifications', 'SupportTickets'}.contains(section)) {
      widgets.add(_notificationsPanel());
    }
    if ({'ChatSupport'}.contains(section)) {
      widgets.add(_chatPanel());
    }
    if ({'MyServices'}.contains(section)) {
      widgets.add(_myServicesPanel());
    }
    if ({'AddService', 'EditService'}.contains(section)) {
      widgets.add(_addServicePanel());
    }
    if ({'UsersList', 'ProvidersList'}.contains(section) && (user?['role'] == 'admin')) {
      widgets.add(_adminUsersPanel());
    }
    return widgets;
  }

  @override
  void dispose() {
    bookingDateController.dispose();
    bookingTimeController.dispose();
    bookingNoteController.dispose();
    paymentPhoneController.dispose();
    chatController.dispose();
    serviceTitleController.dispose();
    serviceDescController.dispose();
    servicePriceController.dispose();
    serviceDurationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      drawer: _buildDrawer(),
      appBar: AppBar(
        title: InkWell(
          onTap: () => setState(() => section = 'Dashboard'),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Image(image: AssetImage('assets/images/logo.png'), width: 26, height: 26),
              const SizedBox(width: 8),
              Text('ServiGo • $sectionLabel'),
            ],
          ),
        ),
        actions: [
          Stack(
            alignment: Alignment.topRight,
            children: [
              IconButton(
                onPressed: _openNotificationsSheet,
                icon: const Icon(Icons.notifications_none),
              ),
              if (notifications.where((n) => n['is_read'] != true).isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(top: 8, right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(color: Colors.red.shade600, borderRadius: BorderRadius.circular(12)),
                  child: Text(
                    '${notifications.where((n) => n['is_read'] != true).length}',
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                  ),
                ),
            ],
          ),
          IconButton(
            onPressed: _openProfileSheet,
            icon: const Icon(Icons.account_circle_outlined),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.all(14),
          children: [
            if (user != null)
              Card(
                child: ListTile(
                  leading: const CircleAvatar(backgroundColor: Color(0xFF1F3F5F), child: Icon(Icons.person, color: Colors.white)),
                  title: Text('${user!['first_name']} ${user!['last_name']}'),
                  subtitle: Text('${user!['role']} | ${user!['location']}'),
                ),
              ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(error!, style: const TextStyle(color: Colors.red)),
              ),
            ..._buildSectionCards(),
            const SizedBox(height: 8),
            const Center(
              child: Text(
                'ServiGo workspace • secure bookings, communication, and payouts',
                style: TextStyle(color: Color(0xFF6A7A8B)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
