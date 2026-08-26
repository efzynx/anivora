import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../models/content_model.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

final homeFeedProvider = FutureProvider<HomeFeedModel>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final data = await apiClient.getHomeFeed();
  return HomeFeedModel.fromJson(data);
});
