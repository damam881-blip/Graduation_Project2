import 'package:flutter/material.dart';

class QuizResultScreen extends StatelessWidget {
  const QuizResultScreen({super.key});
 Widget _buildNavItem(IconData icon, String label, bool isSelected) {
    return Column(
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
  }
  @override
  Widget build(BuildContext context) {
    // قائمة الأسئلة الـ 10 الكاملة مع إجاباتها وشرحها وتحديد الصحيح والخاطئ منها
    final List reviewQuestions = [
      {
        'num': 'QUESTION 01',
        'question': 'Which subnet mask corresponds to a /24 prefix?',
        'isCorrect': true,
        'userAnswer': '255.255.255.0',
        'explanation': 'A /24 prefix means 24 network bits, leaving 8 host bits. In dotted-decimal notation, this is 255.255.255.0.',
      },
      {
        'num': 'QUESTION 02',
        'question': 'Which subnet mask corresponds to a /25 prefix?',
        'isCorrect': true,
        'userAnswer': '255.255.255.128',
        'explanation': 'A /25 prefix borrows 1 bit from the host portion, changing the fourth octet to 128 (255.255.255.128).',
      },
      {
        'num': 'QUESTION 03',
        'question': 'Which subnet mask corresponds to a /26 prefix?',
        'isCorrect': true,
        'userAnswer': '255.255.255.192',
        'explanation': 'A /26 prefix borrows 2 bits, resulting in 192 in the final octet (255.255.255.192).',
      },
      {
        'num': 'QUESTION 04',
        'question': 'A /30 subnet provides 6 usable host addresses.',
        'isCorrect': false,
        'userAnswer': 'True',
        'correctAnswer': 'False',
        'explanation': 'A /30 subnet leaves 2 host bits. 2^2 = 4 total addresses, minus 2 for network and broadcast, leaving 2 usable host addresses.',
      },
      {
        'num': 'QUESTION 05',
        'question': 'How many usable host addresses are in a /28 subnet?',
        'isCorrect': true,
        'userAnswer': '14',
        'explanation': 'A /28 subnet leaves 4 host bits. 2^4 = 16 total addresses minus 2 (network and broadcast) = 14 usable hosts.',
      },
      {
        'num': 'QUESTION 06',
        'question': 'Which IP class is reserved for multicast traffic?',
        'isCorrect': true,
        'userAnswer': 'Class D',
        'explanation': 'Class D IP addresses (ranging from 224.0.0.0 to 239.255.255.255) are strictly reserved for multicast communications.',
      },
      {
        'num': 'QUESTION 07',
        'question': 'What is the default subnet mask for a Class C network?',
        'isCorrect': true,
        'userAnswer': '255.255.255.0',
        'explanation': 'Class C networks use a default CIDR notation of /24, which translates to a subnet mask of 255.255.255.0.',
      },
      {
        'num': 'QUESTION 08',
        'question': 'Which protocol is used to assign IP addresses dynamically?',
        'isCorrect': true,
        'userAnswer': 'DHCP',
        'explanation': 'Dynamic Host Configuration Protocol (DHCP) automatically assigns IP addresses and network parameters to devices.',
      },
      {
        'num': 'QUESTION 09',
        'question': 'What layer of the OSI model does a router operate at?',
        'isCorrect': true,
        'userAnswer': 'Layer 3 (Network)',
        'explanation': 'Routers operate at Layer 3 (the Network layer) because they make forwarding decisions based on logical IP addresses.',
      },
      {
        'num': 'QUESTION 10',
        'question': 'A /30 provides 2 usable hosts.',
        'isCorrect': false,
        'userAnswer': 'False',
        'correctAnswer': 'True',
        'explanation': 'A /30 subnet provides exactly 2 usable host addresses, making this statement True.',
      },
    ];

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
                      const Text(
                        'IPv4 assessment • Evaluation',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
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
                    // عنوان النتيجة الرئيسية
                    const Text(
                      'A stronger foundation',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 14),

                    // كارت النتيجة المئوية الكبير (80%)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withOpacity(0.5),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.green.withOpacity(0.4)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.check_circle, color: Colors.green, size: 22),
                              SizedBox(width: 8),
                              Text('80%', style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Text('8 correct • Unlocked 80%', style: TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          const Text('2 incorrect • Unanswered 0 • Completed 10 of 10', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // كارت بدء الكورس التالي (Start Routing essentials)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF0284C7).withOpacity(0.4)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('You\'ve unlocked Routing essentials!', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 4),
                          const Text('You\'ve met the 70% minimum passing threshold required to move to the next course.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            height: 40,
                            child: ElevatedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.add, size: 16, color: Colors.white),
                              label: const Text('Start Routing essentials', style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0284C7),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // عنوان قسم المراجعة
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('Review every answer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                        Text('10 questions', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text('This is a breakdown of all 10 answers. Pay close attention to any incorrect answers.', style: TextStyle(fontSize: 11, color: Colors.grey)),

                    const SizedBox(height: 16),

                    // عرض كل الأسئلة الـ 10 ديناميكياً باستخدام List.generate
                    ...List.generate(reviewQuestions.length, (index) {
                      final q = reviewQuestions[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _buildReviewItem(
                          questionNum: q['num'],
                          isCorrect: q['isCorrect'],
                          questionText: q['question'],
                          userAnswer: q['userAnswer'],
                          correctAnswer: q['correctAnswer'],
                          explanation: q['explanation'],
                        ),
                      );
                    }),

                    const SizedBox(height: 20),

                    // زر العودة للمسار السفلي
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF1E293B)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Return to learning path', style: TextStyle(fontSize: 13, color: Colors.white)),
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
            _buildNavItem(Icons.psychology_outlined, 'AI Tutor', false),
            _buildNavItem(Icons.person_outline, 'Profile', false),
          ],
        ),
      ),
    );
  }

  // مساعد لإنشاء كارت مراجعة السؤال (سواء صح أو خطأ)
  Widget _buildReviewItem({
    required String questionNum,
    required bool isCorrect,
    required String questionText,
    required String userAnswer,
    String? correctAnswer,
    required String explanation,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCorrect ? Colors.green.withOpacity(0.3) : Colors.red.withOpacity(0.4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(questionNum, style: TextStyle(fontSize: 9, color: isCorrect ? Colors.green : Colors.red, fontWeight: FontWeight.bold)),
              Icon(
                isCorrect ? Icons.check_circle_outline : Icons.cancel_outlined,
                color: isCorrect ? Colors.green : Colors.red,
                size: 16,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(questionText, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 10),
          
          // إجابة الطالب
          const Text('Your answer:', style: TextStyle(fontSize: 10, color: Colors.grey)),
          const SizedBox(height: 2),
          Text(
            userAnswer,
            style: TextStyle(fontSize: 12, color: isCorrect ? Colors.green : Colors.red, fontWeight: FontWeight.bold),
          ),

          // لو الإجابة خاطئة نعرض الإجابة الصحيحة
          if (!isCorrect && correctAnswer != null) ...[
            const SizedBox(height: 6),
            const Text('Correct answer:', style: TextStyle(fontSize: 10, color: Colors.grey)),
            const SizedBox(height: 2),
            Text(correctAnswer, style: const TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.bold)),
          ],

          const SizedBox(height: 10),
          Text(explanation, style: const TextStyle(fontSize: 11, color: Colors.grey, height: 1.4)),
        ],
      ),
    );
  }
}