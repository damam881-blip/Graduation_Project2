import 'package:flutter/material.dart';
import 'features/auth/courses/subnet_calculator_screen.dart'; // استيراد شاشة الأدوات (Tools)

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0; // المؤشر الحالي للتبويب المختار

  // قائمة الشاشات الأساسية الأربعة في الشريط السفلي
  final List<Widget> _pages = [
    // 0. شاشة التعلم ومسار التعلم (Learn / Learning Path)
    const Center(
      child: Text(
        'Learning Path / Learn Screen',
        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
      ),
    ),
    
    // 1. شاشة الأدوات (Tools - Subnet Calculator)
    const SubnetCalculatorScreen(),
    
    // 2. شاشة المعلم الذكي (AI Tutor)
    const Center(
      child: Text(
        'AI Tutor Screen',
        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
      ),
    ),
    
    // 3. شاشة الملف الشخصي (Profile)
    const Center(
      child: Text(
        'Profile Screen',
        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
      ),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      
      // عرض الصفحة الحالية بناءً على الأيقونة المتاحة في الشريط السفلي
      body: _pages[_currentIndex],
      
      // شريط التنقل السفلي الثابت في كل الشاشات الرئيسية
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index; // تحديث التبويب عند الضغط عليه
          });
        },
        backgroundColor: const Color(0xFF0F172A),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF0284C7), // لون أزرق تقني للعنصر المختار
        unselectedItemColor: Colors.grey,          // لون رمادي للعناصر غير المختارة
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.menu_book),
            label: 'Learn',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.build),
            label: 'Tools',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.smart_toy),
            label: 'AI Tutor',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}