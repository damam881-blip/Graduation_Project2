import 'package:flutter/material.dart';
import 'courses/courses_catalog_screen.dart'; // استيراد صفحة الكورسات للزائر
import 'courses/learning_path_screen.dart'; // استيراد شاشة مسار التعلم للمستخدم المسجل

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // خلفية كحلي داكن
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // زر الرجوع واللوجو وزر اللغة
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context), // للرجوع لشاشة الترحيب
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      const SizedBox(width: 16),
                      const Text(
                        'NETWORKING FUNDAMENTALS',
                        style: TextStyle(fontSize: 10, color: Colors.grey, letterSpacing: 0.5),
                      ),
                    ],
                  ),
                  OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF1E293B)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('عربي', style: TextStyle(color: Color(0xFF0284C7))),
                  ),
                ],
              ),
              
              const SizedBox(height: 20),
              
              // عنوان الشاشة
              const Text(
                'Welcome back',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 4),
              const Text(
                'Pick up where your learning left off.',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              
              const SizedBox(height: 20),

              // تابات الاختيار بين Sign in و Create account
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withOpacity(0.5),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Center(
                          child: Text('Sign in', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Center(
                        child: Text('Create account', style: TextStyle(color: Colors.grey[400])),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // كارت نموذج تسجيل الدخول
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withOpacity(0.3),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Email address', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 6),
                    TextField(
                      decoration: InputDecoration(
                        hintText: 'sara.ahmed@example.com',
                        hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                        filled: true,
                        fillColor: const Color(0xFF0F172A),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Color(0xFF1E293B)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Color(0xFF1E293B)),
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    const Text('Password', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 6),
                    TextField(
                      obscureText: true,
                      decoration: InputDecoration(
                        hintText: '••••••••••••',
                        hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                        filled: true,
                        fillColor: const Color(0xFF0F172A),
                        suffixIcon: const Icon(Icons.visibility_off, color: Colors.grey, size: 20),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Color(0xFF1E293B)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Color(0xFF1E293B)),
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(
                        onPressed: () {},
                        style: TextButton.styleFrom(padding: EdgeInsets.zero),
                        child: const Text('Forgot password?', style: TextStyle(fontSize: 12, color: Color(0xFF0284C7))),
                      ),
                    ),
                    
                    const SizedBox(height: 12),
                    
                    // زرار تسجيل الدخول المربوط بشاشة مسار التعلم
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () {
                          // الانتقال إلى شاشة مسار التعلم الخاصة بالمستخدم المسجل
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const LearningPathScreen(),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.lock_outline, size: 16, color: Colors.white),
                            SizedBox(width: 8),
                            Text('Sign in securely', style: TextStyle(fontSize: 15, color: Colors.white, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),
              
              // التشفير والأمان
              const Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.security, size: 14, color: Colors.green),
                    SizedBox(width: 6),
                    Text('Encrypted connection. Your password stays private.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),

              const SizedBox(height: 20),
              const Center(child: Text('OR KEEP EXPLORING', style: TextStyle(fontSize: 10, color: Colors.grey, letterSpacing: 1))),
              const SizedBox(height: 12),

              // زرار متابعة كزائر (مربوط بشاشة كتالوج الكورسات للزائر)
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const CoursesCatalogScreen()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF1E293B)),
                    backgroundColor: const Color(0xFF1E293B).withOpacity(0.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Continue as guest', style: TextStyle(fontSize: 15, color: Colors.white)),
                ),
              ),

              const SizedBox(height: 16),

              // كارت المساعدة السفلي
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0284C7).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF0284C7).withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Color(0xFF0284C7), size: 20),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('New to networking?', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                          SizedBox(height: 2),
                          Text('Create an account to save progress and unlock quizzes.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}