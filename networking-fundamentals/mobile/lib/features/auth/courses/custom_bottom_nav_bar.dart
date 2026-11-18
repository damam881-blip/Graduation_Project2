import 'package:flutter/material.dart';
import 'subnet_calculator_screen.dart';
import 'ai_tutor_screen.dart';
import 'ai_tutor_quiz_restriction_screen.dart';
import 'profile_screen.dart';
import 'learning_path_screen.dart'; // صفحة الـ Learn (مسار التعلم)

class CustomBottomNavBar extends StatelessWidget {
  final int currentIndex; // لتحديد أي أيقونة تكون منورة (0 للـ Learn، 1 للـ Tools، 2 للـ AI، 3 للـ Profile)
  final bool isAssessmentActive; // هل الامتحان شغال حالياً عشان نطبق حماية الكويز؟

  const CustomBottomNavBar({
    super.key,
    required this.currentIndex,
    this.isAssessmentActive = false, // القيمة الافتراضية إن مفيش امتحان شغال
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          // 1. زرار Learn (ينقل لصفحة المسار التعليمي)
          _buildNavItem(context, Icons.menu_book, 'Learn', currentIndex == 0, () {
            if (currentIndex != 0) {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const LearningPathScreen()),
              );
            }
          }),

          // 2. زرار Tools (ينقل لشاشة حاسبة الشبكات Subnetting)
          _buildNavItem(context, Icons.grid_view_outlined, 'Tools', currentIndex == 1, () {
            if (currentIndex != 1) {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const SubnetCalculatorScreen()),
              );
            }
          }),

          // 3. زرار AI Tutor (مع هندلة حماية الكويز والمحادثة العامة)
          _buildNavItem(context, Icons.psychology_outlined, 'AI Tutor', currentIndex == 2, () {
            if (currentIndex != 2) {
              if (isAssessmentActive) {
                // لو الامتحان شغال، افتح شاشة القفل والتقييد Focus Mode
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const AiTutorQuizRestrictionScreen()),
                );
              } else {
                // لو مفيش امتحان، افتح شاشة الـ AI Tutor في وضع المحادثة العامة (General Chat)
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (context) => const AiTutorScreen()),
                );
              }
            }
          }),

          // 4. زرار Profile (ينقل لشاشة البروفايل)
          _buildNavItem(context, Icons.person_outline, 'Profile', currentIndex == 3, () {
            if (currentIndex != 3) {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const ProfileScreen()),
              );
            }
          }),
        ],
      ),
    );
  }

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
}