import 'package:flutter_test/flutter_test.dart';
import 'package:networking_fundamentals/features/content/domain/content_models.dart';

void main() {
  group('LocalizedText', () {
    test('resolves Arabic when requested and present', () {
      const text = LocalizedText(en: 'Network', ar: 'شبكة');

      expect(text.resolve('ar'), 'شبكة');
      expect(text.resolve('en'), 'Network');
      expect(text.isEmpty, isFalse);
    });

    test('falls back to English when Arabic is missing', () {
      const text = LocalizedText(en: 'Network', ar: '');

      expect(text.resolve('ar'), 'Network');
    });

    test('falls back to Arabic when English is missing', () {
      const text = LocalizedText(en: '   ', ar: 'شبكة');

      expect(text.resolve('en'), 'شبكة');
      expect(text.isEmpty, isFalse);
    });

    test('parses a plain string and an empty value', () {
      expect(LocalizedText.fromValue('Network').en, 'Network');
      expect(LocalizedText.fromValue(null).isEmpty, isTrue);
      expect(LocalizedText.fromValue(<String, dynamic>{'en': 'A', 'ar': 'ب'}).ar, 'ب');
    });
  });

  group('CourseSummary', () {
    test('uses the document id as a fallback and converts numbers', () {
      final course = CourseSummary.fromDocument('course-07', <String, dynamic>{
        'title': {'en': 'Network security', 'ar': 'أمن الشبكات'},
        'description': {'en': 'Keep networks safe', 'ar': ''},
        'order': 7,
        'estimatedMinutes': 40,
        'lessonCount': 5,
        'contentVersion': 'v001',
      });

      expect(course.courseId, 'course-07');
      expect(course.order, 7);
      expect(course.estimatedMinutes, 40);
      expect(course.lessonCount, 5);
      expect(course.title.resolve('ar'), 'أمن الشبكات');
      expect(course.description.resolve('ar'), 'Keep networks safe');
      expect(course.finalQuizId, isNull);
      expect(course.contentVersion, 'v001');
    });
  });

  group('LessonSummary', () {
    test('uses the document id as a fallback', () {
      final lesson = LessonSummary.fromDocument('lesson-03', <String, dynamic>{
        'title': {'en': 'Subnet masks', 'ar': 'أقنعة الشبكات'},
        'summary': 'Choose the right mask',
        'order': 3,
        'estimatedMinutes': 12,
        'contentVersion': 'v001',
      });

      expect(lesson.lessonId, 'lesson-03');
      expect(lesson.order, 3);
      expect(lesson.summary.resolve('en'), 'Choose the right mask');
      expect(lesson.contentVersion, 'v001');
    });
  });

  group('LessonSection', () {
    test('parses every supported section type and falls back to unknown', () {
      final text = LessonSection.fromMap(<String, dynamic>{
        'sectionId': 's1',
        'order': 1,
        'type': 'text',
        'text': {'en': 'Hello', 'ar': 'مرحبا'},
      });
      final image = LessonSection.fromMap(<String, dynamic>{
        'sectionId': 's2',
        'order': 2,
        'type': 'image',
        'imageUrl': 'https://example.test/a.svg',
        'alt': {'en': 'Diagram', 'ar': ''},
        'caption': {'en': 'Two routers', 'ar': ''},
      });
      final video = LessonSection.fromMap(<String, dynamic>{
        'sectionId': 's3',
        'order': 3,
        'type': 'video',
        'provider': 'local',
        'videoId': 'v1',
        'fallback': 'Watch the lesson video',
      });
      final unknown = LessonSection.fromMap(<String, dynamic>{
        'sectionId': 's4',
        'order': 4,
        'type': 'quiz',
      });

      expect(text.type, LessonSectionType.text);
      expect(image.type, LessonSectionType.image);
      expect(image.alt?.resolve('ar'), 'Diagram');
      expect(video.type, LessonSectionType.video);
      expect(video.videoFallback, 'Watch the lesson video');
      expect(unknown.type, LessonSectionType.unknown);
    });
  });

  group('LessonCheckpoint', () {
    test('parses options and ignores non-map entries', () {
      final checkpoint = LessonCheckpoint.fromMap(<String, dynamic>{
        'checkpointId': 'cp1',
        'afterSectionId': 's2',
        'question': {'en': 'Pick one', 'ar': 'اختر'},
        'options': <dynamic>[
          <String, dynamic>{'optionId': 'a', 'text': {'en': 'A', 'ar': 'أ'}},
          'broken',
          <String, dynamic>{'optionId': 'b', 'text': {'en': 'B', 'ar': 'ب'}},
        ],
      });

      expect(checkpoint.checkpointId, 'cp1');
      expect(checkpoint.afterSectionId, 's2');
      expect(checkpoint.options, hasLength(2));
      expect(checkpoint.options.first.optionId, 'a');
      expect(checkpoint.options.last.text.resolve('ar'), 'ب');
    });
  });

  group('LessonContent', () {
    test('sorts sections by order and parses the checkpoint', () {
      final lesson = LessonContent.fromDocument('lesson-03', <String, dynamic>{
        'courseId': 'course-01',
        'order': 3,
        'title': {'en': 'Subnet masks', 'ar': 'أقنعة الشبكات'},
        'summary': {'en': 'Choose the right mask', 'ar': ''},
        'estimatedMinutes': 12,
        'contentVersion': 'v001',
        'sections': <dynamic>[
          <String, dynamic>{'sectionId': 's2', 'order': 2, 'type': 'text'},
          <String, dynamic>{'sectionId': 's1', 'order': 1, 'type': 'text'},
        ],
        'checkpoint': <String, dynamic>{
          'checkpointId': 'cp1',
          'afterSectionId': 's2',
          'question': {'en': 'Pick one', 'ar': ''},
          'options': <dynamic>[],
        },
      });

      expect(lesson.lessonId, 'lesson-03');
      expect(lesson.courseId, 'course-01');
      expect(lesson.sections.map((section) => section.sectionId), ['s1', 's2']);
      expect(lesson.checkpoint?.checkpointId, 'cp1');
    });

    test('leaves the checkpoint null when it is absent', () {
      final lesson = LessonContent.fromDocument('lesson-04', <String, dynamic>{
        'title': {'en': 'No checkpoint', 'ar': ''},
      });

      expect(lesson.checkpoint, isNull);
      expect(lesson.sections, isEmpty);
    });
  });

  group('VersionedContent', () {
    test('keeps the version anchor and items', () {
      const content = VersionedContent<String>(
        contentVersion: 'v001',
        formatVersion: 1,
        items: ['a', 'b'],
      );

      expect(content.contentVersion, 'v001');
      expect(content.formatVersion, 1);
      expect(content.items, ['a', 'b']);
    });
  });
}
