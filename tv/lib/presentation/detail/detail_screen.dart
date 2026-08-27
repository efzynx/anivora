import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_theme.dart';
import '../../core/focus/tv_focus_wrapper.dart';
import '../../data/providers/detail_provider.dart';
import '../player/player_screen.dart';

class DetailScreen extends ConsumerWidget {
  final String contentId;
  const DetailScreen({super.key, required this.contentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(contentDetailProvider(contentId));
    final episodesAsync = ref.watch(episodesProvider(contentId));

    return Scaffold(
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err', style: const TextStyle(color: Colors.white))),
        data: (detail) {
          return CallbackShortcuts(
            bindings: <ShortcutActivator, VoidCallback>{
              const SingleActivator(LogicalKeyboardKey.escape): () => Navigator.pop(context),
              const SingleActivator(LogicalKeyboardKey.browserBack): () => Navigator.pop(context),
              const SingleActivator(LogicalKeyboardKey.backspace): () => Navigator.pop(context),
            },
            child: Focus(
              autofocus: false, // The list or back button will have focus
              child: Stack(
                children: [
              // Background Banner with Gradient
              Positioned.fill(
                child: CachedNetworkImage(
                  imageUrl: detail.posterUrl,
                  fit: BoxFit.cover,
                  httpHeaders: const {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                  },
                ),
              ),
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.backgroundDark,
                        AppTheme.backgroundDark.withOpacity(0.8),
                        AppTheme.backgroundDark.withOpacity(0.3),
                      ],
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                    ),
                  ),
                ),
              ),
              // Content
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(48.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Left Column (Back Button + Poster)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TvFocusWrapper(
                            onTap: () => Navigator.pop(context),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.arrow_back, color: Colors.white, size: 24),
                            ),
                          ),
                          const SizedBox(height: 24),
                          // Poster
                          Container(
                            width: 200,
                            height: 300,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              image: DecorationImage(
                                image: CachedNetworkImageProvider(
                                  detail.posterUrl,
                                  headers: const {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                  },
                                ),
                                fit: BoxFit.cover,
                              ),
                              boxShadow: const [
                                BoxShadow(
                                  color: Colors.black54,
                                  blurRadius: 20,
                                  offset: Offset(0, 10),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 48),
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              detail.title,
                              style: Theme.of(context).textTheme.displayMedium,
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                const Icon(Icons.star, color: Colors.amber, size: 20),
                                const SizedBox(width: 4),
                                Text(
                                  detail.rating.toString(),
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                        color: Colors.amber,
                                      ),
                                ),
                                const SizedBox(width: 16),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: AppTheme.primaryColor),
                                  ),
                                  child: Text(
                                    detail.status,
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          color: AppTheme.primaryColor,
                                        ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Text(
                                  detail.studio,
                                  style: Theme.of(context).textTheme.bodyLarge,
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              detail.synopsis,
                              style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.5),
                              maxLines: 4,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 32),
                            // Episodes Section
                            Text(
                              'Episodes',
                              style: Theme.of(context).textTheme.headlineLarge,
                            ),
                            const SizedBox(height: 16),
                            Expanded(
                              child: episodesAsync.when(
                                loading: () => const Center(child: CircularProgressIndicator()),
                                error: (err, stack) => Text('Failed to load episodes: $err', style: const TextStyle(color: Colors.red)),
                                data: (episodes) {
                                  if (episodes.isEmpty) {
                                    return const Text('No episodes available yet.', style: TextStyle(color: Colors.white));
                                  }
                                  return GridView.builder(
                                    clipBehavior: Clip.none,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 5,
                                      childAspectRatio: 4.0,
                                      crossAxisSpacing: 12,
                                      mainAxisSpacing: 12,
                                    ),
                                    itemCount: episodes.length,
                                    itemBuilder: (context, index) {
                                      final ep = episodes[index];
                                      return TvFocusWrapper(
                                          autofocus: index == 0,
                                          onTap: () {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (context) => PlayerScreen(episodeId: ep.id),
                                              ),
                                            );
                                          },
                                          child: Container(
                                            alignment: Alignment.center,
                                            decoration: BoxDecoration(
                                              color: AppTheme.backgroundCard,
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(color: Colors.white24),
                                            ),
                                            child: Text(
                                              'Ep ${ep.episodeNumber}',
                                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                            ),
                                          ),
                                        );
                                    },
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
         ),
        );
        },
      ),
    );
  }
}
