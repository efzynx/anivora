package com.anivora.tv;

import android.os.Build;
import androidx.media3.common.MediaItem;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

/**
 * ExoPlayer Native Module optimized for low-end Android TV hardware (Amlogic S905 / RAM 1GB-2GB)
 * Aligned with docs/PLAYER.md and docs/ANDROID-TV.md
 */
public class AnivoraPlayerModule extends ReactContextBaseJavaModule {
    private ExoPlayer player;
    private final ReactApplicationContext reactContext;

    public AnivoraPlayerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "AnivoraPlayerModule";
    }

    @ReactMethod
    public void getDeviceInfo(Promise promise) {
        WritableMap map = Arguments.createMap();
        map.putString("device", Build.DEVICE);
        map.putString("model", Build.MODEL);
        map.putString("hardware", Build.HARDWARE);
        map.putInt("sdk", Build.VERSION.SDK_INT);
        map.putString("release", Build.VERSION.RELEASE);
        map.putString("abi", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "unknown");
        promise.resolve(map);
    }

    @ReactMethod
    public void initPlayer(String streamUrl, int resumePositionSeconds, Promise promise) {
        getCurrentActivity().runOnUiThread(() -> {
            try {
                if (player != null) {
                    player.release();
                }

                // Buffer Durations & LoadControl Tuning according to docs/PLAYER.md (cap buffer at 10MB RAM max)
                DefaultLoadControl loadControl = new DefaultLoadControl.Builder()
                    .setBufferDurationsMs(
                        15000, // minBufferMs
                        30000, // maxBufferMs
                        1500,  // bufferForPlaybackMs
                        3000   // bufferForPlaybackAfterRebufferMs
                    )
                    .setPrioritizeTimeOverSizeThresholds(true)
                    .setTargetBufferBytes(10 * 1024 * 1024)
                    .build();

                player = new ExoPlayer.Builder(reactContext)
                    .setLoadControl(loadControl)
                    .build();

                MediaItem mediaItem = MediaItem.fromUri(streamUrl);
                player.setMediaItem(mediaItem);
                player.prepare();

                if (resumePositionSeconds > 0) {
                    player.seekTo(resumePositionSeconds * 1000L);
                }

                player.play();
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("PLAYER_INIT_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void releasePlayer(Promise promise) {
        getCurrentActivity().runOnUiThread(() -> {
            if (player != null) {
                player.release();
                player = null;
            }
            promise.resolve(true);
        });
    }
}
