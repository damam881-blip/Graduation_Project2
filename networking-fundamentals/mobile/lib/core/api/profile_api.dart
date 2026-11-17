import 'package:firebase_auth/firebase_auth.dart';

import 'api_client.dart';

/// `POST /profile` — creates `users/{uid}` on the backend (api-contract.md §5.5).
///
/// Safe to retry: the endpoint is idempotent per user.
class ProfileApi {
  ProfileApi._();

  static final ApiClient _client = ApiClient();

  /// Provisions the signed-in user's profile.
  ///
  /// The ID token is force-refreshed first: right after
  /// `updateDisplayName()` the cached token still lacks the `name` claim, and
  /// the backend derives `displayName` from that claim.
  ///
  /// On `401` the token is refreshed once more and the call is retried, as the
  /// client contract requires.
  static Future<ApiResult<Map<String, dynamic>>> provision() async {
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      return const ApiFailure(
        'UNAUTHENTICATED',
        'No signed-in user.',
        401,
      );
    }

    final token = await user.getIdToken(true);

    if (token == null) {
      return const ApiFailure(
        'INVALID_TOKEN',
        'The authentication token is unavailable.',
        401,
      );
    }

    var result = await _client.postJson('profile', idToken: token);

    if (result is ApiFailure && result.status == 401) {
      final refreshed = await user.getIdToken(true);

      if (refreshed != null) {
        result = await _client.postJson('profile', idToken: refreshed);
      }
    }

    return result;
  }
}
