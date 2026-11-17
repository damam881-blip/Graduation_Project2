import 'package:flutter/material.dart';
// import 'course_detail_screen.dart';
import 'lesson_reader_screen.dart'; 


class CoursesCatalogScreen extends StatelessWidget {
  const CoursesCatalogScreen({super.key});

  @override
  Widget build(BuildContext context) {
   
    // قائمة الكورسات الـ 6 المطابقة لديزاين فيجما للزائر
    final List courses = [
      {
        'number': '01 / 06',
        'title': 'Network foundations',
        'details': '4 lessons • 25 min',
        'statusText': 'Preview lesson 1 - No account needed',
        'badge': 'Free preview',
        'isFree': true,
      },
      {
        'number': '02 / 06',
        'title': 'OSI & TCP/IP models',
        'details': '5 lessons • 35 min',
        'statusText': 'Create an account to unlock',
        'badge': 'Locked',
        'isFree': false,
      },
      {
        'number': '03 / 06',
        'title': 'IPv4 & subnetting',
        'details': '5 lessons • 40 min',
        'statusText': 'Create an account to unlock',
        'badge': 'Locked',
        'isFree': false,
      },
      {
        'number': '04 / 06',
        'title': 'Routing essentials',
        'details': '5 lessons • 35 min',
        'statusText': 'Create an account to unlock',
        'badge': 'Locked',
        'isFree': false,
      },
      {
        'number': '05 / 06',
        'title': 'Switching & VLANs',
        'details': '4 lessons • 30 min',
        'statusText': 'Create an account to unlock',
        'badge': 'Locked',
        'isFree': false,
      },
      {
        'number': '06 / 06',
        'title': 'Network security',
        'details': '5 lessons • 40 min',
        'statusText': 'Create an account to unlock',
        'badge': 'Locked',
        'isFree': false,
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // خلفية كحلي داكن
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. الـ Header العلوي
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0284C7).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(Icons.account_tree_outlined, color: Color(0xFF0284C7), size: 18),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('GUEST MODE', style: TextStyle(fontSize: 9, color: Colors.grey, letterSpacing: 0.5)),
                          Text('Explore the foundations', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                        ],
                      ),
                    ],
                  ),
                  OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF1E293B)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    child: const Text('عربي', style: TextStyle(color: Color(0xFF0284C7), fontSize: 12)),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // 2. الكارت الترويجي العلوي (A preview today...)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withOpacity(0.6),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF0284C7).withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('GUEST ACCESS', style: TextStyle(fontSize: 9, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'A preview today.\nA learning path for life.',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white, height: 1.2),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Upgrade to a free account for all 6 courses, saved progress, quizzes and your AI tutor.',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: 40,
                      child: ElevatedButton(
                        onPressed: () {},
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Create a free account', style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),
              const Text('Six steps to a stronger foundation', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey)),
              const SizedBox(height: 8),

              // 3. قائمة الكورسات الستة بتفاصيل فيجما
              Expanded(
                child: ListView.builder(
                  itemCount: courses.length,
                  itemBuilder: (context, index) {
                    final course = courses[index];
                    final bool isFree = course['isFree'];
                    
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withOpacity(isFree ? 0.5 : 0.25),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isFree ? const Color(0xFF0284C7).withOpacity(0.4) : const Color(0xFF1E293B),
                        ),
                      ),
                      child: InkWell(
                        // للزائر: الكورس المجاني يفتح شاشة قراءة الدرس مباشرة
                        onTap: isFree ? () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const LessonReaderScreen()),
                          );
                        } : null,
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        isFree ? Icons.account_tree_outlined : Icons.lock_outline,
                                        color: isFree ? const Color(0xFF0284C7) : Colors.grey,
                                        size: 14,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        course['number'],
                                        style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isFree ? const Color(0xFF0284C7).withOpacity(0.2) : Colors.grey.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      course['badge'],
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: isFree ? const Color(0xFF0284C7) : Colors.grey,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                course['title'],
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: isFree ? Colors.white : Colors.grey[300],
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                course['details'],
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Icon(
                                    isFree ? Icons.play_circle_outline : Icons.lock_outline,
                                    size: 13,
                                    color: isFree ? const Color(0xFF0284C7) : Colors.grey,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    course['statusText'],
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: isFree ? const Color(0xFF0284C7) : Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      
      // 4. الـ Bottom Navigation Bar السفلي
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

  Widget _buildNavItem(IconData icon, String label, bool isSelected) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: isSelected ? const Color(0xFF0284C7) : Colors.grey, size: 20),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(fontSize: 10, color: isSelected ? const Color(0xFF0284C7) : Colors.grey),
        ),
      ],
    );
  }
}