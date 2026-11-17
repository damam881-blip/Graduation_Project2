import 'package:flutter/material.dart';
import 'courses_catalog_screen.dart';
import 'custom_bottom_nav_bar.dart';

class LearningPathScreen extends StatelessWidget {
  const LearningPathScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List courses = [
      {
        'number': '01 / 06',
        'title': 'Network foundations',
        'details': '4 lessons • 25 min',
        'statusText': '100% complete • Quiz: 90%',
        'badge': 'Completed',
        'isCompleted': true,
        'isUnlocked': true,
        'progressValue': 1.0,
      },
      {
        'number': '02 / 06',
        'title': 'OSI & TCP/IP models',
        'details': '5 lessons • 35 min',
        'statusText': '100% complete • Quiz: 80%',
        'badge': 'Completed',
        'isCompleted': true,
        'isUnlocked': true,
        'progressValue': 1.0,
      },
      {
        'number': '03 / 06',
        'title': 'IPv4 & subnetting',
        'details': '5 lessons • 40 min',
        'statusText': '2 of 5 lessons • 40% complete',
        'badge': 'In progress',
        'isCompleted': false,
        'isUnlocked': true,
        'progressValue': 0.4,
      },
      {
        'number': '04 / 06',
        'title': 'Routing essentials',
        'details': '5 lessons • 35 min',
        'statusText': 'Pass course 03 with >70% to unlock',
        'badge': 'Locked',
        'isCompleted': false,
        'isUnlocked': false,
        'progressValue': 0.0,
      },
      {
        'number': '05 / 06',
        'title': 'Switching & VLANs',
        'details': '4 lessons • 30 min',
        'statusText': 'Pass course 04 with >70% to unlock',
        'badge': 'Locked',
        'isCompleted': false,
        'isUnlocked': false,
        'progressValue': 0.0,
      },
      {
        'number': '06 / 06',
        'title': 'Network security',
        'details': '5 lessons • 40 min',
        'statusText': 'Pass course 05 with >70% to unlock',
        'badge': 'Locked',
        'isCompleted': false,
        'isUnlocked': false,
        'progressValue': 0.0,
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // الـ Header الخاص بالمستخدم المسجل
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
                          Text('WELCOME BACK, SARA', style: TextStyle(fontSize: 9, color: Colors.grey, letterSpacing: 0.5)),
                          Text('Your learning path', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
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
              
              // كارت متابعة التعلم (Continue Learning)
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('CONTINUE LEARNING', style: TextStyle(fontSize: 9, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                        ),
                        const Icon(Icons.local_fire_department, color: Color(0xFF0284C7), size: 18),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'IPv4 & subnetting',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Next: Lesson 3 - Choosing a subnet mask',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: 40,
                      child: ElevatedButton(
                        onPressed: () {
                          // الشاشة الحالية وهمية (mock)؛ زر "Resume" يفتح
                          // الكتالوج الحقيقي حتى تُستبدل في N4/N5.
                          Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const CoursesCatalogScreen()),
                         );
                       },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.arrow_forward, size: 16, color: Colors.white),
                            SizedBox(width: 8),
                            Text('Resume lesson', style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),
              const Text('Six steps to a stronger foundation', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey)),
              const SizedBox(height: 8),

              // قائمة الكورسات وحالات التقدم
              Expanded(
                child: ListView.builder(
                  itemCount: courses.length,
                  itemBuilder: (context, index) {
                    final course = courses[index];
                    final bool isUnlocked = course['isUnlocked'];
                    
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withOpacity(isUnlocked ? 0.5 : 0.25),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isUnlocked ? const Color(0xFF0284C7).withOpacity(0.3) : const Color(0xFF1E293B),
                        ),
                      ),
                      child: InkWell(
                        onTap: isUnlocked ? () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const CoursesCatalogScreen()),
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
                                        isUnlocked ? Icons.account_tree_outlined : Icons.lock_outline,
                                        color: isUnlocked ? const Color(0xFF0284C7) : Colors.grey,
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
                                      color: course['badge'] == 'Completed' 
                                          ? Colors.green.withOpacity(0.2) 
                                          : (isUnlocked ? const Color(0xFF0284C7).withOpacity(0.2) : Colors.grey.withOpacity(0.1)),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      course['badge'],
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: course['badge'] == 'Completed' 
                                            ? Colors.green 
                                            : (isUnlocked ? const Color(0xFF0284C7) : Colors.grey),
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
                                  color: isUnlocked ? Colors.white : Colors.grey[300],
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                course['details'],
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                              const SizedBox(height: 8),
                              // شريط التقدم (Progress Bar)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: course['progressValue'],
                                  backgroundColor: const Color(0xFF0F172A),
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    course['badge'] == 'Completed' ? Colors.green : const Color(0xFF0284C7),
                                  ),
                                  minHeight: 4,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                course['statusText'],
                                style: TextStyle(
                                  fontSize: 10,
                                  color: course['badge'] == 'Completed' ? Colors.green : Colors.grey,
                                ),
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
      bottomNavigationBar: const CustomBottomNavBar(currentIndex: 0),
      // // شريط التنقل السفلي
      // bottomNavigationBar: Container(
      //   padding: const EdgeInsets.symmetric(vertical: 8),
      //   decoration: const BoxDecoration(
      //     color: Color(0xFF0F172A),
      //     border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      //   ),
      //   child: Row(
      //     mainAxisAlignment: MainAxisAlignment.spaceAround,
      //     children: [
      //       _buildNavItem(Icons.menu_book, 'Learn', true),
      //       _buildNavItem(Icons.grid_view_outlined, 'Tools', false),
      //       _buildNavItem(Icons.psychology_outlined, 'AI Tutor', false),
      //       _buildNavItem(Icons.person_outline, 'Profile', false),
      //     ],
      //   ),
      // ),
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