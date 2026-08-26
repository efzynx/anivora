import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/detail_model.dart';
import 'home_provider.dart';

final contentDetailProvider = FutureProvider.family<ContentDetailModel, String>((ref, id) async {
  final apiClient = ref.watch(apiClientProvider);
  final data = await apiClient.getContentDetail(id);
  return ContentDetailModel.fromJson(data);
});

final episodesProvider = FutureProvider.family<List<EpisodeModel>, String>((ref, contentId) async {
  final apiClient = ref.watch(apiClientProvider);
  final data = await apiClient.getEpisodes(contentId);
  return data.map((e) => EpisodeModel.fromJson(e as Map<String, dynamic>)).toList();
});
