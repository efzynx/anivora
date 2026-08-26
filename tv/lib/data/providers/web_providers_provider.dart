import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'home_provider.dart';

final webProviderFeedProvider = FutureProvider.family<dynamic, String>((ref, path) async {
  final apiClient = ref.watch(apiClientProvider);
  final data = await apiClient.getWebProviderPath(path);
  return data;
});
