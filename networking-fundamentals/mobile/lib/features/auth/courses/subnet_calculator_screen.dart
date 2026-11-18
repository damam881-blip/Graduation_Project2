import 'package:flutter/material.dart';
import 'custom_bottom_nav_bar.dart';

class SubnetCalculatorScreen extends StatefulWidget {
  const SubnetCalculatorScreen({super.key});

  @override
  State<SubnetCalculatorScreen> createState() => _SubnetCalculatorScreenState();
}

class _SubnetCalculatorScreenState extends State<SubnetCalculatorScreen> {
  final TextEditingController ipController = TextEditingController(text: '192.168.10.42');
  final TextEditingController prefixController = TextEditingController(text: '26');

  // متغيرات رسائل الخطأ والتنبيهات للـ Validation
  String? ipErrorText;
  String? prefixErrorText;
  bool hasError = false;

  // متغيرات نتائج الألجوريزم
  String subnetMask = '255.255.255.192';
  String networkAddress = '192.168.10.0';
  String broadcastAddress = '192.168.10.63';
  String hostRange = '192.168.10.1 – 192.168.10.62';
  int totalAddresses = 64;
  int usableHosts = 62;
  String binaryIp = '11000000.10101000.00001010.00101010';
  String binaryMask = '11111111.11111111.11111111.11000000';

  // دالة التحقق والحساب الشاملة (Validation & Subnet Algorithm)
  void calculateSubnet() {
    setState(() {
      ipErrorText = null;
      prefixErrorText = null;
      hasError = false;
    });

    try {
      String ip = ipController.text.trim();
      List<String> ipParts = ip.split('.');

      // 1. التحقق من صحة الـ IP (كل octet يجب أن يكون بين 0 و 255)
      if (ipParts.length != 4) {
        setState(() {
          ipErrorText = 'Each octet must be a number from 0 to 255.';
          hasError = true;
        });
        return;
      }

      for (var part in ipParts) {
        int? val = int.tryParse(part);
        if (val == null || val < 0 || val > 255) {
          setState(() {
            ipErrorText = 'Each octet must be a number from 0 to 255.';
            hasError = true;
          });
          return;
        }
      }

      // 2. التحقق من صحة الـ Prefix (بين 0 و 32)
      String prefixStr = prefixController.text.replaceAll('/', '').trim();
      int? prefix = int.tryParse(prefixStr);
      if (prefix == null || prefix < 0 || prefix > 32) {
        setState(() {
          prefixErrorText = 'Use a prefix between /0 and /32.';
          hasError = true;
        });
        return;
      }

      // 3. الحسابات الأساسية للشبكة
      int maskInt = prefix == 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF;
      String m1 = ((maskInt >> 24) & 0xFF).toString();
      String m2 = ((maskInt >> 16) & 0xFF).toString();
      String m3 = ((maskInt >> 8) & 0xFF).toString();
      String m4 = (maskInt & 0xFF).toString();
      subnetMask = '$m1.$m2.$m3.$m4';

      int ipInt = (int.parse(ipParts[0]) << 24) |
                  (int.parse(ipParts[1]) << 16) |
                  (int.parse(ipParts[2]) << 8) |
                  int.parse(ipParts[3]);

      int netInt = ipInt & maskInt;
      int wildcardInt = ~maskInt & 0xFFFFFFFF;
      int broadInt = netInt | wildcardInt;

      networkAddress = '${(netInt >> 24) & 0xFF}.${(netInt >> 16) & 0xFF}.${(netInt >> 8) & 0xFF}.${netInt & 0xFF}';
      broadcastAddress = '${(broadInt >> 24) & 0xFF}.${(broadInt >> 16) & 0xFF}.${(broadInt >> 8) & 0xFF}.${broadInt & 0xFF}';

      totalAddresses = 1 << (32 - prefix);
      if (prefix >= 31) {
        usableHosts = prefix == 32 ? 1 : 2;
        hostRange = networkAddress;
      } else {
        usableHosts = totalAddresses - 2;
        int firstHost = netInt + 1;
        int lastHost = broadInt - 1;
        String firstHostStr = '${(firstHost >> 24) & 0xFF}.${(firstHost >> 16) & 0xFF}.${(firstHost >> 8) & 0xFF}.${firstHost & 0xFF}';
        String lastHostStr = '${(lastHost >> 24) & 0xFF}.${(lastHost >> 16) & 0xFF}.${(lastHost >> 8) & 0xFF}.${lastHost & 0xFF}';
        hostRange = '$firstHostStr – $lastHostStr';
      }

      binaryIp = ipParts.map((p) => int.parse(p).toRadixString(2).padLeft(8, '0')).join('.');
      binaryMask = [m1, m2, m3, m4].map((p) => int.parse(p).toRadixString(2).padLeft(8, '0')).join('.');

      setState(() {});
    } catch (e) {
      setState(() {
        hasError = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            // 1. الشريط العلوي
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('YOUR OFFLINE NETWORK TOOLKIT', style: TextStyle(fontSize: 8, color: Colors.grey, letterSpacing: 0.5)),
                      SizedBox(height: 2),
                      Text('Subnet calculator', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
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

            // المحتوى التفاعلي القابل للتمرير
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.offline_bolt, color: Colors.green, size: 14),
                          SizedBox(width: 6),
                          Text('100% OFFLINE • ON DEVICE', style: TextStyle(fontSize: 9, color: Colors.green, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text('Calculate an IPv4 subnet, inspect binary values, and plan unequal networks with VLSM.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    
                    const SizedBox(height: 16),

                    // صندوق إدخال البيانات والـ Validation
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: hasError ? Colors.redAccent.withValues(alpha: 0.5) : const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('IPv4 subnet', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 12),
                          const Text('IPv4 address', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          const SizedBox(height: 4),
                          
                          // حقل الـ IP
                          TextField(
                            controller: ipController,
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: const Color(0xFF0F172A),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: ipErrorText != null ? const BorderSide(color: Colors.redAccent) : BorderSide.none),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: ipErrorText != null ? const BorderSide(color: Colors.redAccent) : BorderSide.none),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                          if (ipErrorText != null) ...[
                            const SizedBox(height: 4),
                            Text(ipErrorText!, style: const TextStyle(color: Colors.redAccent, fontSize: 10)),
                          ],

                          const SizedBox(height: 12),
                          const Text('Prefix length / CIDR', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          const SizedBox(height: 4),
                          
                          // حقل الـ Prefix
                          TextField(
                            controller: prefixController,
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: const Color(0xFF0F172A),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: prefixErrorText != null ? const BorderSide(color: Colors.redAccent) : BorderSide.none),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: prefixErrorText != null ? const BorderSide(color: Colors.redAccent) : BorderSide.none),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                          if (prefixErrorText != null) ...[
                            const SizedBox(height: 4),
                            Text(prefixErrorText!, style: const TextStyle(color: Colors.redAccent, fontSize: 10)),
                          ],

                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 40,
                            child: ElevatedButton(
                              onPressed: calculateSubnet,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0284C7),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('Calculate subnet', style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // لو فيه خطأ، بنعرض تنبيه عدم توليد النتائج زي ديزاين فيجما
                    if (hasError) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.redAccent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.redAccent.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.error_outline, color: Colors.redAccent, size: 18),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'No results generated. Correct the IP address and prefix. Previous results are hidden to avoid using invalid values.',
                                style: TextStyle(fontSize: 11, color: Colors.redAccent),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),

                    // عرض النتائج في حال كانت البيانات صحيحة
                    if (!hasError) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Text('Subnet results', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                          Text('Copy all', style: TextStyle(fontSize: 11, color: Color(0xFF0284C7))),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildResultRow('Network address', '$networkAddress/${prefixController.text.replaceAll('/', '').trim()}'),
                            _buildResultRow('Subnet mask', subnetMask),
                            _buildResultRow('Usable host range', hostRange),
                            _buildResultRow('Broadcast address', broadcastAddress),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: const Color(0xFF0284C7).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(6)),
                                  child: Text('• $totalAddresses addresses', style: const TextStyle(fontSize: 10, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(6)),
                                  child: Text('• $usableHosts usable hosts', style: const TextStyle(fontSize: 10, color: Colors.green, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // قسم التحويل الثنائي
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Binary conversion', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                            const SizedBox(height: 8),
                            const Text('IP address • 4 × 8 bits', style: TextStyle(fontSize: 10, color: Colors.grey)),
                            const SizedBox(height: 4),
                            Text(binaryIp, style: const TextStyle(fontSize: 11, color: Color(0xFF0284C7), fontFamily: 'monospace')),
                            const SizedBox(height: 8),
                            const Text('Subnet mask • Network bits', style: TextStyle(fontSize: 10, color: Colors.grey)),
                            const SizedBox(height: 4),
                            Text(binaryMask, style: const TextStyle(fontSize: 11, color: Color(0xFF0284C7), fontFamily: 'monospace')),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
bottomNavigationBar: const CustomBottomNavBar(currentIndex: 1),
      // // 
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
      //       _buildNavItem(context, Icons.grid_view_outlined, 'Tools', true, () {}),
      //       _buildNavItem(context, Icons.psychology_outlined, 'AI Tutor', false, () {
      //         Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const AiTutorScreen()));
      //       }),
      //       _buildNavItem(context, Icons.person_outline, 'Profile', false, () {
      //         Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const ProfileScreen()));
      //       }),
      //     ],
      //   ),
      // ),
    );
  }

  Widget _buildResultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }
}