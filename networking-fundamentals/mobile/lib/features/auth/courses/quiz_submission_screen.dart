import 'package:flutter/material.dart';
import 'ai_tutor_quiz_restriction_screen.dart';
import 'quiz_result_screen.dart';

class QuizSubmissionScreen extends StatelessWidget {
  const QuizSubmissionScreen({super.key});
Widget _buildNavItem(IconData icon, String label, bool isSelected, [VoidCallback? onTap]) {
    final item = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          color: isSelected ? const Color(0xFF0284C7) : Colors.grey,
          size: 22,
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: isSelected ? const Color(0xFF0284C7) : Colors.grey,
            fontSize: 10,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );

    if (onTap == null) {
      return item;
    }

    return GestureDetector(onTap: onTap, child: item);
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            // 1. الشريط العلوي (Header)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('COURSE 03 • ALL 5 LESSONS COMPLETE', style: TextStyle(fontSize: 8, color: Colors.grey, letterSpacing: 0.5)),
                          Text('IPv4 assessment', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                        ],
                      ),
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

            // محتوى الشاشة القابل للتمرير
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // مؤشر الوقت والأسئلة (10/10)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('QUESTION', style: TextStyle(fontSize: 9, color: Colors.grey, letterSpacing: 0.5)),
                                  const SizedBox(height: 2),
                                  const Text('10 / 10', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Row(
                                    children: const [
                                      Icon(Icons.timer_outlined, color: Colors.amber, size: 16),
                                      SizedBox(width: 4),
                                      Text('02:18', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.amber)),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  const Text('Server-synced • just now', style: TextStyle(fontSize: 9, color: Colors.grey)),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          LinearProgressIndicator(
                            value: 1.0,
                            backgroundColor: const Color(0xFF0F172A),
                            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0284C7)),
                            minHeight: 4,
                          ),
                          const SizedBox(height: 6),
                          const Text('Time limit: 15 minutes • Auto-submit at 00:00', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // نوع السؤال وحالته (True / False & Saved)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('• TRUE / FALSE', style: TextStyle(fontSize: 9, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.green.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('• Saved', style: TextStyle(fontSize: 9, color: Colors.green, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // نص السؤال الأخير
                    const Text(
                      'A /30 subnet provides 6 usable host addresses.',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white, height: 1.3),
                    ),
                    const SizedBox(height: 6),
                    const Text('Select one answer • 1 point', style: TextStyle(fontSize: 11, color: Colors.grey)),

                    const SizedBox(height: 16),

                    // خيارات True / False
                    _buildTrueFalseOption('T', 'True', true),
                    const SizedBox(height: 8),
                    _buildTrueFalseOption('F', 'False', false),

                    const SizedBox(height: 16),

                    // رسالة الحفظ النهائية (All 10 answers are saved)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: const [
                          Icon(Icons.check_circle_outline, color: Colors.green, size: 18),
                          SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('All 10 answers are saved', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green)),
                                SizedBox(height: 2),
                                Text('Last synced at 09:41:12. You can submit safely.', style: TextStyle(fontSize: 10, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // شريط رقمي للأسئلة (كلها مكتملة باللون الأخضر)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: List.generate(10, (index) {
                        return Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: index == 9 ? const Color(0xFF0284C7) : Colors.green.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: index == 9 ? const Color(0xFF0284C7) : Colors.green),
                          ),
                          child: Center(
                            child: Text(
                              '${index + 1}',
                              style: TextStyle(
                                fontSize: 11, 
                                fontWeight: FontWeight.bold, 
                                color: index == 9 ? Colors.white : Colors.green,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 6),
                    const Center(
                      child: Text('Green: saved • Blue: current • Outline: unanswered', style: TextStyle(fontSize: 9, color: Colors.grey)),
                    ),
                    
                    const SizedBox(height: 20),

                    // كارت الاستعداد للتسليم (Ready to submit 10 answers?)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.4)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Ready to submit 10 answers?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 4),
                          const Text('Your attempt will be final. A score of 70% or higher unlocks Routing essentials.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          const SizedBox(height: 14),
                          SizedBox(
  width: double.infinity,
  height: 44,
  child: ElevatedButton.icon(
    onPressed: () {
      // --- هنا بنربط الزرار بالانتقال لشاشة النتيجة والمراجعة ---
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const QuizResultScreen()),
      );
    },
    icon: const Icon(Icons.send, size: 16, color: Colors.white),
    label: const Text('Submit quiz', style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
    style: ElevatedButton.styleFrom(
      backgroundColor: const Color(0xFF0284C7),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
  ),
),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),

            // زر المراجعة السفلي
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                border: Border(top: BorderSide(color: Color(0xFF1E293B))),
              ),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF1E293B)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Continue reviewing', style: TextStyle(fontSize: 13, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text('AI Tutor and learning tools are unavailable during this quiz.', style: TextStyle(fontSize: 9, color: Colors.grey)),
                ],
              ),
            ),
          ],
        ),
      ),
       bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          border: Border(top: BorderSide(color: Color(0xFF1E293B))),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(Icons.menu_book, 'Learn', true),
            _buildNavItem(Icons.grid_view_outlined, 'Tools', false),
            _buildNavItem(Icons.psychology_outlined, 'AI Tutor', false, () {
              // لم يُرسل الاختبار بعد: شاشة وضع التركيز (Focus mode)
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const AiTutorQuizRestrictionScreen(),
                ),
              );
            }),
            _buildNavItem(Icons.person_outline, 'Profile', false),
          ],
        ),
      ),
    );
  }

  Widget _buildTrueFalseOption(String letter, String text, bool isSelected) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFF0284C7).withValues(alpha: 0.2) : const Color(0xFF1E293B).withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF1E293B),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(letter, style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 14),
          Text(text, style: TextStyle(fontSize: 13, color: isSelected ? Colors.white : Colors.grey[300])),
        ],
      ),
    );
  }
}