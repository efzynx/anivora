import 'package:dio/dio.dart';

class ApiClient {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );
  
  final Dio _dio;

  ApiClient() : _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  )) {
    _dio.interceptors.add(LogInterceptor(responseBody: true, requestBody: true));
  }

  Future<Map<String, dynamic>> getHomeFeed() async {
    try {
      final response = await _dio.get('/home');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Failed to load home feed: $e');
    }
  }

  Future<Map<String, dynamic>> getContentDetail(String id) async {
    try {
      final response = await _dio.get('/contents/$id');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Failed to load content detail: $e');
    }
  }

  Future<List<dynamic>> getEpisodes(String id) async {
    try {
      final response = await _dio.get('/contents/$id/episodes');
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Failed to load episodes: $e');
    }
  }

  Future<Map<String, dynamic>> resolvePlayback(String episodeId) async {
    try {
      final response = await _dio.get('/episodes/$episodeId/play');
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Failed to resolve playback: $e');
    }
  }

  Future<Map<String, dynamic>> getAllDonghua({int page = 1, int limit = 30, String query = ''}) async {
    try {
      final params = <String, dynamic>{'page': page, 'limit': limit};
      if (query.isNotEmpty) params['q'] = query;
      final response = await _dio.get('/donghua', queryParameters: params);
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Failed to load all donghua: $e');
    }
  }

  Future<List<dynamic>> searchContent(String query) async {
    try {
      final response = await _dio.get('/search', queryParameters: {'q': query});
      return response.data as List<dynamic>;
    } catch (e) {
      throw Exception('Failed to search: $e');
    }
  }
}
