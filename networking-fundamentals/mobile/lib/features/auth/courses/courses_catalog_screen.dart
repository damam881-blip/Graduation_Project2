import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../content/data/content_repository.dart';
import '../../content/domain/content_models.dart';
import 'lesson_reader_screen.dart';

/// Catalog backed by the approved-content read path (N3-02/D-09).
///
/// Visual layout is unchanged from the design; only the data source, the
/// lock evaluation and the loading/error states are new.
class CoursesCatalogScreen extends StatefulWidget {
  const CoursesCatalogScreen({super.key});

  @override
  State<CoursesCatalogScreen> createState() => _CoursesCatalogScreenState();
}

class _CoursesCatalogScreenState extends State<CoursesCatalogScreen> {
  final ContentRepository _repository = ContentRepository();

  late Future<_CatalogView> _catalog;

  @override
  void initState() {
    super.initState();
    _catalog = _load();
  }

  Future<_CatalogView> _load() async {
    final catalog = await _repository.fetchCatalog();
    final unlocked = <String, bool>{};

    for (final course in catalog.items) {
      unlocked[course.courseId] =
          await _repository.isCourseUnlocked(course.courseId);
    }

    return _CatalogView(catalog: catalog, unlocked: unlocked);
  }

  void _reload() {
    setState(() {
      _catalog = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // خلفية كحلي داكن
      body: SafeArea(
        child: Padding(
          padding:
              const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
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
                          color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(Icons.account_tree_outlined,
                            color: Color(0xFF0284C7), size: 18),
                      ),
                      const SizedBox(width: 10),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('GUEST MODE',
                              style: TextStyle(
                                  fontSize: 9,
                                  color: Colors.grey,
                                  letterSpacing: 0.5)),
                          Text('Explore the foundations',
                              style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white)),
                        ],
                      ),
                    ],
                  ),
                  OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF1E293B)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    child: const Text('عربي',
                        style: TextStyle(
                            color: Color(0xFF0284C7), fontSize: 12)),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // 2. الكارت الترويجي العلوي (A preview today...)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: const Color(0xFF0284C7).withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('GUEST ACCESS',
                          style: TextStyle(
                              fontSize: 9,
                              color: Color(0xFF0284C7),
                              fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'A preview today.\nA learning path for life.',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          height: 1.2),
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
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Create a free account',
                            style: TextStyle(
                                fontSize: 13,
                                color: Colors.white,
                                fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),
              const Text('Six steps to a stronger foundation',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey)),
              const SizedBox(height: 8),

              // 3. قائمة الكورسات من المحتوى المنشور
              Expanded(
                child: FutureBuilder<_CatalogView>(
                  future: _catalog,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF0284C7),
                        ),
                      );
                    }

                    if (snapshot.hasError) {
                      return _buildError(snapshot.error);
                    }

                    final view = snapshot.data;

                    if (view == null || view.catalog.items.isEmpty) {
                      return const Center(
                        child: Text(
                          'No courses are published yet.',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      );
                    }

                    return _buildCourseList(context, view);
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

  Widget _buildCourseList(BuildContext context, _CatalogView view) {
    final total = view.catalog.items.length;
    final languageCode = Localizations.localeOf(context).languageCode;
    final signedIn = FirebaseAuth.instance.currentUser != null;

    return ListView.builder(
      itemCount: total,
      itemBuilder: (context, index) {
        final course = view.catalog.items[index];
        final isOpen = view.unlocked[course.courseId] ?? false;
        final number = '${course.order.toString().padLeft(2, '0')} / '
            '${total.toString().padLeft(2, '0')}';
        final details = '${course.lessonCount} lessons • '
            '${course.estimatedMinutes} min';
        final badge = isOpen ? 'Open' : 'Locked';
        final statusText = isOpen
            ? 'Open now'
            : signedIn
                ? 'Finish the previous course to unlock'
                : 'Create an account to unlock';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(
              alpha: isOpen ? 0.5 : 0.25,
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isOpen
                  ? const Color(0xFF0284C7).withValues(alpha: 0.4)
                  : const Color(0xFF1E293B),
            ),
          ),
          child: InkWell(
            // الكورس المفتوح يفتح شاشة قراءة الدرس
            onTap: isOpen
                ? () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const LessonReaderScreen(),
                      ),
                    );
                  }
                : null,
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
                            isOpen
                                ? Icons.account_tree_outlined
                                : Icons.lock_outline,
                            color: isOpen
                                ? const Color(0xFF0284C7)
                                : Colors.grey,
                            size: 14,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            number,
                            style: const TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                                fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: isOpen
                              ? const Color(0xFF0284C7)
                                  .withValues(alpha: 0.2)
                              : Colors.grey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          badge,
                          style: TextStyle(
                            fontSize: 10,
                            color: isOpen
                                ? const Color(0xFF0284C7)
                                : Colors.grey,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    course.title.resolve(languageCode),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: isOpen ? Colors.white : Colors.grey[300],
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    details,
                    style: const TextStyle(
                        fontSize: 11, color: Colors.grey),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        isOpen
                            ? Icons.play_circle_outline
                            : Icons.lock_outline,
                        size: 13,
                        color: isOpen
                            ? const Color(0xFF0284C7)
                            : Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          statusText,
                          style: TextStyle(
                            fontSize: 10,
                            color: isOpen
                                ? const Color(0xFF0284C7)
                                : Colors.grey,
                          ),
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
    );
  }

  Widget _buildError(Object? error) {
    final failure = error is ContentFailure ? error : null;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              failure?.isOffline ?? false
                  ? Icons.cloud_off_outlined
                  : Icons.error_outline,
              color: Colors.grey,
              size: 28,
            ),
            const SizedBox(height: 10),
            Text(
              failure?.message ?? 'Content could not be loaded.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: _reload,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF0284C7)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text(
                'Retry',
                style: TextStyle(fontSize: 12, color: Color(0xFF0284C7)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, bool isSelected) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon,
            color: isSelected ? const Color(0xFF0284C7) : Colors.grey,
            size: 20),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
              fontSize: 10,
              color: isSelected ? const Color(0xFF0284C7) : Colors.grey),
        ),
      ],
    );
  }
}

/// Catalog plus the evaluated lock state of every course.
class _CatalogView {
  const _CatalogView({required this.catalog, required this.unlocked});

  final VersionedContent<CourseSummary> catalog;
  final Map<String, bool> unlocked;
}
