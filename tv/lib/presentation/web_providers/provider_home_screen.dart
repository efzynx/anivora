import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../core/focus/tv_focus_wrapper.dart';
import '../../data/providers/web_providers_provider.dart';
import 'provider_detail_screen.dart';
import 'web_provider_mapper.dart';

class ProviderHomeScreen extends ConsumerWidget {
  final String providerName;
  final String endpoint;

  const ProviderHomeScreen({
    super.key,
    required this.providerName,
    required this.endpoint,
  });


  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedAsync = ref.watch(webProviderFeedProvider(endpoint));

    return Scaffold(
      appBar: AppBar(
        title: Text(providerName),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: feedAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text('Failed to load feed: $err', style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 16),
              TvFocusWrapper(
                autofocus: true,
                onTap: () => ref.refresh(webProviderFeedProvider(endpoint)),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text('Retry', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              )
            ],
          ),
        ),
        data: (data) {
          // Dynamic parser to find lists of anime items
          final sections = _parseResponse(data);
          
          if (sections.isEmpty) {
            return const Center(child: Text("No content found or unsupported format."));
          }
          
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: sections.map((section) => _buildSection(context, section.title, section.items)).toList(),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, List<dynamic> items) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
        SizedBox(
          height: 224,
          child: ListView.builder(
            clipBehavior: Clip.none,
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              
              // Try to extract standard fields
              final String itemTitle = item['title'] ?? item['name'] ?? 'Unknown';
              final String posterUrl = item['poster'] ?? item['image'] ?? item['thumbnail'] ?? '';
              
              return Padding(
                padding: const EdgeInsets.only(right: 16.0, top: 12.0, bottom: 12.0),
                child: TvFocusWrapper(
                  onTap: () {
                    final href = item['href'] ?? item['url'] ?? '';
                    final slug = item['slug'] ?? item['animeId'] ?? item['id'] ?? WebProviderMapper.extractSlug(href);
                    final isEpisode = item['episode'] != null || item['eps'] != null || item['episodeId'] != null || slug.toLowerCase().contains('episode');
                    
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ProviderDetailScreen(
                          providerName: providerName,
                          slug: slug,
                          title: itemTitle,
                          isEpisodeSlug: isEpisode,
                        ),
                      ),
                    );
                  },
                  child: Container(
                    width: 140,
                    decoration: BoxDecoration(
                      color: AppTheme.backgroundCard,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        if (posterUrl.isNotEmpty)
                          CachedNetworkImage(
                            imageUrl: posterUrl,
                            fit: BoxFit.cover,
                            errorWidget: (context, url, error) => const Icon(Icons.movie, color: Colors.white24, size: 28),
                          )
                        else
                          const Icon(Icons.movie, color: Colors.white24, size: 28),
                        Positioned(
                          bottom: 0,
                          left: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [Colors.black.withValues(alpha: 0.9), Colors.transparent],
                              ),
                            ),
                            child: Text(
                              itemTitle,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  List<_SectionData> _parseResponse(dynamic data) {
    List<_SectionData> sections = [];
    
    if (data is Map<String, dynamic>) {
      // Often data is inside a 'data' key
      if (data.containsKey('data')) {
        final innerData = data['data'];
        
        if (innerData is List) {
          sections.add(_SectionData('Latest', innerData));
        } else if (innerData is Map<String, dynamic>) {
          // Sometimes it contains nested categories (e.g. ongoing, completed)
          if (innerData.containsKey('ongoing') || innerData.containsKey('completed')) {
             innerData.forEach((key, value) {
               if (value is Map<String, dynamic> && value.containsKey('animeList')) {
                 sections.add(_SectionData(key.toUpperCase(), value['animeList'] as List));
               }
             });
          } else if (innerData.containsKey('animeList')) {
             sections.add(_SectionData('Contents', innerData['animeList'] as List));
          } else {
             // Fallback to extract any lists inside data
             innerData.forEach((key, value) {
                if (value is List && value.isNotEmpty) {
                   sections.add(_SectionData(key.toUpperCase(), value));
                }
             });
          }
        }
      } else if (data.containsKey('animeList')) {
        sections.add(_SectionData('Contents', data['animeList'] as List));
      } else {
        // Fallback for root level arrays like 'latest_release'
        data.forEach((key, value) {
          if (value is List && value.isNotEmpty) {
            sections.add(_SectionData(key.toUpperCase().replaceAll('_', ' '), value));
          }
        });
      }
    } else if (data is List) {
      sections.add(_SectionData('Results', data));
    }
    
    return sections;
  }
}

class _SectionData {
  final String title;
  final List<dynamic> items;
  _SectionData(this.title, this.items);
}
