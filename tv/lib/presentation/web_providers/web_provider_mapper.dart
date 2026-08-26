class WebProviderMapper {
  static String getDetailPath(String providerName, String slug) {
    switch (providerName.toLowerCase()) {
      case 'otakudesu':
        return 'anime/anime/$slug';
      case 'donghua':
        return 'anime/donghua/detail/$slug';
      case 'samehadaku':
        return 'anime/samehadaku/anime/$slug';
      case 'animasu':
        return 'anime/animasu/detail/$slug';
      case 'kusonime':
        return 'anime/kusonime/detail/$slug';
      case 'anoboy':
        return 'anime/anoboy/$slug';
      case 'oploverz':
        return 'anime/oploverz/anime/$slug';
      case 'stream':
        return 'anime/stream/detail/$slug';
      case 'animekuindo':
        return 'anime/animekuindo/detail/$slug';
      case 'nimegami':
        return 'anime/nimegami/detail/$slug';
      case 'alqanime':
        return 'anime/alqanime/detail/$slug';
      case 'donghub':
        return 'anime/donghub/detail/$slug';
      case 'winbu':
        return 'anime/winbu/detail/$slug';
      case 'animekompi':
        return 'anime/animekompi/detail/$slug';
      default:
        // Coba default
        return 'anime/anime/$slug';
    }
  }

  static String getEpisodePath(String providerName, String episodeId) {
    switch (providerName.toLowerCase()) {
      case 'otakudesu':
        return 'anime/episode/$episodeId';
      case 'donghua':
        return 'anime/donghua/episode/$episodeId';
      case 'samehadaku':
        return 'anime/samehadaku/episode/$episodeId';
      case 'animasu':
        return 'anime/animasu/episode/$episodeId';
      case 'kusonime':
        return 'anime/kusonime/detail/$episodeId'; // kusonime uses detail for eps
      case 'anoboy':
        return 'anime/anoboy/$episodeId';
      case 'oploverz':
        return 'anime/oploverz/episode/$episodeId';
      case 'stream':
        return 'anime/stream/episode/$episodeId';
      case 'animekuindo':
        return 'anime/animekuindo/episode/$episodeId';
      case 'nimegami':
        return 'anime/nimegami/episode/$episodeId';
      case 'alqanime':
        return 'anime/alqanime/episode/$episodeId';
      case 'donghub':
        return 'anime/donghub/episode/$episodeId';
      case 'winbu':
        return 'anime/winbu/episode/$episodeId';
      case 'animekompi':
        return 'anime/animekompi/episode/$episodeId';
      default:
        return 'anime/episode/$episodeId';
    }
  }

  static String extractSlug(String href) {
    // extract slug from href like "/anime/anime/shunkashuutou-daikousha-sub-indo"
    var url = href.trim();
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    final parts = url.split('/');
    if (parts.isNotEmpty) {
      return parts.last;
    }
    return href;
  }
}
