import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_theme.dart';
import '../../core/focus/tv_focus_wrapper.dart';
import '../../data/providers/home_provider.dart';
import '../../data/models/player_model.dart';
import '../player/player_screen.dart';
import 'web_provider_mapper.dart';

class ProviderEpisodeScreen extends ConsumerStatefulWidget {
  final String providerName;
  final String episodeId;
  final String animeTitle;
  final String episodeTitle;

  const ProviderEpisodeScreen({
    super.key,
    required this.providerName,
    required this.episodeId,
    required this.animeTitle,
    required this.episodeTitle,
  });

  @override
  ConsumerState<ProviderEpisodeScreen> createState() => _ProviderEpisodeScreenState();
}

class _ProviderEpisodeScreenState extends ConsumerState<ProviderEpisodeScreen> {
  String _statusMessage = 'Loading servers...';

  @override
  void initState() {
    super.initState();
    _fetchAndResolve();
  }

  Future<void> _fetchAndResolve() async {
    try {
      final path = WebProviderMapper.getEpisodePath(widget.providerName, widget.episodeId);
      final apiClient = ref.read(apiClientProvider);
      
      final data = await apiClient.getWebProviderPath(path);
      
      // Parse servers from JSON
      final servers = _extractServers(data);
      if (servers.isEmpty) {
        setState(() {
          _statusMessage = 'No playable servers found in this episode.';
        });
        return;
      }
      
      setState(() {
        _statusMessage = 'Resolving video streams...';
      });

      final fullTitle = '${widget.animeTitle} - ${widget.episodeTitle}';
      final resolvedData = await apiClient.resolveWebProvider(widget.episodeId, fullTitle, servers);
      
      final sourceModel = PlaybackSourceModel.fromJson(resolvedData);

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => PlayerScreen(
              episodeId: widget.episodeId,
              preloadedSource: sourceModel,
            ),
          ),
        );
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          if (e.response?.statusCode == 404) {
             _statusMessage = 'Maaf, format video dari server ini belum didukung oleh Anivora (tidak ada link .m3u8/.mp4 langsung).';
          } else {
             _statusMessage = 'Gagal memuat video: ${e.message}';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _statusMessage = 'Terjadi kesalahan: $e';
        });
      }
    }
  }

  List<Map<String, dynamic>> _extractServers(dynamic data) {
    List<Map<String, dynamic>> servers = [];
    
    // Otakudesu style
    if (data is Map<String, dynamic>) {
       var d = data;
       if (data.containsKey('data')) d = data['data'];

       // Sometimes servers are under 'server' object mapping resolution -> list of servers
       if (d.containsKey('server') && d['server'] is Map) {
         final serverMap = d['server'] as Map;
         serverMap.forEach((quality, list) {
           if (list is List) {
             for (var srv in list) {
               if (srv is Map) {
                 servers.add({
                   'serverName': srv['title'] ?? 'Unknown',
                   'quality': quality.toString(),
                   'url': srv['url'] ?? srv['href'] ?? '',
                 });
               }
             }
           }
         });
       } else if (d.containsKey('servers') && d['servers'] is List) {
         for (var srv in d['servers']) {
            servers.add({
               'serverName': srv['serverName'] ?? srv['title'] ?? 'Unknown',
               'quality': srv['quality'] ?? 'HD',
               'url': srv['url'] ?? srv['iframe'] ?? srv['href'] ?? '',
            });
         }
       } else if (d.containsKey('streamUrl') || d.containsKey('iframeUrl')) {
          servers.add({
             'serverName': 'Default',
             'quality': 'HD',
             'url': d['streamUrl'] ?? d['iframeUrl'] ?? d['url'] ?? '',
          });
       } else {
         // Fallback generic search
         _findUrls(d, servers);
       }
    }
    return servers;
  }

  void _findUrls(Map<String, dynamic> map, List<Map<String, dynamic>> output) {
    map.forEach((key, value) {
      if (value is String && (value.contains('http') || value.contains('embed'))) {
         if (key == 'url' || key == 'iframe' || key == 'link' || key == 'href') {
            output.add({
              'serverName': 'Server',
              'quality': 'HD',
              'url': value,
            });
         }
      } else if (value is Map<String, dynamic>) {
         _findUrls(value, output);
      } else if (value is List) {
         for (var item in value) {
            if (item is Map<String, dynamic>) {
               _findUrls(item, output);
            }
         }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: AppTheme.primaryColor),
            const SizedBox(height: 24),
            Text(
              _statusMessage,
              style: const TextStyle(color: Colors.white, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            if (!_statusMessage.contains('Loading') && !_statusMessage.contains('Resolving'))
              Padding(
                padding: const EdgeInsets.only(top: 24),
                child: TvFocusWrapper(
                  autofocus: true,
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('Go Back', style: TextStyle(color: Colors.white)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
