import 'package:flutter/material.dart';
import 'ai_tutor_quiz_restriction_screen.dart';
import 'quiz_submission_screen.dart';
class QuizScreen extends StatefulWidget {
 
  const QuizScreen({super.key});
 // دالة مساعدة لبناء عناصر الشريط السفلي
  
  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  int currentQuestionIndex = 6; // البدء من السؤال السابع (07 / 10) كما في ديزاين فيجما
  int? selectedOptionIndex; // مؤشر الإجابة المختارة
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
  // قائمة أسئلة تجريبية للاختبار
  final List questions = [
    {
      'question': 'Which subnet mask corresponds to a /24 prefix?',
      'options': ['255.255.255.0', '255.255.0.0', '255.0.0.0', '255.255.255.128'],
      'correct': 0,
    },
    {
      'question': 'Which subnet mask corresponds to a /25 prefix?',
      'options': ['255.255.255.128', '255.255.255.192', '255.255.255.224', '255.255.255.240'],
      'correct': 0,
    },
    {
      'question': 'Which subnet mask corresponds to a /26 prefix?',
      'options': ['255.255.255.128', '255.255.255.192', '255.255.255.224', '255.255.255.240'],
      'correct': 1,
    },
    {
      'question': 'How many usable host addresses are in a /28 subnet?',
      'options': ['14', '30', '62', '126'],
      'correct': 0,
    },
    {
      'question': 'Which IP class is reserved for multicast traffic?',
      'options': ['Class A', 'Class B', 'Class C', 'Class D'],
      'correct': 3,
    },
    {
      'question': 'What is the default subnet mask for a Class C network?',
      'options': ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.192'],
      'correct': 2,
    },
    {
      'question': 'Which subnet mask corresponds to a /26 prefix?',
      'options': ['255.255.255.128', '255.255.255.192', '255.255.255.224', '255.255.255.240'],
      'correct': 1,
    },
    {
      'question': 'Which protocol is used to assign IP addresses dynamically?',
      'options': ['DNS', 'DHCP', 'HTTP', 'FTP'],
      'correct': 1,
    },
    {
      'question': 'What layer of the OSI model does a router operate at?',
      'options': ['Layer 1 (Physical)', 'Layer 2 (Data Link)', 'Layer 3 (Network)', 'Layer 4 (Transport)'],
      'correct': 2,
    },
    {
      'question': 'Which device connects multiple networks together and forwards packets?',
      'options': ['Hub', 'Switch', 'Router', 'Repeater'],
      'correct': 2,
    },
  ];

  @override
  Widget build(BuildContext context) {
    // جلب بيانات السؤال الحالي بشكل آمن وصريح
    final Map<String, dynamic> questionData = currentQuestionIndex < questions.length 
        ? questions[currentQuestionIndex] 
        : questions[0];

    final List<String> optionsList = List<String>.from(questionData['options']);

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

            // محتوى الكويز القابل للتمرير
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // عداد الأسئلة والوقت
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
                                  Text('${(currentQuestionIndex + 1).toString().padLeft(2, '0')} / 10', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Row(
                                    children: const [
                                      Icon(Icons.timer_outlined, color: Color(0xFF0284C7), size: 16),
                                      SizedBox(width: 4),
                                      Text('06:42', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
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
                            value: (currentQuestionIndex + 1) / 10,
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

                    // نوع السؤال وحالته
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('• MULTIPLE CHOICE', style: TextStyle(fontSize: 9, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.amber.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('• Not saved yet', style: TextStyle(fontSize: 9, color: Colors.amber, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // نص السؤال
                    Text(
                      questionData['question'] as String, 
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white, height: 1.3),
                    ),
                    const SizedBox(height: 6),
                    const Text('Select one answer • 1 point', style: TextStyle(fontSize: 11, color: Colors.grey)),

                    const SizedBox(height: 16),

                    // خيارات الإجابة التفاعلية (Options)
                    ...List.generate(optionsList.length, (index) {
                      final bool isSelected = selectedOptionIndex == index;
                      final String optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                      
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              selectedOptionIndex = index; // تحديد الاختيار التفاعلي
                            });
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
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
                                  child: Text(optionLetter, style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Text(
                                    optionsList[index],
                                    style: TextStyle(fontSize: 13, color: isSelected ? Colors.white : Colors.grey[300]),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),

                    const SizedBox(height: 10),

                    // رسالة حفظ الإجابة
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: const [
                          Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 18),
                          SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Saving your latest answer...', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber)),
                                SizedBox(height: 2),
                                Text('6 of 10 answers saved. Stay on this screen until sync completes.', style: TextStyle(fontSize: 10, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // شريط رقمي للأسئلة السفلي (1 إلى 10)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: List.generate(10, (index) {
                        final bool isCurrent = currentQuestionIndex == index;
                        final bool isCompleted = index < currentQuestionIndex;

                        Color bgColor = const Color(0xFF1E293B);
                        Color textColor = Colors.grey;
                        if (isCurrent) {
                          bgColor = const Color(0xFF0284C7);
                          textColor = Colors.white;
                        } else if (isCompleted) {
                          bgColor = Colors.green.withValues(alpha: 0.2);
                          textColor = Colors.green;
                        }

                        return InkWell(
                          onTap: () {
                            setState(() {
                              currentQuestionIndex = index;
                              selectedOptionIndex = null; // إعادة تعيين الاختيار للسؤال الجديد
                            });
                          },
                          child: Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: bgColor,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: isCurrent ? const Color(0xFF0284C7) : const Color(0xFF1E293B)),
                            ),
                            child: Center(
                              child: Text(
                                '${index + 1}',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: textColor),
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
                  ],
                ),
              ),
            ),

            // 3. الأزرار السفلية للتنقل (Next / Previous)
           // 3. الأزرار السفلية للتنقل (Next / Previous)
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
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() {
                          if (currentQuestionIndex < 9) {
                            // لو لسه موصلناش للسؤال العاشر، انتقل للسؤال التالي
                            currentQuestionIndex++;
                            selectedOptionIndex = null;
                          } else {
                            // لو وصلنا للسؤال العاشر، افتح شاشة التسليم (QuizSubmissionScreen)
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const QuizSubmissionScreen()),
                            );
                          }
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7), // لون أزرق تقني مفعل
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: Text(
                        currentQuestionIndex == 9 ? 'Go to submission' : 'Next question',
                        style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: OutlinedButton(
                      onPressed: currentQuestionIndex > 0 ? () {
                        setState(() {
                          currentQuestionIndex--;
                          selectedOptionIndex = null;
                        });
                      } : null,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF1E293B)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Previous question', style: TextStyle(fontSize: 13, color: Colors.grey)),
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
              // الامتحان شغال: شاشة وضع التركيز (Focus mode) بدل المحادثة
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
}