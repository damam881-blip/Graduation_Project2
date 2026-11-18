import 'package:flutter/material.dart';
// (تقدري تربطي أزرار التنقل هنا بالشاشات الخاصة بك)

class AppBottomNavBar extends StatelessWidget {
  final int currentIndex;
  const AppBottomNavBar({super.key, required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: (index) {
        // لو ضغطت على أي تبويب، ينقلك للصفحة الخاصة بيه
        if (index == 0) {
          // التنقل لصفحة Learn / Learning Path
        } else if (index == 1) {
          // التنقل لصفحة Tools (حاسبة الشبكات)
        } else if (index == 2) {
          // التنقل لصفحة AI Tutor
        } else if (index == 3) {
          // التنقل لصفحة Profile
        }
      },
      backgroundColor: const Color(0xFF0F172A),
      type: BottomNavigationBarType.fixed,
      selectedItemColor: const Color(0xFF0284C7),
      unselectedItemColor: Colors.grey,
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.menu_book), label: 'Learn'),
        BottomNavigationBarItem(icon: Icon(Icons.build), label: 'Tools'),
        BottomNavigationBarItem(icon: Icon(Icons.smart_toy), label: 'AI Tutor'),
        BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
      ],
    );
  }
}