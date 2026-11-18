import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../../core/api/account_api.dart';
import '../../../core/api/api_client.dart';
import '../welcome_screen.dart';

class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  bool isConfirmedChecked = false;
  bool _isDeleting = false;
  final TextEditingController deleteController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  @override
  void dispose() {
    deleteController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  void _showError(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  /// Clears the local session and returns to the welcome screen after a
  /// successful (or already-completed) deletion.
  Future<void> _finishDeletion({required bool alreadyDeleted}) async {
    try {
      await FirebaseAuth.instance.signOut();
    } catch (_) {
      // The Auth account may already be gone; the local session is
      // cleared by navigation regardless.
    }

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          alreadyDeleted
              ? 'This account was already deleted.'
              : 'Your account has been deleted.',
        ),
        backgroundColor: Colors.green,
      ),
    );

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const WelcomeScreen()),
      (route) => false,
    );
  }

  Future<void> _deleteAccount() async {
    if (_isDeleting) return;

    if (passwordController.text.isEmpty) {
      _showError('Enter your password to continue.');
      return;
    }

    if (deleteController.text.trim() != 'DELETE') {
      _showError('Type DELETE to confirm.');
      return;
    }

    if (!isConfirmedChecked) {
      _showError('Please confirm that you understand this is permanent.');
      return;
    }

    setState(() {
      _isDeleting = true;
    });

    try {
      final user = FirebaseAuth.instance.currentUser;

      if (user == null || user.email == null) {
        _showError('No signed-in account to delete.');
        return;
      }

      // Re-authentication precondition for POST /deleteAccount
      // (api-contract.md §5.6).
      final credential = EmailAuthProvider.credential(
        email: user.email!,
        password: passwordController.text,
      );
      await user.reauthenticateWithCredential(credential);

      if (!mounted) return;

      final result = await AccountApi.deleteAccount();

      if (!mounted) return;

      if (result is ApiFailure) {
        if (result.status == 401 || result.status == 403) {
          // The account is already gone: clear the local session.
          await _finishDeletion(alreadyDeleted: true);
        } else if (result.isRetryable) {
          _showError(
            'Deletion is temporarily unavailable. ${result.message} '
            'Please try again.',
          );
        } else {
          _showError(result.message);
        }
        return;
      }

      await _finishDeletion(alreadyDeleted: false);
    } on FirebaseAuthException catch (e) {
      String message;

      switch (e.code) {
        case 'wrong-password':
        case 'invalid-credential':
        case 'invalid-login-credentials':
          message = 'The password is incorrect.';
          break;
        case 'user-mismatch':
          message = 'This account no longer matches the signed-in user.';
          break;
        case 'requires-recent-login':
          message = 'Please sign in again before deleting your account.';
          break;
        case 'too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
        case 'network-request-failed':
          message = 'Cannot connect to the Firebase Emulator.';
          break;
        default:
          message = e.message ?? 'Re-authentication failed.';
      }

      _showError(message);
    } catch (e) {
      _showError('Unexpected error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isDeleting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 16),
                  const Text('PERMANENT ACCOUNT SHUTDOWN', style: TextStyle(fontSize: 9, color: Colors.grey, letterSpacing: 0.5)),
                ],
              ),
              const SizedBox(height: 12),
              const Text('Delete your account?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 16),

              // تحذير أحمر كبير
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.redAccent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.redAccent.withValues(alpha: 0.4)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Icon(Icons.error_outline, color: Colors.redAccent, size: 18),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'This action cannot be undone.\nYour profile, course progress, quiz history, and all saved notes will be permanently deleted.',
                        style: TextStyle(fontSize: 11, color: Colors.redAccent, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // معلومات الحساب المراد حذفه
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Account to be deleted', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    SizedBox(height: 4),
                    Text('sara.ahmed@example.com', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                    SizedBox(height: 8),
                    Text('• 3 completed courses • 25 finished lessons\n• All offline packages will be wiped', style: TextStyle(fontSize: 11, color: Colors.grey, height: 1.4)),
                  ],
                ),
              ),

              const SizedBox(height: 16),
              const Text('Confirm your password', style: TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 4),
              TextField(
                controller: passwordController,
                obscureText: true,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Enter your account password',
                  hintStyle: const TextStyle(color: Colors.grey, fontSize: 12),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),

              const SizedBox(height: 12),
              const Text('Type DELETE to confirm', style: TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 4),
              TextField(
                controller: deleteController,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'DELETE',
                  hintStyle: const TextStyle(color: Colors.grey, fontSize: 12),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),

              const SizedBox(height: 12),
              Row(
                children: [
                  Checkbox(
                    value: isConfirmedChecked,
                    onChanged: (val) {
                      setState(() {
                        isConfirmedChecked = val ?? false;
                      });
                    },
                    activeColor: Colors.redAccent,
                  ),
                  const Expanded(
                    child: Text('I understand that all my learning data will be permanently destroyed.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // زر الحذف النهائي
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: _isDeleting ? null : _deleteAccount,
                  icon: _isDeleting
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.warning, size: 16, color: Colors.white),
                  label: Text(
                    _isDeleting ? 'Deleting account…' : 'Permanently delete account',
                    style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent.withValues(alpha: 0.8),
                    disabledBackgroundColor:
                        Colors.redAccent.withValues(alpha: 0.4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF1E293B)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Keep my account', style: TextStyle(fontSize: 13, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}