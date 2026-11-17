import 'package:flutter/material.dart';
import 'quiz_screen.dart'; // استيراد صفحة الكويز التفاعلية
import 'ai_tutor_screen.dart'; // استيراد شاشة المعلم الذكي
import 'subnet_calculator_screen.dart';
import 'profile_screen.dart';

class LessonReaderScreen extends StatelessWidget {
  const LessonReaderScreen({super.key});

  Widget _buildNavItem(BuildContext context, IconData icon, String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
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
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            // 1. شريط العرض العلوي (Header)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
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
                          const SizedBox(width: 16),
                          const Text(
                            'COURSE 03 • IPV4 & SUBNETTING',
                            style: TextStyle(fontSize: 9, color: Colors.grey, letterSpacing: 0.5),
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
                  const SizedBox(height: 8),
                  const Text(
                    'Choosing a subnet mask',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0284C7).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('LESSON 3 OF 5', style: TextStyle(fontSize: 9, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                      ),
                      const Text('8 min read', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // خط التقدم للدرس (Progress Line)
                  LinearProgressIndicator(
                    value: 0.6,
                    backgroundColor: const Color(0xFF1E293B),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0284C7)),
                    minHeight: 3,
                  ),
                ],
              ),
            ),

            // 2. محتوى الدرس وقارئ المقال (Scrollable Content)
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'One network.\nSmaller, smarter subnets.',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white, height: 1.2),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'A subnet mask separates the network portion of an IPv4 address from its host portion. A longer prefix gives you more subnets, but fewer hosts in each one.',
                      style: TextStyle(fontSize: 12, color: Colors.grey, height: 1.5),
                    ),
                    
                    const SizedBox(height: 16),

                    // كارت تمثيلي للشبكة (LAN TO WAN)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withOpacity(0.5),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('LAN TO WAN', style: TextStyle(fontSize: 9, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                              const Icon(Icons.hub, color: Colors.grey, size: 16),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: const [
                              _NetworkNode(icon: Icons.laptop, label: 'Laptop'),
                              Icon(Icons.remove, color: Colors.grey),
                              _NetworkNode(icon: Icons.lan, label: 'Switch'),
                              Icon(Icons.remove, color: Colors.grey),
                              _NetworkNode(icon: Icons.router, label: 'Router'),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Center(
                            child: Text(
                              '192.168.10.0/24 + 192.168.20.0/24',
                              style: TextStyle(fontSize: 11, color: Color(0xFF0284C7), fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Center(
                            child: Text('A router forwards packets between networks.', style: TextStyle(fontSize: 10, color: Colors.grey)),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),
                    const Text('From /24 to /26', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 8),
                    const Text(
                      'Borrow 2 host bits from a /24 network. You create 4 equal /26 subnets. Each contains 64 addresses: 1 network, 1 broadcast and 62 usable host addresses.',
                      style: TextStyle(fontSize: 12, color: Colors.grey, height: 1.5),
                    ),

                    const SizedBox(height: 16),

                  
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withOpacity(0.4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF0284C7).withOpacity(0.3)),
                      ),
                      child: TextButton.icon(
                        onPressed: () {
                          // الانتقال لشاشة المعلم الذكي في وضع "This course" الخاص بالدرس الحالي
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const AiTutorScreen(
                                initialIsCourseContext: true,
                                lessonTitle: 'IPv4 & subnetting\nLesson 3 · Choosing a subnet mask',
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.psychology, color: Color(0xFF0284C7), size: 18),
                        label: const Text(
                          'Ask AI Tutor about this lesson',
                          style: TextStyle(color: Color(0xFF0284C7), fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // 3. منطقة سؤال التحدي / نقطة التحقق (Required Checkpoint)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withOpacity(0.6),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF0284C7).withOpacity(0.4)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('REQUIRED CHECKPOINT', style: TextStyle(fontSize: 9, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                              const Icon(Icons.help_outline, color: Color(0xFF0284C7), size: 16),
                            ],
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'You need 50 usable host addresses. Which is the smallest suitable subnet?',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white, height: 1.3),
                          ),
                          const SizedBox(height: 14),
                          
                          // الخيارات (Options)
                          _buildQuizOption('A', '/27 - 30 hosts', false),
                          const SizedBox(height: 8),
                          _buildQuizOption('B', '/26 - 62 hosts', true),
                          const SizedBox(height: 8),
                          _buildQuizOption('C', '/25 - 126 hosts', false),

                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 40,
                            child: ElevatedButton(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => const QuizScreen()),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0284C7),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('Check answer', style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Center(
                            child: Text('Answer correctly to complete this lesson. Unlimited attempts.', style: TextStyle(fontSize: 10, color: Colors.grey)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),

            // 4. زر الإكمال السفلي مع حماية منع الزائر
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                border: Border(top: BorderSide(color: Color(0xFF1E293B))),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    bool isLoggedIn = false; 

                    if (isLoggedIn) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const QuizScreen()),
                      );
                    } else {
                      showDialog(
                        context: context,
                        builder: (context) => AlertDialog(
                          backgroundColor: const Color(0xFF1E293B),
                          title: const Text('Access Restricted', style: TextStyle(color: Colors.white, fontSize: 16)),
                          content: const Text(
                            'Guests cannot take graded assessments or quizzes. Please log in or create a free account to access exams.',
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                Navigator.pop(context);
                              },
                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0284C7)),
                              child: const Text('Log In', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Complete checkpoint to continue', style: TextStyle(fontSize: 14, color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ],
        ),
      ),

      // 5. الشريط السفلي الثابت (مربوط بالصفحات الأخرى)
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          border: Border(top: BorderSide(color: Color(0xFF1E293B))),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(context, Icons.menu_book, 'Learn', true, () {}),
            _buildNavItem(context, Icons.grid_view_outlined, 'Tools', false, () {
              Navigator.push(context, MaterialPageRoute(builder: (context) => const SubnetCalculatorScreen()));
            }),
            // أيقونة AI Tutor في الشريط السفلي تفتح وضع الـ General Chat الافتراضي
            _buildNavItem(context, Icons.psychology_outlined, 'AI Tutor', false, () {
              Navigator.push(context, MaterialPageRoute(builder: (context) => const AiTutorScreen()));
            }),
            _buildNavItem(context, Icons.person_outline, 'Profile', false, () {
              Navigator.push(context, MaterialPageRoute(builder: (context) => const ProfileScreen()));
            }),
          ],
        ),
      ),
    );
  }

  // مساعد لإنشاء أزرار خيارات الاختبار
  Widget _buildQuizOption(String letter, String text, bool isSelected) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFF0284C7).withOpacity(0.2) : const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF1E293B),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(letter, style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 12),
          Text(text, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : Colors.grey[300])),
        ],
      ),
    );
  }
}

// مساعدة لعقد الشبكة (Network Node)
class _NetworkNode extends StatelessWidget {
  final IconData icon;
  final String label;
  const _NetworkNode({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFF0284C7).withOpacity(0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: const Color(0xFF0284C7), size: 20),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
      ],
    );
  }
}