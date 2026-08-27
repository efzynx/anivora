import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class TvFocusWrapper extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onFocus;
  final double borderRadius;
  final bool autofocus;
  final FocusNode? focusNode;

  const TvFocusWrapper({
    super.key,
    required this.child,
    this.onTap,
    this.onFocus,
    this.borderRadius = 8.0,
    this.autofocus = false,
    this.focusNode,
  });

  @override
  State<TvFocusWrapper> createState() => _TvFocusWrapperState();
}

class _TvFocusWrapperState extends State<TvFocusWrapper> {
  late FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void didUpdateWidget(TvFocusWrapper oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.focusNode != oldWidget.focusNode) {
      if (oldWidget.focusNode == null) {
        _focusNode.dispose();
      } else {
        _focusNode.removeListener(_onFocusChange);
      }
      _focusNode = widget.focusNode ?? FocusNode();
      _focusNode.addListener(_onFocusChange);
    }
  }

  @override
  void dispose() {
    if (widget.focusNode == null) {
      _focusNode.dispose();
    } else {
      _focusNode.removeListener(_onFocusChange);
    }
    super.dispose();
  }

  void _onFocusChange() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
    if (_isFocused && widget.onFocus != null) {
      widget.onFocus!();
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      focusNode: _focusNode,
      autofocus: widget.autofocus,
      onTap: widget.onTap,
      borderRadius: BorderRadius.circular(widget.borderRadius),
      focusColor: Colors.transparent,
      hoverColor: Colors.transparent,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.borderRadius),
          border: Border.all(
            color: _isFocused ? AppTheme.primaryColor : Colors.transparent,
            width: 3.0,
          ),
          boxShadow: _isFocused
              ? [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.5),
                    blurRadius: 12.0,
                    spreadRadius: 2.0,
                  )
                ]
              : [],
        ),
        transform: _isFocused ? (Matrix4.diagonal3Values(1.05, 1.05, 1.05)) : Matrix4.identity(),
        transformAlignment: Alignment.center,
        child: widget.child,
      ),
    );
  }
}
