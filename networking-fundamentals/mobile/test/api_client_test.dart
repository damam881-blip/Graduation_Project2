import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:networking_fundamentals/core/api/api_client.dart';

void main() {
  group('ApiClient', () {
    test('posts JSON with a bearer token and parses the success envelope', () async {
      late http.Request captured;
      final client = ApiClient(
        httpClient: MockClient((request) async {
          captured = request;
          return http.Response(
            jsonEncode(<String, dynamic>{
              'success': true,
              'data': <String, dynamic>{'uid': 'abc', 'role': 'student'},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
      );

      final result = await client.postJson(
        'profile',
        idToken: 'token-123',
        body: <String, dynamic>{'displayName': 'Sara'},
      );

      expect(result, isA<ApiSuccess<Map<String, dynamic>>>());
      final success = result as ApiSuccess<Map<String, dynamic>>;
      expect(success.data['uid'], 'abc');
      expect(captured.method, 'POST');
      expect(captured.url.path, contains('/profile'));
      expect(captured.headers['Authorization'], 'Bearer token-123');
      expect(captured.headers['Content-Type'], 'application/json');
      expect(jsonDecode(captured.body), <String, dynamic>{'displayName': 'Sara'});
    });

    test('parses the documented error envelope', () async {
      final client = ApiClient(
        httpClient: MockClient((request) async {
          return http.Response(
            jsonEncode(<String, dynamic>{
              'success': false,
              'error': <String, dynamic>{
                'code': 'FORBIDDEN',
                'message': 'You do not have permission.',
              },
            }),
            403,
          );
        }),
      );

      final result = await client.postJson('profile', idToken: 'token');

      expect(result, isA<ApiFailure>());
      final failure = result as ApiFailure;
      expect(failure.code, 'FORBIDDEN');
      expect(failure.message, 'You do not have permission.');
      expect(failure.status, 403);
      expect(failure.isRetryable, isFalse);
    });

    test('maps malformed responses to UNEXPECTED_RESPONSE', () async {
      final client = ApiClient(
        httpClient: MockClient((request) async => http.Response('not json', 500)),
      );

      final result = await client.postJson('profile', idToken: 'token');

      final failure = result as ApiFailure;
      expect(failure.code, 'UNEXPECTED_RESPONSE');
      expect(failure.message, 'Unexpected response from the backend.');
      expect(failure.status, 500);
    });

    test('maps transport failures to a retryable NETWORK_ERROR', () async {
      final client = ApiClient(
        httpClient: MockClient((request) async => throw Exception('socket closed')),
      );

      final result = await client.postJson('profile', idToken: 'token');

      final failure = result as ApiFailure;
      expect(failure.code, 'NETWORK_ERROR');
      expect(failure.status, 0);
      expect(failure.isRetryable, isTrue);
    });

    test('marks a backend 503 as retryable', () async {
      final client = ApiClient(
        httpClient: MockClient(
          (request) async => http.Response(
            jsonEncode(<String, dynamic>{
              'success': false,
              'error': <String, dynamic>{
                'code': 'PROFILE_UNAVAILABLE',
                'message': 'The profile service is temporarily unavailable.',
              },
            }),
            503,
          ),
        ),
      );

      final result = await client.postJson('profile', idToken: 'token');

      final failure = result as ApiFailure;
      expect(failure.code, 'PROFILE_UNAVAILABLE');
      expect(failure.status, 503);
      expect(failure.isRetryable, isTrue);
    });
  });

  test('ApiFailure constants are stable', () async {
    const failure = ApiFailure('NETWORK_TIMEOUT', 'Timed out.', 0);

    expect(failure.isRetryable, isTrue);
    expect(failure.code, 'NETWORK_TIMEOUT');
    expect(failure.status, 0);
  });

  test('ApiConfig builds the documented emulator URL', () {
    expect(ApiConfig.projectId, 'demo-networking-p1');
    expect(ApiConfig.baseUrl, 'http://127.0.0.1:5001/demo-networking-p1/us-central1');
  });
}
