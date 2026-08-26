import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../core/focus/tv_focus_wrapper.dart';
import '../../data/providers/web_providers_provider.dart';
import 'web_provider_mapper.dart';
import 'provider_episode_screen.dart';
import '../../data/providers/home_provider.dart';

class ProviderDetailScreen extends ConsumerStatefulWidget {
  final String providerName;
  final String slug;
  final String title;
  final bool isEpisodeSlug; // ADDED

  const ProviderDetailScreen({
    super.key,
    required this.providerName,
    required this.slug,
    required this.title,
    this.isEpisodeSlug = false, // ADDED
  });

  @override
  ConsumerState<ProviderDetailScreen> createState() => _ProviderDetailScreenState();
}

class _ProviderDetailScreenState extends ConsumerState<ProviderDetailScreen> {
  String? _actualSlug;
  bool _isLoadingActualSlug = false;

  @override
  void initState() {
    super.initState();
    if (widget.isEpisodeSlug) {
      _fetchActualSeriesSlug();
    } else {
      _actualSlug = widget.slug;
    }
  }

  Future<void> _fetchActualSeriesSlug() async {
    setState(() => _isLoadingActualSlug = true);
    try {
      final path = WebProviderMapper.getEpisodePath(widget.providerName, widget.slug);
      final apiClient = ref.read(apiClientProvider);
      final data = await apiClient.getWebProviderPath(path);
      
      String? seriesSlug;
      if (data != null) {
         if (data['donghua_details'] != null && data['donghua_details']['slug'] != null) {
            seriesSlug = data['donghua_details']['slug'];
         } else if (data['data'] != null && data['data']['animeId'] != null) {
            seriesSlug = data['data']['animeId'];
         } else if (data['data'] != null && data['data']['slug'] != null) {
            seriesSlug = data['data']['slug'];
         }
      }

      if (mounted) {
        setState(() {
          _actualSlug = seriesSlug ?? widget.slug; // Fallback to original if not found
          _isLoadingActualSlug = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _actualSlug = widget.slug; // Fallback
          _isLoadingActualSlug = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingActualSlug || _actualSlug == null) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(title: Text(widget.title), backgroundColor: Colors.transparent, elevation: 0),
        body: const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
      );
    }

    final path = WebProviderMapper.getDetailPath(widget.providerName, _actualSlug!);
    final detailAsync = ref.watch(webProviderFeedProvider(path));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err', style: const TextStyle(color: Colors.white))),
        data: (data) {
          final info = _parseDetail(data);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Poster
                if (info.poster.isNotEmpty)
                  Container(
                    width: 300,
                    height: 450,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      image: DecorationImage(
                        image: CachedNetworkImageProvider(info.poster),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                const SizedBox(width: 32),
                // Info & Episodes
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        info.title.isNotEmpty ? info.title : widget.title,
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 16),
                      if (info.synopsis.isNotEmpty)
                        Text(
                          info.synopsis,
                          style: const TextStyle(fontSize: 16, color: Colors.white70, height: 1.5),
                        ),
                      const SizedBox(height: 32),
                      const Text(
                        'Episodes',
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 16),
                      if (info.episodes.isEmpty)
                        const Text('No episodes found.', style: TextStyle(color: Colors.white54))
                      else
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 140,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 2.5,
                          ),
                          itemCount: info.episodes.length,
                          itemBuilder: (context, index) {
                            final ep = info.episodes[index];
                            final epTitle = ep['title'] ?? ep['episode'] ?? 'Episode ${index + 1}';
                            final epId = ep['episodeId'] ?? ep['slug'] ?? WebProviderMapper.extractSlug(ep['href'] ?? '');

                            // Format title to be short (e.g. "Ep 96")
                            String displayTitle = epTitle;
                            final match = RegExp(r'(?:episode|ep)\s*([\d\.]+)', caseSensitive: false).firstMatch(epTitle);
                            if (match != null) {
                              displayTitle = 'Ep ${match.group(1)}';
                            } else {
                              String short = epTitle.replaceAll(RegExp(r'(subtitle indonesia|sub indo)', caseSensitive: false), '').trim();
                              if (short.length > 15) {
                                displayTitle = 'Ep ${info.episodes.length - index}';
                              } else {
                                displayTitle = short;
                              }
                            }

                            return TvFocusWrapper(
                              autofocus: index == 0,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => ProviderEpisodeScreen(
                                      providerName: widget.providerName,
                                      episodeId: epId,
                                      animeTitle: widget.title,
                                      episodeTitle: epTitle,
                                    ),
                                  ),
                                );
                              },
                              child: Container(
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: AppTheme.backgroundCard,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  displayTitle,
                                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            );
                          },
                        )
                    ],
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }

  _DetailInfo _parseDetail(dynamic data) {
    String title = '';
    String poster = '';
    String synopsis = '';
    List<dynamic> episodes = [];

    if (data is Map<String, dynamic>) {
      var d = data;
      if (data.containsKey('data')) {
        d = data['data'];
      }

      title = d['title'] ?? d['name'] ?? '';
      poster = d['poster'] ?? d['image'] ?? d['thumbnail'] ?? '';
      
      if (d['synopsis'] is Map) {
        if (d['synopsis']['paragraphs'] is List) {
           synopsis = (d['synopsis']['paragraphs'] as List).join('\n\n');
        }
      } else if (d['synopsis'] is String) {
        synopsis = d['synopsis'];
      }

      if (d['episodeList'] != null) {
        episodes = d['episodeList'];
      } else if (d['episodes'] != null) {
        episodes = d['episodes'];
      } else if (d['episodes_list'] != null) { // ADDED
        episodes = d['episodes_list'];
      } else if (d['server'] != null) {
        // sometimes detail is actually episode (e.g. movies or kusonime)
      }
    }
    return _DetailInfo(title, poster, synopsis, episodes);
  }
}

class _DetailInfo {
  final String title;
  final String poster;
  final String synopsis;
  final List<dynamic> episodes;

  _DetailInfo(this.title, this.poster, this.synopsis, this.episodes);
}
