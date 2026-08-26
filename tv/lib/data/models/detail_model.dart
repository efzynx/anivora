class EpisodeModel {
  final String id;
  final String contentId;
  final int episodeNumber;
  final String title;
  final String thumbnailUrl;
  final String episodeUrl;

  EpisodeModel({
    required this.id,
    required this.contentId,
    required this.episodeNumber,
    required this.title,
    required this.thumbnailUrl,
    required this.episodeUrl,
  });

  factory EpisodeModel.fromJson(Map<String, dynamic> json) {
    return EpisodeModel(
      id: json['id'] ?? '',
      contentId: json['contentId'] ?? '',
      episodeNumber: json['episodeNumber'] ?? 0,
      title: json['title'] ?? '',
      thumbnailUrl: json['thumbnailUrl'] ?? '',
      episodeUrl: json['episodeUrl'] ?? '',
    );
  }
}

class GenreModel {
  final String id;
  final String name;

  GenreModel({required this.id, required this.name});

  factory GenreModel.fromJson(Map<String, dynamic> json) {
    return GenreModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
    );
  }
}

class ContentDetailModel {
  final String id;
  final String slug;
  final String title;
  final String nativeTitle;
  final String synopsis;
  final String posterUrl;
  final String bannerUrl;
  final double rating;
  final String status;
  final String studio;
  final List<GenreModel> genres;

  ContentDetailModel({
    required this.id,
    required this.slug,
    required this.title,
    required this.nativeTitle,
    required this.synopsis,
    required this.posterUrl,
    required this.bannerUrl,
    required this.rating,
    required this.status,
    required this.studio,
    required this.genres,
  });

  factory ContentDetailModel.fromJson(Map<String, dynamic> json) {
    return ContentDetailModel(
      id: json['id'] ?? '',
      slug: json['slug'] ?? '',
      title: json['title'] ?? '',
      nativeTitle: json['nativeTitle'] ?? '',
      synopsis: json['synopsis'] ?? '',
      posterUrl: json['posterUrl'] ?? '',
      bannerUrl: json['bannerUrl'] ?? '',
      rating: (json['rating'] ?? 0).toDouble(),
      status: json['status'] ?? '',
      studio: json['studio'] ?? '',
      genres: (json['genres'] as List?)?.map((e) => GenreModel.fromJson(e)).toList() ?? [],
    );
  }
}
