import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../models/content_model.dart';
import 'home_provider.dart';

// State for all donghua screen
class AllDonghuaState {
  final List<ContentModel> items;
  final bool isLoading;
  final bool hasMore;
  final int currentPage;
  final int totalPages;
  final String searchQuery;
  final String? error;

  const AllDonghuaState({
    this.items = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.currentPage = 1,
    this.totalPages = 1,
    this.searchQuery = '',
    this.error,
  });

  AllDonghuaState copyWith({
    List<ContentModel>? items,
    bool? isLoading,
    bool? hasMore,
    int? currentPage,
    int? totalPages,
    String? searchQuery,
    String? error,
  }) {
    return AllDonghuaState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      searchQuery: searchQuery ?? this.searchQuery,
      error: error,
    );
  }
}

class AllDonghuaNotifier extends StateNotifier<AllDonghuaState> {
  final ApiClient _apiClient;

  AllDonghuaNotifier(this._apiClient) : super(const AllDonghuaState()) {
    loadInitial();
  }

  Future<void> loadInitial() async {
    state = state.copyWith(isLoading: true, items: [], currentPage: 1, hasMore: true, error: null);
    try {
      final data = await _apiClient.getAllDonghua(page: 1, limit: 30, query: state.searchQuery);
      final items = (data['data'] as List? ?? [])
          .map((e) => ContentModel.fromJson(e as Map<String, dynamic>))
          .toList();
      final totalPages = data['totalPages'] as int? ?? 1;
      state = state.copyWith(
        items: items,
        isLoading: false,
        currentPage: 1,
        totalPages: totalPages,
        hasMore: 1 < totalPages,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore) return;
    final nextPage = state.currentPage + 1;
    state = state.copyWith(isLoading: true);
    try {
      final data = await _apiClient.getAllDonghua(page: nextPage, limit: 30, query: state.searchQuery);
      final newItems = (data['data'] as List? ?? [])
          .map((e) => ContentModel.fromJson(e as Map<String, dynamic>))
          .toList();
      final totalPages = data['totalPages'] as int? ?? 1;
      state = state.copyWith(
        items: [...state.items, ...newItems],
        isLoading: false,
        currentPage: nextPage,
        totalPages: totalPages,
        hasMore: nextPage < totalPages,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setSearch(String query) {
    state = state.copyWith(searchQuery: query);
    loadInitial();
  }

  void refresh() => loadInitial();
}

final allDonghuaProvider = StateNotifierProvider<AllDonghuaNotifier, AllDonghuaState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AllDonghuaNotifier(apiClient);
});
