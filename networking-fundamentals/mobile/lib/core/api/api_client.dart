import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// Shared configuration for the local Functions emulator.
///
/// The emulator host is the same `--dart-define` value Firebase Auth and
/// Firestore already use, so one flag keeps the whole app pointed at the
/// laptop.
class ApiConfig {
  ApiConfig._();

  static const String projectId = 'demo-networking-p1';

  static const String emulatorHost = String.fromEnvironment(
    'FIREBASE_EMULATOR_HOST',
    defaultValue: '127.0.0.1',
  );

  static const String baseUrl =
      'http://$emulatorHost:5001/$projectId/us-central1';
}

/// Discriminated result of one API call (api-contract.md §6.2).
sealed class ApiResult<T> {
  const ApiResult();
}

final class ApiSuccess<T> extends ApiResult<T> {
  const ApiSuccess(this.data);

  final T data;
}

final class ApiFailure extends ApiResult<Never> {
  const ApiFailure(this.code, this.message, this.status);

  final String code;
  final String message;
  final int status;

  /// `503` from the backend, or `0` for a transport failure, is safe to retry.
  bool get isRetryable => status == 503 || status == 0;
}

/// Thin JSON transport for the documented REST envelope.
class ApiClient {
  ApiClient({http.Client? httpClient}) : _http = httpClient ?? http.Client();

  static const Duration _timeout = Duration(seconds: 10);

  final http.Client _http;

  /// Sends `POST {baseUrl}/{path}` with a bearer token and parses the
  /// `{success, data}` / `{success, error}` envelope.
  Future<ApiResult<Map<String, dynamic>>> postJson(
    String path, {
    required String idToken,
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/$path');

    try {
      final response = await _http
          .post(
            uri,
            headers: {
              'Authorization': 'Bearer $idToken',
              'Content-Type': 'application/json',
            },
            body: body == null ? null : jsonEncode(body),
          )
          .timeout(_timeout);

      return _parse(response);
    } on TimeoutException {
      return const ApiFailure(
        'NETWORK_TIMEOUT',
        'The backend did not answer in time.',
        0,
      );
    } catch (_) {
      return const ApiFailure(
        'NETWORK_ERROR',
        'Cannot reach the backend. Check Wi-Fi and the local emulator.',
        0,
      );
    }
  }

  ApiResult<Map<String, dynamic>> _parse(http.Response response) {
    Map<String, dynamic>? json;

    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        json = decoded;
      }
    } catch (_) {
      json = null;
    }

    final data = json?['data'];

    if (response.statusCode == 200 &&
        json?['success'] == true &&
        data is Map<String, dynamic>) {
      return ApiSuccess(data);
    }

    final error = json?['error'];
    final code = error is Map && error['code'] is String
        ? error['code'] as String
        : 'UNEXPECTED_RESPONSE';
    final message = error is Map && error['message'] is String
        ? error['message'] as String
        : 'Unexpected response from the backend.';

    return ApiFailure(code, message, response.statusCode);
  }
}
