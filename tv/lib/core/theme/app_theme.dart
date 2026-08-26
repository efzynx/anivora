import 'package:flutter/material.dart';

class AppTheme {
  static const Color primaryColor = Color(0xFF7C5CFF);
  static const Color backgroundDark = Color(0xFF0F1115);
  static const Color backgroundCard = Color(0xFF1A1D24);
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA0A5B5);
  static const Color focusGlow = Color(0x667C5CFF);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: backgroundDark,
      primaryColor: primaryColor,
      colorScheme: const ColorScheme.dark(
        primary: primaryColor,
        surface: backgroundCard,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: textPrimary, fontSize: 57, fontWeight: FontWeight.bold),
        displayMedium: TextStyle(color: textPrimary, fontSize: 45, fontWeight: FontWeight.bold),
        headlineLarge: TextStyle(color: textPrimary, fontSize: 32, fontWeight: FontWeight.w600),
        headlineMedium: TextStyle(color: textPrimary, fontSize: 28, fontWeight: FontWeight.w600),
        titleLarge: TextStyle(color: textPrimary, fontSize: 22, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(color: textPrimary, fontSize: 16),
        bodyMedium: TextStyle(color: textSecondary, fontSize: 14),
      ),
      focusColor: primaryColor,
      highlightColor: focusGlow,
    );
  }
}
