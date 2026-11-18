import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'register_screen.dart';
import '../../main.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. الشريط العلوي (اللوجو + زرار الثيم + زرار اللغة)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // اللوجو واسم التطبيق
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.hub_outlined, color: Color(0xFF0284C7), size: 24),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'YOUR NETWORKING LEARNING SPACE',
                            style: TextStyle(fontSize: 10, color: Colors.grey, letterSpacing: 0.5),
                          ),
                          Text(
                            'Networking Fundamentals',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // زرار الثيم وزرار اللغة
                  Row(
                    children: [
                      // زرار الثيم (Light / Dark)
                      IconButton(
                        icon: const Icon(Icons.brightness_6, color: Color(0xFF0284C7), size: 22),
                        onPressed: () {
                          MyApp.of(context).toggleTheme();
                        },
                      ),
                      const SizedBox(width: 4),

                      // زرار اللغة (عربي / English)
                      OutlinedButton(
                        onPressed: () {
                          bool isEnglish = Localizations.localeOf(context).languageCode == 'en';
                          MyApp.of(context).changeLanguage(
                            isEnglish ? const Locale('ar', 'AE') : const Locale('en', 'US'),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF1E293B)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                        ),
                        child: Text(
                          Localizations.localeOf(context).languageCode == 'en' ? 'عربي' : 'English',
                          style: const TextStyle(color: Color(0xFF0284C7)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 30),

              // 2. النبذة التعريفية
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  '• LEARN • PRACTICE • CONNECT',
                  style: TextStyle(fontSize: 10, color: Color(0xFF0284C7), fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Understand the network.\nBuild your future.',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white, height: 1.2),
              ),
              const SizedBox(height: 8),
              const Text(
                'Six connected courses. Hands-on tools. An AI tutor that helps the concepts click.',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),

              const SizedBox(height: 20),

              // 3. كارت التوضيح (Laptop, Switch, Router)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('• LAN TO WAN', style: TextStyle(fontSize: 10, color: Color(0xFF0284C7))),
                        ),
                        const Icon(Icons.schema, color: Color(0xFF0284C7), size: 18),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Column(children: [Icon(Icons.laptop, color: Color(0xFF0284C7)), SizedBox(height: 4), Text('Laptop', style: TextStyle(fontSize: 11, color: Colors.grey))]),
                        Icon(Icons.remove, color: Colors.grey),
                        Column(children: [Icon(Icons.hub, color: Color(0xFF0284C7)), SizedBox(height: 4), Text('Switch', style: TextStyle(fontSize: 11, color: Colors.grey))]),
                        Icon(Icons.remove, color: Colors.grey),
                        Column(children: [Icon(Icons.router, color: Color(0xFF0284C7)), SizedBox(height: 4), Text('Router', style: TextStyle(fontSize: 11, color: Colors.grey))]),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text('192.168.10.0/24 → 192.168.20.0/24', style: TextStyle(fontSize: 11, color: Color(0xFF0284C7))),
                    const SizedBox(height: 4),
                    const Text('A router forwards packets between networks.', style: TextStyle(fontSize: 10, color: Colors.grey)),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 4. الأزرار الثلاثة السفلية
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const LoginScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Sign in to continue', style: TextStyle(fontSize: 15, color: Colors.white, fontWeight: FontWeight.bold)),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward, size: 18, color: Colors.white),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const RegisterScreen()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF1E293B)),
                    backgroundColor: const Color(0xFF1E293B).withValues(alpha: 0.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Create a free account', style: TextStyle(fontSize: 15, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: TextButton(
                  onPressed: () {},
                  child: const Text('Explore as a guest', style: TextStyle(fontSize: 14, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 8),
              const Center(
                child: Text(
                  'By continuing, you agree to our Terms and Privacy Policy.',
                  style: TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}