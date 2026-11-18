import 'package:flutter/material.dart';
import 'custom_bottom_nav_bar.dart';

class AiTutorScreen extends StatefulWidget {
  final bool initialIsCourseContext;
  final String? lessonTitle;

  const AiTutorScreen({
    super.key, 
    this.initialIsCourseContext = false,
    this.lessonTitle,
  });

  @override
  State<AiTutorScreen> createState() => _AiTutorScreenState();
}

class _AiTutorScreenState extends State<AiTutorScreen> {
  late bool isCourseContextTab;

  @override
  void initState() {
    super.initState();
    isCourseContextTab = widget.initialIsCourseContext;
  }

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

            // 2. أزرار التبديل بين This course و General chat (المطابقة لفيجما)
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
                      child: GestureDetector(
                        onTap: () => setState(() => isCourseContextTab = true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: isCourseContextTab ? const Color(0xFF0F172A) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                            border: isCourseContextTab ? Border.all(color: const Color(0xFF1E293B)) : null,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'This course',
                            style: TextStyle(
                              color: isCourseContextTab ? Colors.white : Colors.grey,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => isCourseContextTab = false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: !isCourseContextTab ? const Color(0xFF0F172A) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                            border: !isCourseContextTab ? Border.all(color: const Color(0xFF1E293B)) : null,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'General chat',
                            style: TextStyle(
                              color: !isCourseContextTab ? Colors.white : Colors.grey,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // 3. المحتوى المتغير حسب التبويب (This course أو General chat)
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // لو في تبويب This course، نعرض كارت سياق الدرس المرفق[cite: 9]
                    if (isCourseContextTab) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.4)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: const [
                                Icon(Icons.bolt, color: Color(0xFF0284C7), size: 14),
                                SizedBox(width: 6),
                                Text('COURSE CONTEXT ATTACHED', style: TextStyle(fontSize: 9, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              widget.lessonTitle ?? 'IPv4 & subnetting\nLesson 3 · Choosing a subnet mask',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      // لو في تبويب General chat، نعرض كارت المحادثة العامة[cite: 10]
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.info_outline, color: Color(0xFF0284C7), size: 16),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'A fresh networking conversation. No lesson context attached. Ask about any networking concept.',
                                style: TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),
                    const Text('TODAY - 09:38', style: TextStyle(fontSize: 9, color: Colors.grey)),
                    const SizedBox(height: 8),

                    // رسالة المستخدم
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
  isCourseContextTab 
    ? 'Why does a /26 network have 62 hosts, not 64?'
    : 'What is the difference between a switch and a router?',
  style: const TextStyle(color: Colors.white, fontSize: 13),
),
                    ),

                    const SizedBox(height: 12),

                    // رد الـ AI Tutor
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.psychology, color: Color(0xFF0284C7), size: 16),
                              SizedBox(width: 6),
                              Text('NETWORKING TUTOR', style: TextStyle(fontSize: 10, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 8),
                         Text(
  isCourseContextTab
      ? 'Great question. A /26 prefix leaves 6 host bits. That gives 64 total addresses, but two have special jobs:\n\n1. Network address identifies the subnet.\n2. Broadcast address reaches all hosts.'
      : 'Think of a switch as connecting devices inside the same local network. A router connects different networks, such as your home LAN and the internet.',
  style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.4),
),
                        ],
                      ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),

            // صندوق كتابة الرسالة أسفل الشاشة
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                border: Border(top: BorderSide(color: Color(0xFF1E293B))),
              ),
              child: TextField(
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Ask a networking question...',
                  hintStyle: const TextStyle(color: Colors.grey, fontSize: 12),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.send, color: Color(0xFF0284C7), size: 18),
                    onPressed: () {},
                  ),
                ),
              ),
            ),
          ],
        ),
      ),

 bottomNavigationBar: const CustomBottomNavBar(currentIndex: 2, isAssessmentActive: true),
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