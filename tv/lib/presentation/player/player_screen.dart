import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import '../../core/focus/tv_focus_wrapper.dart';
import '../../data/providers/player_provider.dart';
import '../../data/models/player_model.dart';

class PlayerScreen extends ConsumerStatefulWidget {
  final String episodeId;
  final PlaybackSourceModel? preloadedSource;

  const PlayerScreen({super.key, required this.episodeId, this.preloadedSource});


  @override
  ConsumerState<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends ConsumerState<PlayerScreen> {
  late final Player player = Player();
  late final VideoController controller = VideoController(player);
  final FocusNode _focusNode = FocusNode();

  // Explicit FocusNodes for each button in the row
  final FocusNode _rewindFocusNode = FocusNode();
  final FocusNode _playButtonFocusNode = FocusNode();
  final FocusNode _forwardFocusNode = FocusNode();
  final FocusNode _qualityFocusNode = FocusNode();

  bool _isPlaying = false;
  bool _isBuffering = true;
  bool _controlsVisible = true;
  bool _isDisposing = false; // Flag untuk cegah setState setelah dispose
  Timer? _hideTimer;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  PlaybackSourceModel? _currentSource;

  // Simpan semua stream subscription agar bisa di-cancel
  final List<StreamSubscription> _subscriptions = [];

  @override
  void initState() {
    super.initState();

    _subscriptions.add(player.stream.playing.listen((playing) {
      if (mounted && !_isDisposing) setState(() => _isPlaying = playing);
    }));

    _subscriptions.add(player.stream.buffering.listen((buffering) {
      if (mounted && !_isDisposing) setState(() => _isBuffering = buffering);
    }));

    _subscriptions.add(player.stream.position.listen((pos) {
      if (mounted && !_isDisposing) setState(() => _position = pos);
    }));

    _subscriptions.add(player.stream.duration.listen((dur) {
      if (mounted && !_isDisposing) setState(() => _duration = dur);
    }));

    _startHideTimer();
  }

  void _startHideTimer() {
    _hideTimer?.cancel();
    if (!_controlsVisible) {
      setState(() => _controlsVisible = true);
    }

    if (_controlsVisible &&
        mounted &&
        !_playButtonFocusNode.hasFocus &&
        !_rewindFocusNode.hasFocus &&
        !_forwardFocusNode.hasFocus &&
        !_qualityFocusNode.hasFocus) {
      _playButtonFocusNode.requestFocus();
    }

    _hideTimer = Timer(const Duration(seconds: 4), () {
      if (mounted && _isPlaying && !_isDisposing) {
        setState(() => _controlsVisible = false);
        if (mounted) {
          _focusNode.requestFocus();
        }
      }
    });
  }

  String _formatDuration(Duration d) {
    String twoDigits(int n) => n.toString().padLeft(2, "0");
    String twoDigitMinutes = twoDigits(d.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(d.inSeconds.remainder(60));
    if (d.inHours > 0) {
      return "${d.inHours}:$twoDigitMinutes:$twoDigitSeconds";
    }
    return "$twoDigitMinutes:$twoDigitSeconds";
  }

  /// Navigasi keluar dengan aman — pause dulu, cancel timer, baru pop
  Future<void> _safeBack() async {
    if (_isDisposing) return;
    _isDisposing = true;

    // Cancel semua timer & subscription sebelum navigasi
    _hideTimer?.cancel();
    for (final sub in _subscriptions) {
      await sub.cancel();
    }
    _subscriptions.clear();

    // Pause player agar tidak ada frame baru yang coba di-render
    try {
      await player.pause();
    } catch (_) {}

    if (mounted) {
      Navigator.pop(context);
    }
  }

  @override
  void dispose() {
    _isDisposing = true;
    _hideTimer?.cancel();

    // Cancel semua subscription jika belum di-cancel
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    _subscriptions.clear();

    _rewindFocusNode.dispose();
    _playButtonFocusNode.dispose();
    _forwardFocusNode.dispose();
    _qualityFocusNode.dispose();
    _focusNode.dispose();

    // Dispose player setelah frame selesai untuk hindari crash native texture
    WidgetsBinding.instance.addPostFrameCallback((_) {
      player.dispose();
    });

    super.dispose();
  }

  void _togglePlayPause() {
    if (_isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }

  void _seek(Duration offset) {
    final currentPos = player.state.position;
    final totalDur = player.state.duration;

    var newPos = currentPos + offset;
    if (newPos < Duration.zero) newPos = Duration.zero;
    if (newPos > totalDur && totalDur.inMilliseconds > 0) newPos = totalDur;

    player.seek(newPos);
  }

  void _showSourcesDialog() {
    PlaybackSourceModel? currentSource = _currentSource;
    if (widget.preloadedSource == null) {
      final sourceAsync = ref.read(playbackSourceProvider(widget.episodeId));
      currentSource = sourceAsync.valueOrNull ?? _currentSource;
    }

    if (currentSource == null) return;

    _hideTimer?.cancel();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: Colors.grey[900],
          title: const Text('Select Server / Quality',
              style: TextStyle(color: Colors.white)),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: currentSource!.alternativeSources.length,
              itemBuilder: (context, index) {
                final source = currentSource!.alternativeSources[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: TvFocusWrapper(
                    autofocus: index == 0,
                    onTap: () {
                      if (mounted && !_isDisposing) {
                        setState(() => _isBuffering = true);
                      }
                      player.open(Media(source.streamUrl));
                      player.play();
                      Navigator.pop(context);
                      _startHideTimer();
                    },
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.black45,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${source.serverName} - ${source.quality}',
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        );
      },
    ).then((_) => _startHideTimer());
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is KeyDownEvent) {
      if (!_controlsVisible) {
        _startHideTimer();
        return KeyEventResult.handled;
      }
      _startHideTimer();

      switch (event.logicalKey) {
        case LogicalKeyboardKey.escape:
        case LogicalKeyboardKey.goBack:
        case LogicalKeyboardKey.browserBack:
          _safeBack();
          return KeyEventResult.handled;
        case LogicalKeyboardKey.arrowRight:
          if (_rewindFocusNode.hasFocus) {
            _playButtonFocusNode.requestFocus();
            return KeyEventResult.handled;
          } else if (_playButtonFocusNode.hasFocus) {
            _forwardFocusNode.requestFocus();
            return KeyEventResult.handled;
          } else if (_forwardFocusNode.hasFocus) {
            _qualityFocusNode.requestFocus();
            return KeyEventResult.handled;
          }
          break;
        case LogicalKeyboardKey.arrowLeft:
          if (_qualityFocusNode.hasFocus) {
            _forwardFocusNode.requestFocus();
            return KeyEventResult.handled;
          } else if (_forwardFocusNode.hasFocus) {
            _playButtonFocusNode.requestFocus();
            return KeyEventResult.handled;
          } else if (_playButtonFocusNode.hasFocus) {
            _rewindFocusNode.requestFocus();
            return KeyEventResult.handled;
          }
          break;
      }
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final playbackAsync = widget.preloadedSource != null 
        ? AsyncValue.data(widget.preloadedSource!)
        : ref.watch(playbackSourceProvider(widget.episodeId));

    if (widget.preloadedSource == null) {
      ref.listen(playbackSourceProvider(widget.episodeId), (previous, next) {
        next.whenData((source) {
          _currentSource = source;
          if (source.selectedSource != null && !_isDisposing) {
            final url = source.selectedSource!.streamUrl;
            if (mounted && !_isDisposing) setState(() => _isBuffering = true);
            player.open(Media(url));
            player.play();
          }
        });
      });
    } else {
      // For preloaded source, initialize once on build if not set
      if (_currentSource == null && widget.preloadedSource?.selectedSource != null) {
        _currentSource = widget.preloadedSource;
        final url = _currentSource!.selectedSource!.streamUrl;
        if (mounted && !_isDisposing) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!_isDisposing) setState(() => _isBuffering = true);
            player.open(Media(url));
            player.play();
          });
        }
      }
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Focus(
        focusNode: _focusNode,
        onKeyEvent: _handleKeyEvent,
        child: Stack(
          children: [
            Video(
              controller: controller,
              controls: NoVideoControls,
            ),
            playbackAsync.when(
              loading: () => const Center(
                  child: CircularProgressIndicator(
                      color: Colors.deepPurpleAccent)),
              error: (err, stack) => Center(
                  child: Text('Failed to load video: $err',
                      style: const TextStyle(color: Colors.red))),
              data: (data) => const SizedBox.shrink(),
            ),

            if (_isBuffering)
              const Center(
                child: SizedBox(
                  width: 64,
                  height: 64,
                  child: CircularProgressIndicator(
                    color: Colors.deepPurpleAccent,
                    strokeWidth: 4,
                  ),
                ),
              ),

            // Premium OSD Overlay
            AnimatedOpacity(
              opacity: _controlsVisible || !_isPlaying ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 300),
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black87,
                      Colors.transparent,
                      Colors.transparent,
                      Colors.black87,
                    ],
                    stops: [0.0, 0.2, 0.7, 1.0],
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Top Bar
                    Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Row(
                        children: [
                          GestureDetector(
                            onTap: _safeBack,
                            child: const Icon(Icons.arrow_back,
                                color: Colors.white70, size: 28),
                          ),
                          const SizedBox(width: 16),
                          const Text(
                            "Press Back / ESC to exit",
                            style: TextStyle(
                                color: Colors.white70,
                                fontSize: 16,
                                fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),

                    // Center Area
                    Expanded(
                      child: Center(
                        child: !_isPlaying && !_isBuffering
                            ? Container(
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: Colors.deepPurpleAccent
                                      .withValues(alpha: 0.8),
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.deepPurpleAccent
                                          .withValues(alpha: 0.4),
                                      blurRadius: 20,
                                      spreadRadius: 5,
                                    )
                                  ],
                                ),
                                child: const Icon(Icons.pause,
                                    size: 72, color: Colors.white),
                              )
                            : const SizedBox.shrink(),
                      ),
                    ),

                    // Bottom Progress Bar & Controls
                    Padding(
                      padding: const EdgeInsets.only(
                          left: 48, right: 48, bottom: 48, top: 16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Scrubber Bar
                          Row(
                            children: [
                              Text(
                                _formatDuration(_position),
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Container(
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: Colors.white24,
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                  child: LayoutBuilder(
                                    builder: (context, constraints) {
                                      final double percent =
                                          _duration.inMilliseconds > 0
                                              ? _position.inMilliseconds /
                                                  _duration.inMilliseconds
                                              : 0.0;
                                      return Align(
                                        alignment: Alignment.centerLeft,
                                        child: Container(
                                          width: constraints.maxWidth *
                                              percent.clamp(0.0, 1.0),
                                          decoration: BoxDecoration(
                                            color: Colors.deepPurpleAccent,
                                            borderRadius:
                                                BorderRadius.circular(3),
                                            boxShadow: [
                                              BoxShadow(
                                                color: Colors.deepPurpleAccent
                                                    .withValues(alpha: 0.6),
                                                blurRadius: 8,
                                              )
                                            ],
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Text(
                                _formatDuration(_duration),
                                style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                          // Focusable Control Buttons
                          FocusTraversalGroup(
                            policy: OrderedTraversalPolicy(),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                FocusTraversalOrder(
                                  order: const NumericFocusOrder(1),
                                  child: _buildControlButton(
                                    icon: Icons.fast_rewind,
                                    label: "-10s",
                                    onTap: () =>
                                        _seek(const Duration(seconds: -10)),
                                    focusNode: _rewindFocusNode,
                                  ),
                                ),
                                const SizedBox(width: 32),
                                FocusTraversalOrder(
                                  order: const NumericFocusOrder(2),
                                  child: _buildControlButton(
                                    icon: _isPlaying
                                        ? Icons.pause
                                        : Icons.play_arrow,
                                    label: _isPlaying ? "Pause" : "Play",
                                    onTap: _togglePlayPause,
                                    isPrimary: true,
                                    focusNode: _playButtonFocusNode,
                                  ),
                                ),
                                const SizedBox(width: 32),
                                FocusTraversalOrder(
                                  order: const NumericFocusOrder(3),
                                  child: _buildControlButton(
                                    icon: Icons.fast_forward,
                                    label: "+10s",
                                    onTap: () =>
                                        _seek(const Duration(seconds: 10)),
                                    focusNode: _forwardFocusNode,
                                  ),
                                ),
                                const SizedBox(width: 32),
                                FocusTraversalOrder(
                                  order: const NumericFocusOrder(4),
                                  child: _buildControlButton(
                                    icon: Icons.settings,
                                    label: "Quality",
                                    onTap: _showSourcesDialog,
                                    focusNode: _qualityFocusNode,
                                  ),
                                ),
                              ],
                            ),
                          )
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
  }

  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isPrimary = false,
    FocusNode? focusNode,
  }) {
    return TvFocusWrapper(
      onTap: onTap,
      focusNode: focusNode,
      child: Builder(builder: (context) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          decoration: BoxDecoration(
            color: isPrimary ? Colors.deepPurpleAccent : Colors.white12,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: Colors.white, size: isPrimary ? 36 : 28),
              const SizedBox(height: 4),
              Text(
                label,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold),
              ),
            ],
          ),
        );
      }),
    );
  }
}
