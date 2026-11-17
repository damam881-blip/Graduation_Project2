import 'package:flutter/material.dart';

import '../../content/data/content_repository.dart';
import '../../content/domain/content_models.dart';
import 'lesson_reader_screen.dart';

/// Lists the lessons of one course from the active content version.
///
/// The course reaches this screen already unlocked; whether a lesson is
/// readable is still enforced by the rules, so a denial surfaces as an error
/// instead of silently opening a locked lesson.
class CourseDetailScreen extends StatefulWidget {
  const CourseDetailScreen({super.key, required this.course});

  final CourseSummary course;

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  final ContentRepository _repository = ContentRepository();

  late Future<VersionedContent<LessonSummary>> _lessons;

  @override
  void initState() {
    super.initState();
    _lessons = _repository.fetchLessons(widget.course.courseId);
  }

  void _reload() {
    setState(() {
      _lessons = _repository.fetchLessons(widget.course.courseId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final languageCode = Localizations.localeOf(context).languageCode;
    final isArabic = languageCode == 'ar';

    return Directionality(
      textDirection: isArabic ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
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
                    Text(
                      'MODULE ${widget.course.order.toString().padLeft(2, '0')}'
                      ' DETAILS',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Colors.grey,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  widget.course.title.resolve(languageCode),
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  widget.course.description.resolve(languageCode),
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFF0284C7).withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Course content',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${widget.course.lessonCount} lessons • '
                            '${widget.course.estimatedMinutes} min',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Open',
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF0284C7),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Lessons in this Module',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: FutureBuilder<VersionedContent<LessonSummary>>(
                    future: _lessons,
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

                      final lessons = snapshot.data?.items ?? const [];

                      if (lessons.isEmpty) {
                        return const Center(
                          child: Text(
                            'This course has no published lessons yet.',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        );
                      }

                      return ListView.builder(
                        itemCount: lessons.length,
                        itemBuilder: (context, index) {
                          return _buildLessonTile(
                            context,
                            lessons[index],
                            languageCode,
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLessonTile(
    BuildContext context,
    LessonSummary lesson,
    String languageCode,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => LessonReaderScreen(
                course: widget.course,
                lesson: lesson,
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.play_arrow,
                  color: Color(0xFF0284C7),
                  size: 18,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${lesson.order}. '
                      '${lesson.title.resolve(languageCode)}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${lesson.estimatedMinutes} min read',
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.arrow_forward_ios,
                color: Colors.grey,
                size: 12,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildError(Object? error) {
    final failure = error is ContentFailure ? error : null;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            failure?.isOffline ?? false
                ? Icons.cloud_off_outlined
                : Icons.lock_outline,
            color: Colors.grey,
            size: 28,
          ),
          const SizedBox(height: 10),
          Text(
            failure?.message ?? 'The lessons could not be loaded.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: _reload,
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFF0284C7)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              'Retry',
              style: TextStyle(fontSize: 12, color: Color(0xFF0284C7)),
            ),
          ),
        ],
      ),
    );
  }
}
