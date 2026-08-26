import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/focus/tv_focus_wrapper.dart';
import 'provider_home_screen.dart';

class WebProviderItem {
  final String name;
  final String endpoint;
  
  WebProviderItem(this.name, this.endpoint);
}

class WebProvidersScreen extends StatefulWidget {
  const WebProvidersScreen({super.key});

  @override
  State<WebProvidersScreen> createState() => _WebProvidersScreenState();
}

class _WebProvidersScreenState extends State<WebProvidersScreen> {
  final List<WebProviderItem> providers = [
    WebProviderItem('Otakudesu', 'anime/home'),
    WebProviderItem('Donghua', 'anime/donghua/home/1'),
    WebProviderItem('Samehadaku', 'anime/samehadaku/home'),
    WebProviderItem('Animasu', 'anime/animasu/home?page=1'),
    WebProviderItem('Kusonime', 'anime/kusonime/latest'),
    WebProviderItem('Anoboy', 'anime/anoboy/home'),
    WebProviderItem('Oploverz', 'anime/oploverz/home'),
    WebProviderItem('Stream', 'anime/stream/latest'),
    WebProviderItem('Animekuindo', 'anime/animekuindo/home'),
    WebProviderItem('Nimegami', 'anime/nimegami/home'),
    WebProviderItem('Alqanime', 'anime/alqanime/home'),
    WebProviderItem('Donghub', 'anime/donghub/home'),
    WebProviderItem('Winbu', 'anime/winbu/home'),
    WebProviderItem('Animekompi', 'anime/animekompi/home'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Web Providers'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: GridView.builder(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            childAspectRatio: 2.5,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: providers.length,
          itemBuilder: (context, index) {
            final item = providers[index];
            return TvFocusWrapper(
              autofocus: index == 0,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ProviderHomeScreen(
                      providerName: item.name,
                      endpoint: item.endpoint,
                    ),
                  ),
                );
              },
              child: Container(
                decoration: BoxDecoration(
                  color: AppTheme.backgroundCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: Center(
                  child: Text(
                    item.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
