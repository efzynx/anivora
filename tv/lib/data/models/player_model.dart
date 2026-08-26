class ResolvedStreamModel {
  final String streamUrl;
  final String serverName;
  final String quality;
  final bool isHls;

  ResolvedStreamModel({
    required this.streamUrl,
    required this.serverName,
    required this.quality,
    required this.isHls,
  });

  factory ResolvedStreamModel.fromJson(Map<String, dynamic> json) {
    return ResolvedStreamModel(
      streamUrl: json['streamUrl'] ?? '',
      serverName: json['serverName'] ?? '',
      quality: json['quality'] ?? '',
      isHls: json['isHls'] ?? false,
    );
  }
}

class PlaybackSourceModel {
  final String episodeId;
  final String contentId;
  final ResolvedStreamModel? selectedSource;
  final List<ResolvedStreamModel> alternativeSources;
  final int resumePositionSeconds;

  PlaybackSourceModel({
    required this.episodeId,
    required this.contentId,
    this.selectedSource,
    required this.alternativeSources,
    required this.resumePositionSeconds,
  });

  factory PlaybackSourceModel.fromJson(Map<String, dynamic> json) {
    return PlaybackSourceModel(
      episodeId: json['episodeId'] ?? '',
      contentId: json['contentId'] ?? '',
      selectedSource: json['selectedSource'] != null 
          ? ResolvedStreamModel.fromJson(json['selectedSource']) 
          : null,
      alternativeSources: (json['alternativeSources'] as List?)
          ?.map((e) => ResolvedStreamModel.fromJson(e))
          .toList() ?? [],
      resumePositionSeconds: json['resumePositionSeconds'] ?? 0,
    );
  }
}
