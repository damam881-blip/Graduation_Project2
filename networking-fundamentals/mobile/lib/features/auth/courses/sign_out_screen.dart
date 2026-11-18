import 'package:flutter/material.dart';

class SignOutScreen extends StatelessWidget {
  const SignOutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
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
                  const Text('SIGN OUT SESSION', style: TextStyle(fontSize: 9, color: Colors.grey, letterSpacing: 0.5)),
                ],
              ),
              const SizedBox(height: 12),
              const Text('Sign out securely', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 20),

              // أيقونة خروج مميزة
              Center(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.4)),
                  ),
                  child: const Icon(Icons.logout, color: Color(0xFF0284C7), size: 32),
                ),
              ),
              const SizedBox(height: 20),

              const Center(
                child: Text('Leave this device safely?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
              const SizedBox(height: 16),

              // كارت التنبيه بالخروج
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('You\'re signing out of Sara\'s account.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                    SizedBox(height: 4),
                    Text('sara.ahmed@example.com', style: TextStyle(fontSize: 11, color: Color(0xFF0284C7))),
                    SizedBox(height: 8),
                    Text(
                      'The session token and private cached chats will be removed from this device. Your record is kept safe in our cloud account.',
                      style: TextStyle(fontSize: 11, color: Colors.grey, height: 1.4),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // تأكيد الأمان
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.verified_user_outlined, color: Colors.green, size: 18),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text('Everything is secure.\nAll pending syncs will be safely processed on next login.', style: TextStyle(fontSize: 11, color: Colors.green, height: 1.3)),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // أزرار التأكيد والإلغاء
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  onPressed: () {
                    // إجراء تسجيل الخروج والعودة للبداية
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Confirm sign out', style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
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
                  child: const Text('Stay signed in', style: TextStyle(fontSize: 13, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }
}