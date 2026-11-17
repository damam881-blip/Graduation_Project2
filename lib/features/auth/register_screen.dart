import 'package:flutter/material.dart';

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

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
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      const SizedBox(width: 16),
                      const Text(
                        'FREE ACCOUNT',
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
              
              const SizedBox(height: 16),
              
              // عنوان الشاشة
              const Text(
                'Start your learning path',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              
              const SizedBox(height: 16),

              // تابات الاختيار بين Sign in و Create account
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withOpacity(0.5),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text('Sign in', style: TextStyle(color: Colors.grey[400])),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Center(
                          child: Text('Create account', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // حقول التسجيل الأساسية والإضافية
              const Text('Full name', style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 6),
              TextField(
                decoration: InputDecoration(
                  hintText: 'Sara Ahmed',
                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                  filled: true,
                  fillColor: const Color(0xFF1E293B).withOpacity(0.3),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                ),
              ),

              const SizedBox(height: 14),
              const Text('Email address', style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 6),
              TextField(
                decoration: InputDecoration(
                  hintText: 'sara.ahmed@example.com',
                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                  filled: true,
                  fillColor: const Color(0xFF1E293B).withOpacity(0.3),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                ),
              ),

              // --- الإضافة الجديدة: رقم الهاتف (Phone Number) ---
              const SizedBox(height: 14),
              const Text('Phone number', style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 6),
              TextField(
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  hintText: '+20 1012345678',
                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                  filled: true,
                  fillColor: const Color(0xFF1E293B).withOpacity(0.3),
                  prefixIcon: const Icon(Icons.phone_outlined, color: Colors.grey, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                ),
              ),

              // --- الإضافة الجديدة: الموقع أو الدولة (Location / Country) ---
              const SizedBox(height: 14),
              const Text('Location / Country', style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 6),
              TextField(
                decoration: InputDecoration(
                  hintText: 'Cairo, Egypt',
                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                  filled: true,
                  fillColor: const Color(0xFF1E293B).withOpacity(0.3),
                  prefixIcon: const Icon(Icons.location_on_outlined, color: Colors.grey, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                ),
              ),

              const SizedBox(height: 14),
              const Text('Password', style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 6),
              TextField(
                obscureText: true,
                decoration: InputDecoration(
                  hintText: '••••••••••••',
                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                  filled: true,
                  fillColor: const Color(0xFF1E293B).withOpacity(0.3),
                  suffixIcon: const Icon(Icons.visibility_off, color: Colors.grey, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF0284C7))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF0284C7))),
                ),
              ),
              
              const SizedBox(height: 6),
              const Text('12 characters • Strong password', style: TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 8),
              
              // خطوط قوة الباسورد الأخضر
              Row(
                children: [
                  Expanded(child: Container(height: 4, decoration: BoxDecoration(color: Colors.tealAccent, borderRadius: BorderRadius.circular(2)))),
                  const SizedBox(width: 4),
                  Expanded(child: Container(height: 4, decoration: BoxDecoration(color: Colors.tealAccent, borderRadius: BorderRadius.circular(2)))),
                  const SizedBox(width: 4),
                  Expanded(child: Container(height: 4, decoration: BoxDecoration(color: Colors.tealAccent, borderRadius: BorderRadius.circular(2)))),
                  const SizedBox(width: 4),
                  Expanded(child: Container(height: 4, decoration: BoxDecoration(color: Colors.tealAccent, borderRadius: BorderRadius.circular(2)))),
                ],
              ),
              
              const SizedBox(height: 8),
              const Text('Use at least 8 characters, with uppercase and lowercase letters, a number and a symbol.', style: TextStyle(fontSize: 10, color: Colors.grey)),

              const SizedBox(height: 14),
              const Text('Confirm password', style: TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 6),
              TextField(
                obscureText: true,
                decoration: InputDecoration(
                  hintText: '••••••••••••',
                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                  filled: true,
                  fillColor: const Color(0xFF1E293B).withOpacity(0.3),
                  suffixIcon: const Icon(Icons.visibility_off, color: Colors.grey, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                ),
              ),

              const SizedBox(height: 12),
              
              // شروط الاستخدام
              Row(
                children: [
                  SizedBox(
                    height: 20,
                    width: 20,
                    child: Checkbox(
                      value: true,
                      onChanged: (val) {},
                      activeColor: const Color(0xFF0284C7),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text('I agree to the Terms of Service and Privacy Policy.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // زرار إنشاء الحساب
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Create my account', style: TextStyle(fontSize: 15, color: Colors.white, fontWeight: FontWeight.bold)),
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
            ],
          ),
        ),
      ),
    );
  }
}