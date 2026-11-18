import 'package:firebase_auth/firebase_auth.dart';

import 'api_client.dart';

/// `POST /deleteAccount` — deletes the caller's account through the
/// documented tombstone purge (api-contract.md §5.6).
///
/// The client must re-authenticate with the password immediately before
/// calling this. On `401` the token is refreshed once and the call is
/// retried, as the client contract requires (api-contract.md §6.1).
class AccountApi {
  AccountApi._();

  static final ApiClient _client = ApiClient();

  /// Requests deletion of the signed-in user's account.
  static Future<ApiResult<Map<String, dynamic>>> deleteAccount() async {
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

    var result = await _client.postJson('deleteAccount', idToken: token);

    if (result is ApiFailure && result.status == 401) {
      try {
        final refreshed = await user.getIdToken(true);

        if (refreshed != null) {
          result = await _client.postJson(
            'deleteAccount',
            idToken: refreshed,
          );
        }
      } catch (_) {
        // The Auth account is already gone; keep the original 401 so the
        // caller can treat it as an already-deleted account.
      }
    }

    return result;
  }
}
