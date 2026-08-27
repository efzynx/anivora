import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';
import 'core/theme/app_theme.dart';
import 'presentation/home/home_screen.dart';
import 'presentation/web_providers/web_providers_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Guard MediaKit initialization agar kegagalan load libmpv di Android 6/STB tidak membuat crash seluruh app saat startup
  try {
    MediaKit.ensureInitialized();
  } catch (e, stack) {
    debugPrint('MediaKit initialization error: $e\n$stack');
  }
  
  // Set preferred orientations for TV
  try {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeRight,
      DeviceOrientation.landscapeLeft,
    ]);
  } catch (e) {
    debugPrint('Orientation setup error: $e');
  }

  // Global Flutter error handler
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('Flutter Error: ${details.exceptionAsString()}');
  };

  runApp(const ProviderScope(child: AnivoraApp()));
}

class AnivoraApp extends StatelessWidget {
  const AnivoraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ANIVORA',
      theme: AppTheme.darkTheme,
      initialRoute: '/',
      routes: {
        '/': (context) => const HomeScreen(),
        '/web_providers': (context) => const WebProvidersScreen(),
      },
      debugShowCheckedModeBanner: false,
    );
  }
}
