import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/player_model.dart';
import 'home_provider.dart';

final playbackSourceProvider = FutureProvider.family<PlaybackSourceModel, String>((ref, episodeId) async {
  final apiClient = ref.watch(apiClientProvider);
  final data = await apiClient.resolvePlayback(episodeId);
  return PlaybackSourceModel.fromJson(data);
});
