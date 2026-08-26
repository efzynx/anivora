class ContentModel {
  final String id;
  final String title;
  final String slug;
  final String posterUrl;
  final String bannerUrl;
  final String synopsis;

  ContentModel({
    required this.id,
    required this.title,
    required this.slug,
    required this.posterUrl,
    required this.bannerUrl,
    required this.synopsis,
  });

  factory ContentModel.fromJson(Map<String, dynamic> json) {
    return ContentModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      slug: json['slug'] ?? '',
      posterUrl: json['posterUrl'] ?? '',
      bannerUrl: json['bannerUrl'] ?? '',
      synopsis: json['synopsis'] ?? '',
    );
  }
}

class LatestEpisodeModel {
  final String id;
  final String contentId;
  final String contentTitle;
  final int episodeNumber;
  final String title;
  final String thumbnailUrl;
  final String posterUrl;

  LatestEpisodeModel({
    required this.id,
    required this.contentId,
    required this.contentTitle,
    required this.episodeNumber,
    required this.title,
    required this.thumbnailUrl,
    required this.posterUrl,
  });

  factory LatestEpisodeModel.fromJson(Map<String, dynamic> json) {
    return LatestEpisodeModel(
      id: json['id'] ?? '',
      contentId: json['contentId'] ?? '',
      contentTitle: json['contentTitle'] ?? '',
      episodeNumber: json['episodeNumber'] ?? 0,
      title: json['title'] ?? '',
      thumbnailUrl: json['thumbnailUrl'] ?? '',
      posterUrl: json['posterUrl'] ?? '',
    );
  }
}

class HomeFeedModel {
  final List<ContentModel> hero;
  final List<ContentModel> popularDonghua;
  final List<LatestEpisodeModel> latestEpisodes;
  final List<ContentModel> allContent;

  HomeFeedModel({
    required this.hero,
    required this.popularDonghua,
    required this.latestEpisodes,
    required this.allContent,
  });

  factory HomeFeedModel.fromJson(Map<String, dynamic> json) {
    return HomeFeedModel(
      hero: (json['hero'] as List?)?.map((e) => ContentModel.fromJson(e)).toList() ?? [],
      popularDonghua: (json['popularDonghua'] as List?)?.map((e) => ContentModel.fromJson(e)).toList() ?? [],
      latestEpisodes: (json['latestEpisodes'] as List?)?.map((e) => LatestEpisodeModel.fromJson(e)).toList() ?? [],
      allContent: (json['allContent'] as List?)?.map((e) => ContentModel.fromJson(e)).toList() ?? [],
    );
  }
}
