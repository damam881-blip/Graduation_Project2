import 'package:flutter/material.dart';
import 'custom_bottom_nav_bar.dart';

class AiTutorQuizRestrictionScreen extends StatelessWidget {
  const AiTutorQuizRestrictionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            // 1. الشريط العلوي والعنوان
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('EXPLAIN IT. CONNECT IT. UNDERSTAND IT.', style: TextStyle(fontSize: 8, color: Colors.grey, letterSpacing: 0.5)),
                      SizedBox(height: 2),
                      Text('Your networking tutor', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                  OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF1E293B)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                    ),
                    child: const Text('عربي', style: TextStyle(color: Color(0xFF0284C7), fontSize: 11)),
                  ),
                ],
              ),
            ),

            // 2. أزرار التبديل العلوية (معطلة أو باهتة قليلاً لتوضيح وضع القفل)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        alignment: Alignment.center,
                        child: const Text('This course', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        alignment: Alignment.center,
                        child: const Text('General chat', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // المحتوى الرئيسي لشاشة وضع التركيز
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  children: [
                    // كارت Focus mode is on الكبير
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.amber.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.shield_outlined, color: Colors.amber, size: 32),
                          ),
                          const SizedBox(height: 16),
                          const Text('Focus mode is on', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 8),
                          const Text(
                            'Your assessment is active. General and course chats are paused to keep every attempt fair.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 12, color: Colors.grey, height: 1.4),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // كارت التحذير البرتقالي (Tutor unavailable)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 18),
                          SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Tutor unavailable during active quizzes', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.amber)),
                                SizedBox(height: 2),
                                Text(
                                  'You can chat again after your quiz is submitted or the timer expires. Switching languages will not remove this restriction.',
                                  style: TextStyle(fontSize: 11, color: Colors.grey, height: 1.3),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // شريط حالة الاختبار والمؤقت الزمني
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.amber.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('• IPv4 assessment active', style: TextStyle(fontSize: 11, color: Colors.amber, fontWeight: FontWeight.bold)),
                          ),
                          const Text('06:42', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.amber, fontFamily: 'monospace')),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // زر العودة للاختبار (Return to my quiz)
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () {
                          // العودة للصفحة السابقة (اللي هي الاختبار)
                          Navigator.pop(context);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Return to my quiz', style: TextStyle(fontSize: 14, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // خانة كتابة وهمية مقفلة
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Row(
                        children: const [
                          Expanded(
                            child: Text('Tutor paused during your quiz', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          ),
                          Icon(Icons.lock_outline, color: Colors.grey, size: 16),
                        ],
                      ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
   bottomNavigationBar: const CustomBottomNavBar(currentIndex: 2, isAssessmentActive: true),
      // // الشريط السفلي الثابت
      // bottomNavigationBar: Container(
      //   padding: const EdgeInsets.symmetric(vertical: 8),
      //   decoration: const BoxDecoration(
      //     color: Color(0xFF0F172A),
      //     border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      //   ),
      //   child: Row(
      //     mainAxisAlignment: MainAxisAlignment.spaceAround,
      //     children: [
      //       _buildNavItem(context, Icons.menu_book, 'Learn', false, () {
      //         Navigator.pop(context);
      //       }),
      //       _buildNavItem(context, Icons.grid_view_outlined, 'Tools', false, () {
      //         Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const SubnetCalculatorScreen()));
      //       }),
      //       _buildNavItem(context, Icons.psychology_outlined, 'AI Tutor', true, () {}),
      //       _buildNavItem(context, Icons.person_outline, 'Profile', false, () {
      //         Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const ProfileScreen()));
      //       }),
      //     ],
      //   ),
      // ),
    );
  }

}