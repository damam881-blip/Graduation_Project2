/// Bilingual content models for the N3-02 read contract
/// (`backend/docs/content-read-n3.md`).
///
/// Every document carries `contentVersion`; the repository discards items whose
/// version differs from the active pointer, so models keep the field.
library;

/// A bilingual string pair as stored by the content pipeline.
class LocalizedText {
  const LocalizedText({required this.en, required this.ar});

  factory LocalizedText.fromValue(Object? value) {
    if (value is Map) {
      return LocalizedText(
        en: value['en'] as String? ?? '',
        ar: value['ar'] as String? ?? '',
      );
    }

    return LocalizedText(en: value is String ? value : '', ar: '');
  }

  final String en;
  final String ar;

  bool get isEmpty => en.trim().isEmpty && ar.trim().isEmpty;

  /// Picks the requested language and falls back to English when missing.
  String resolve(String languageCode) {
    if (languageCode == 'ar' && ar.trim().isNotEmpty) {
      return ar;
    }

    if (en.trim().isNotEmpty) {
      return en;
    }

    return ar;
  }
}

/// One catalog entry.
class CourseSummary {
  const CourseSummary({
    required this.courseId,
    required this.order,
    required this.title,
    required this.description,
    required this.estimatedMinutes,
    required this.lessonCount,
    required this.finalQuizId,
    required this.contentVersion,
  });

  factory CourseSummary.fromDocument(
    String documentId,
    Map<String, dynamic> data,
  ) {
    return CourseSummary(
      courseId: data['courseId'] as String? ?? documentId,
      order: (data['order'] as num?)?.toInt() ?? 0,
      title: LocalizedText.fromValue(data['title']),
      description: LocalizedText.fromValue(data['description']),
      estimatedMinutes: (data['estimatedMinutes'] as num?)?.toInt() ?? 0,
      lessonCount: (data['lessonCount'] as num?)?.toInt() ?? 0,
      finalQuizId: data['finalQuizId'] as String?,
      contentVersion: data['contentVersion'] as String? ?? '',
    );
  }

  final String courseId;
  final int order;
  final LocalizedText title;
  final LocalizedText description;
  final int estimatedMinutes;
  final int lessonCount;
  final String? finalQuizId;
  final String contentVersion;
}

/// Lesson entry inside a course.
class LessonSummary {
  const LessonSummary({
    required this.lessonId,
    required this.order,
    required this.title,
    required this.summary,
    required this.estimatedMinutes,
    required this.contentVersion,
  });

  factory LessonSummary.fromDocument(
    String documentId,
    Map<String, dynamic> data,
  ) {
    return LessonSummary(
      lessonId: data['lessonId'] as String? ?? documentId,
      order: (data['order'] as num?)?.toInt() ?? 0,
      title: LocalizedText.fromValue(data['title']),
      summary: LocalizedText.fromValue(data['summary']),
      estimatedMinutes: (data['estimatedMinutes'] as num?)?.toInt() ?? 0,
      contentVersion: data['contentVersion'] as String? ?? '',
    );
  }

  final String lessonId;
  final int order;
  final LocalizedText title;
  final LocalizedText summary;
  final int estimatedMinutes;
  final String contentVersion;
}

/// Section kinds allowed by the content schema.
enum LessonSectionType { text, image, video, unknown }

/// One renderable block of a lesson.
class LessonSection {
  const LessonSection({
    required this.sectionId,
    required this.order,
    required this.type,
    required this.text,
    this.imageUrl,
    this.alt,
    this.caption,
    this.videoProvider,
    this.videoId,
    this.videoFallback,
  });

  factory LessonSection.fromMap(Map<String, dynamic> data) {
    return LessonSection(
      sectionId: data['sectionId'] as String? ?? '',
      order: (data['order'] as num?)?.toInt() ?? 0,
      type: _typeOf(data['type'] as String?),
      text: LocalizedText.fromValue(data['text']),
      imageUrl: data['imageUrl'] as String?,
      alt: data['alt'] == null ? null : LocalizedText.fromValue(data['alt']),
      caption: data['caption'] == null
          ? null
          : LocalizedText.fromValue(data['caption']),
      videoProvider: data['provider'] as String?,
      videoId: data['videoId'] as String?,
      videoFallback: data['fallback'] as String?,
    );
  }

  static LessonSectionType _typeOf(String? raw) {
    switch (raw) {
      case 'text':
        return LessonSectionType.text;
      case 'image':
        return LessonSectionType.image;
      case 'video':
        return LessonSectionType.video;
      default:
        return LessonSectionType.unknown;
    }
  }

  final String sectionId;
  final int order;
  final LessonSectionType type;
  final LocalizedText text;
  final String? imageUrl;
  final LocalizedText? alt;
  final LocalizedText? caption;
  final String? videoProvider;
  final String? videoId;
  final String? videoFallback;
}

/// A checkpoint question. The answer key never reaches the client.
class LessonCheckpoint {
  const LessonCheckpoint({
    required this.checkpointId,
    required this.afterSectionId,
    required this.question,
    required this.options,
  });

  factory LessonCheckpoint.fromMap(Map<String, dynamic> data) {
    final rawOptions = data['options'];

    return LessonCheckpoint(
      checkpointId: data['checkpointId'] as String? ?? '',
      afterSectionId: data['afterSectionId'] as String? ?? '',
      question: LocalizedText.fromValue(data['question']),
      options: rawOptions is List
          ? rawOptions
              .whereType<Map>()
              .map((option) => CheckpointOption.fromMap(option))
              .toList(growable: false)
          : const [],
    );
  }

  final String checkpointId;
  final String afterSectionId;
  final LocalizedText question;
  final List<CheckpointOption> options;
}

/// One selectable checkpoint answer.
class CheckpointOption {
  const CheckpointOption({required this.optionId, required this.text});

  factory CheckpointOption.fromMap(Map<dynamic, dynamic> data) {
    return CheckpointOption(
      optionId: data['optionId'] as String? ?? '',
      text: LocalizedText.fromValue(data['text']),
    );
  }

  final String optionId;
  final LocalizedText text;
}

/// Full lesson payload, ordered by `order`.
class LessonContent {
  const LessonContent({
    required this.lessonId,
    required this.courseId,
    required this.order,
    required this.title,
    required this.summary,
    required this.estimatedMinutes,
    required this.sections,
    required this.checkpoint,
    required this.contentVersion,
  });

  factory LessonContent.fromDocument(
    String documentId,
    Map<String, dynamic> data,
  ) {
    final rawSections = data['sections'];
    final rawCheckpoint = data['checkpoint'];

    final sections = rawSections is List
        ? rawSections
            .whereType<Map>()
            .map((section) => LessonSection.fromMap(
                  Map<String, dynamic>.from(section),
                ))
            .toList()
        : <LessonSection>[];

    sections.sort((a, b) => a.order.compareTo(b.order));

    return LessonContent(
      lessonId: data['lessonId'] as String? ?? documentId,
      courseId: data['courseId'] as String? ?? '',
      order: (data['order'] as num?)?.toInt() ?? 0,
      title: LocalizedText.fromValue(data['title']),
      summary: LocalizedText.fromValue(data['summary']),
      estimatedMinutes: (data['estimatedMinutes'] as num?)?.toInt() ?? 0,
      sections: List.unmodifiable(sections),
      checkpoint: rawCheckpoint is Map
          ? LessonCheckpoint.fromMap(Map<String, dynamic>.from(rawCheckpoint))
          : null,
      contentVersion: data['contentVersion'] as String? ?? '',
    );
  }

  final String lessonId;
  final String courseId;
  final int order;
  final LocalizedText title;
  final LocalizedText summary;
  final int estimatedMinutes;
  final List<LessonSection> sections;
  final LessonCheckpoint? checkpoint;
  final String contentVersion;
}

/// A read result anchored to the active content version (contract §4).
class VersionedContent<T> {
  const VersionedContent({
    required this.contentVersion,
    required this.formatVersion,
    required this.items,
  });

  final String contentVersion;
  final int formatVersion;
  final List<T> items;
}
