import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../../main.dart';
import '../../content/data/content_repository.dart';
import '../../content/domain/content_models.dart';
import 'ai_tutor_screen.dart';
import 'profile_screen.dart';
import 'quiz_screen.dart';
import 'subnet_calculator_screen.dart';

/// Reads one lesson of the active content version and renders its sections.
///
/// Section kinds follow the content schema: `text`, `image` and `video`. A
/// video section renders its documented fallback text because the MVP ships no
/// video player; the answer key of the checkpoint never reaches the client, so
/// "Check answer" hands over to the graded quiz screen.
class LessonReaderScreen extends StatefulWidget {
  const LessonReaderScreen({
    super.key,
    required this.course,
    required this.lesson,
  });

  final CourseSummary course;
  final LessonSummary lesson;

  @override
  State<LessonReaderScreen> createState() => _LessonReaderScreenState();
}

class _LessonReaderScreenState extends State<LessonReaderScreen> {
  final ContentRepository _repository = ContentRepository();

  late Future<LessonContent> _content;
  String? _selectedOptionId;

  @override
  void initState() {
    super.initState();
    _content = _repository.fetchLesson(
      widget.course.courseId,
      widget.lesson.lessonId,
    );
  }

  void _reload() {
    setState(() {
      _content = _repository.fetchLesson(
        widget.course.courseId,
        widget.lesson.lessonId,
      );
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
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20.0,
                  vertical: 12.0,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            IconButton(
                              onPressed: () => Navigator.pop(context),
                              icon: const Icon(
                                Icons.arrow_back,
                                color: Colors.white,
                              ),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                            const SizedBox(width: 16),
                            Text(
                              'COURSE '
                              '${widget.course.order.toString().padLeft(2, '0')}'
                              ' • '
                              '${widget.course.title.resolve(languageCode).toUpperCase()}',
                              style: const TextStyle(
                                fontSize: 9,
                                color: Colors.grey,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        OutlinedButton(
                          onPressed: () => MyApp.of(context).changeLanguage(
                            isArabic
                                ? const Locale('en', 'US')
                                : const Locale('ar', 'AE'),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF1E293B)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                          ),
                          child: Text(
                            isArabic ? 'EN' : 'عربي',
                            style: const TextStyle(
                              color: Color(0xFF0284C7),
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.lesson.title.resolve(languageCode),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7)
                                .withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'LESSON ${widget.lesson.order} OF '
                            '${widget.course.lessonCount}',
                            style: const TextStyle(
                              fontSize: 9,
                              color: Color(0xFF0284C7),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Text(
                          '${widget.lesson.estimatedMinutes} min read',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    LinearProgressIndicator(
                      value: widget.course.lessonCount == 0
                          ? 0
                          : (widget.lesson.order / widget.course.lessonCount)
                              .clamp(0.0, 1.0),
                      backgroundColor: const Color(0xFF1E293B),
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        Color(0xFF0284C7),
                      ),
                      minHeight: 3,
                    ),
                  ],
                ),
              ),
              Expanded(
                child: FutureBuilder<LessonContent>(
                  future: _content,
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

                    final content = snapshot.data;

                    if (content == null) {
                      return const Center(
                        child: Text(
                          'This lesson has no published content yet.',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      );
                    }

                    return _buildContent(context, content, languageCode);
                  },
                ),
              ),
              _buildBottomBar(context),
            ],
          ),
        ),
        bottomNavigationBar: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            border: Border(top: BorderSide(color: Color(0xFF1E293B))),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(context, Icons.menu_book, 'Learn', true, () {}),
              _buildNavItem(context, Icons.grid_view_outlined, 'Tools', false,
                  () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const SubnetCalculatorScreen(),
                  ),
                );
              }),
              _buildNavItem(context, Icons.psychology_outlined, 'AI Tutor',
                  false, () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const AiTutorScreen()),
                );
              }),
              _buildNavItem(context, Icons.person_outline, 'Profile', false, () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const ProfileScreen(),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    LessonContent content,
    String languageCode,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!content.summary.isEmpty) ...[
            Text(
              content.summary.resolve(languageCode),
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
          ],
          for (final section in content.sections) ...[
            _buildSection(section, languageCode),
            const SizedBox(height: 16),
          ],
          _buildAiTutorButton(context, content, languageCode),
          const SizedBox(height: 20),
          _buildCheckpoint(context, content, languageCode),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildSection(LessonSection section, String languageCode) {
    switch (section.type) {
      case LessonSectionType.text:
        if (section.text.isEmpty) {
          return const SizedBox.shrink();
        }

        return Text(
          section.text.resolve(languageCode),
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
            height: 1.5,
          ),
        );

      case LessonSectionType.image:
        final alt = section.alt?.resolve(languageCode) ?? '';

        return Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(14)),
                child: SizedBox(
                  height: 160,
                  width: double.infinity,
                  child: Image.network(
                    section.imageUrl ?? '',
                    fit: BoxFit.cover,
                    loadingBuilder: (context, child, progress) {
                      if (progress == null) {
                        return child;
                      }

                      return const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF0284C7),
                          strokeWidth: 2,
                        ),
                      );
                    },
                    errorBuilder: (context, error, stackTrace) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.image_not_supported_outlined,
                                color: Colors.grey,
                                size: 24,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                alt,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
              if (section.caption != null &&
                  !section.caption!.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(10),
                  child: Text(
                    section.caption!.resolve(languageCode),
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ),
            ],
          ),
        );

      case LessonSectionType.video:
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(
                    Icons.play_circle_outline,
                    color: Color(0xFF0284C7),
                    size: 18,
                  ),
                  SizedBox(width: 8),
                  Text(
                    'VIDEO LESSON',
                    style: TextStyle(
                      fontSize: 9,
                      color: Color(0xFF0284C7),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                section.videoFallback ??
                    section.text.resolve(languageCode),
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                  height: 1.5,
                ),
              ),
            ],
          ),
        );

      case LessonSectionType.unknown:
        return const SizedBox.shrink();
    }
  }

  Widget _buildAiTutorButton(
    BuildContext context,
    LessonContent content,
    String languageCode,
  ) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF0284C7).withValues(alpha: 0.3),
        ),
      ),
      child: TextButton.icon(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => AiTutorScreen(
                initialIsCourseContext: true,
                lessonTitle: '${widget.course.title.resolve(languageCode)}\n'
                    'Lesson ${content.order} · '
                    '${content.title.resolve(languageCode)}',
              ),
            ),
          );
        },
        icon: const Icon(
          Icons.psychology,
          color: Color(0xFF0284C7),
          size: 18,
        ),
        label: const Text(
          'Ask AI Tutor about this lesson',
          style: TextStyle(
            color: Color(0xFF0284C7),
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 12),
        ),
      ),
    );
  }

  Widget _buildCheckpoint(
    BuildContext context,
    LessonContent content,
    String languageCode,
  ) {
    final checkpoint = content.checkpoint;

    if (checkpoint == null) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF0284C7).withValues(alpha: 0.4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'REQUIRED CHECKPOINT',
                style: TextStyle(
                  fontSize: 9,
                  color: Color(0xFF0284C7),
                  fontWeight: FontWeight.bold,
                ),
              ),
              Icon(
                Icons.help_outline,
                color: Color(0xFF0284C7),
                size: 16,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            checkpoint.question.resolve(languageCode),
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 14),
          for (final option in checkpoint.options) ...[
            _buildCheckpointOption(option, languageCode),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 40,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const QuizScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Check answer',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Center(
            child: Text(
              'Answer correctly to complete this lesson. Unlimited attempts.',
              style: TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckpointOption(CheckpointOption option, String languageCode) {
    final isSelected = _selectedOptionId == option.optionId;

    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () {
        setState(() {
          _selectedOptionId = option.optionId;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF0284C7).withValues(alpha: 0.2)
              : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF0284C7)
                : const Color(0xFF1E293B),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFF0284C7)
                    : const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                option.optionId.toUpperCase(),
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                option.text.resolve(languageCode),
                style: TextStyle(
                  fontSize: 12,
                  color: isSelected ? Colors.white : Colors.grey[300],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: ElevatedButton(
          onPressed: () {
            final signedIn = FirebaseAuth.instance.currentUser != null;

            if (signedIn) {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const QuizScreen()),
              );
            } else {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  backgroundColor: const Color(0xFF1E293B),
                  title: const Text(
                    'Access Restricted',
                    style: TextStyle(color: Colors.white, fontSize: 16),
                  ),
                  content: const Text(
                    'Guests cannot take graded assessments or quizzes. '
                    'Please log in or create a free account to access exams.',
                    style: TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                      ),
                      child: const Text(
                        'Log In',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ],
                ),
              );
            }
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0284C7),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: const Text(
            'Complete checkpoint to continue',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildError(Object? error) {
    final failure = error is ContentFailure ? error : null;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
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
              failure?.message ?? 'This lesson could not be loaded.',
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
      ),
    );
  }

  Widget _buildNavItem(
    BuildContext context,
    IconData icon,
    String label,
    bool isSelected,
    VoidCallback onTap,
  ) {
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
