import 'package:flutter/material.dart';
import 'sign_out_screen.dart'; 
import 'delete_account_screen.dart';
import 'custom_bottom_nav_bar.dart'; 

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

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
              const Text('YOUR LEARNING IDENTITY', style: TextStyle(fontSize: 8, color: Colors.grey, letterSpacing: 0.5)),
              const SizedBox(height: 2),
              const Text('Your learning identity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 16),
              
              // كارت معلومات المستخدم
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text('SA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                        const SizedBox(width: 14),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Sara Ahmed', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                            const SizedBox(height: 2),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
                              child: const Text('• Verified account', style: TextStyle(fontSize: 9, color: Colors.green, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text('sara.ahmed@example.com', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFF0284C7).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(6)),
                          child: const Text('• 3 / 10 completed', style: TextStyle(fontSize: 10, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(6)),
                          child: const Text('• 25 lessons finished', style: TextStyle(fontSize: 10, color: Colors.green, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),
              const Text('Learning preferences', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 8),
              
              _buildSettingItem(Icons.translate, 'App language', 'English • En-us (US)'),
              _buildSettingItem(Icons.palette_outlined, 'Appearance', 'Dark • More immersive'),
              _buildSettingItem(Icons.school_outlined, 'Learning curriculum', 'On • Default 1920'),
              _buildSettingItem(Icons.offline_bolt_outlined, 'Offline directories', 'Secure EN • 1754 MB'),

              const SizedBox(height: 20),
              const Text('Account & security', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 8),

              _buildSettingItem(Icons.lock_outline, 'Change password', 'Last updated 5 months ago'),
              _buildSettingItem(Icons.privacy_tip_outlined, 'Privacy & data', 'TLS 1.3 • AES-256 secure'),

              const SizedBox(height: 12),
              // كارت الحالة الآمنة للأمان
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
                      child: Text('Your progress is secured.\nLast synced: Today at 09:41.', style: TextStyle(fontSize: 11, color: Colors.green, height: 1.3)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // زر تسجيل الخروج الآمن
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => const SignOutScreen()));
                  },
                  icon: const Icon(Icons.logout, size: 16, color: Color(0xFF0284C7)),
                  label: const Text('Sign out securely', style: TextStyle(color: Color(0xFF0284C7), fontSize: 13)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF0284C7)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),

              const SizedBox(height: 10),

              // زر حذف الحساب (باللون الأحمر)
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => const DeleteAccountScreen()));
                  },
                  icon: const Icon(Icons.delete_outline, size: 16, color: Colors.redAccent),
                  label: const Text('Delete account', style: TextStyle(color: Colors.redAccent, fontSize: 13)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.redAccent),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),

     bottomNavigationBar: const CustomBottomNavBar(currentIndex: 3),
      // bottomNavigationBar: Container(
      //   padding: const EdgeInsets.symmetric(vertical: 8),
      //   decoration: const BoxDecoration(
      //     color: Color(0xFF0F172A),
      //     border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      //   ),
      //   child: Row(
      //     mainAxisAlignment: MainAxisAlignment.spaceAround,
      //     children: [
      //       _buildNavItem(context, Icons.menu_book, 'Learn', false, () => Navigator.pop(context)),
      //       _buildNavItem(context, Icons.grid_view_outlined, 'Tools', false, () {
      //         Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const SubnetCalculatorScreen()));
      //       }),
      //       _buildNavItem(context, Icons.psychology_outlined, 'AI Tutor', false, () {
      //         Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const AiTutorScreen()));
      //       }),
      //       _buildNavItem(context, Icons.person_outline, 'Profile', true, () {}),
      //     ],
      //   ),
      // ),
    );
  }

  Widget _buildSettingItem(IconData icon, String title, String subtitle) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF0284C7), size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
          ),
          const Icon(Icons.arrow_forward_ios, color: Colors.grey, size: 12),
        ],
      ),
    );
  }

}