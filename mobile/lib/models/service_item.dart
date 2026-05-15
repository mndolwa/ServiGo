class ServiceItem {
  final int id;
  final int? providerId;
  final String title;
  final String description;
  final double price;
  final String providerName;
  final String providerLocation;
  final bool isPublished;
  final int? categoryId;

  ServiceItem({
    required this.id,
    this.providerId,
    required this.title,
    required this.description,
    required this.price,
    required this.providerName,
    required this.providerLocation,
    this.isPublished = true,
    this.categoryId,
  });

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: json['id'],
      providerId: json['provider'] is int ? json['provider'] as int : int.tryParse(json['provider']?.toString() ?? ''),
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      price: double.tryParse(json['price'].toString()) ?? 0,
      providerName: json['provider_name'] ?? 'Provider',
      providerLocation: json['provider_location'] ?? 'Unknown',
      isPublished: json['is_published'] == true,
      categoryId: json['category'] is int ? json['category'] as int : int.tryParse(json['category']?.toString() ?? ''),
    );
  }
}
