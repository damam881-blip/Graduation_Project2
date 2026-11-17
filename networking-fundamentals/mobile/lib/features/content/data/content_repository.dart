import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../domain/content_models.dart';

/// Why a content read failed. The UI branches on [code], never on a message.
class ContentFailure implements Exception {
  const ContentFailure(this.code, this.message);

  /// `permission-denied` on a lesson or quiz path: the course is locked.
  static const String locked = 'CONTENT_LOCKED';

  /// Pointer or version document is missing/unsupported: fail closed.
  static const String unavailable = 'CONTENT_UNAVAILABLE';

  /// Transport failure; serve the cached copy and revalidate later.
  static const String offline = 'CONTENT_OFFLINE';

  final String code;
  final String message;

  bool get isLocked => code == locked;
  bool get isOffline => code == offline;

  @override
  String toString() => 'ContentFailure($code): $message';
}

/// Reads approved content directly with the client SDK (decision D-09).
///
/// Implements the exact sequence of `backend/docs/content-read-n3.md`:
/// pointer -> version document -> ordered children. Nothing is hard-coded and
/// nothing falls back to local sample data.
class ContentRepository {
  ContentRepository({FirebaseFirestore? firestore, FirebaseAuth? auth})
      : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  static const int _supportedFormatVersion = 1;
  static const int _maxCourses = 6;

  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  final Map<String, List<CourseSummary>> _catalogCache = {};
  final Map<String, List<LessonSummary>> _lessonListCache = {};
  final Map<String, LessonContent> _lessonCache = {};

  /// Resolves the active version and returns the six-course catalog.
  Future<VersionedContent<CourseSummary>> fetchCatalog() {
    return _resolveVersion().then((version) async {
      final cached = _catalogCache[version.contentVersion];

      if (cached != null) {
        return VersionedContent(
          contentVersion: version.contentVersion,
          formatVersion: version.formatVersion,
          items: cached,
        );
      }

      final snapshot = await _guard(
        () => _firestore
            .collection('contentVersions/${version.contentVersion}/courses')
            .orderBy('order')
            .get(),
      );

      final items = snapshot.docs
          .map((doc) => CourseSummary.fromDocument(doc.id, doc.data()))
          .toList();

      _assertSameVersion(items.map((item) => item.contentVersion), version);
      _assertCatalogSize(items.length);

      _catalogCache[version.contentVersion] = List.unmodifiable(items);

      return VersionedContent(
        contentVersion: version.contentVersion,
        formatVersion: version.formatVersion,
        items: List.unmodifiable(items),
      );
    });
  }

  /// Reads the lesson list of one course. Denied reads mean "locked".
  Future<VersionedContent<LessonSummary>> fetchLessons(String courseId) {
    return _resolveVersion().then((version) async {
      final cacheKey = '${version.contentVersion}/$courseId';
      final cached = _lessonListCache[cacheKey];

      if (cached != null) {
        return VersionedContent(
          contentVersion: version.contentVersion,
          formatVersion: version.formatVersion,
          items: cached,
        );
      }

      final snapshot = await _guard(
        () => _firestore
            .collection(
              'contentVersions/${version.contentVersion}'
              '/courses/$courseId/lessons',
            )
            .orderBy('order')
            .get(),
      );

      final items = snapshot.docs
          .map((doc) => LessonSummary.fromDocument(doc.id, doc.data()))
          .toList();

      _assertSameVersion(items.map((item) => item.contentVersion), version);

      _lessonListCache[cacheKey] = List.unmodifiable(items);

      return VersionedContent(
        contentVersion: version.contentVersion,
        formatVersion: version.formatVersion,
        items: List.unmodifiable(items),
      );
    });
  }

  /// Reads one lesson, including its ordered sections.
  Future<LessonContent> fetchLesson(String courseId, String lessonId) {
    return _resolveVersion().then((version) async {
      final cacheKey = '${version.contentVersion}/$courseId/$lessonId';
      final cached = _lessonCache[cacheKey];

      if (cached != null) {
        return cached;
      }

      final snapshot = await _guard(
        () => _firestore
            .doc(
              'contentVersions/${version.contentVersion}'
              '/courses/$courseId/lessons/$lessonId',
            )
            .get(),
      );

      final data = snapshot.data();

      if (!snapshot.exists || data == null) {
        throw const ContentFailure(
          ContentFailure.unavailable,
          'The lesson is not part of the active content version.',
        );
      }

      final lesson = LessonContent.fromDocument(snapshot.id, data);

      if (lesson.contentVersion != version.contentVersion) {
        _catalogCache.clear();
        _lessonListCache.clear();
        _lessonCache.clear();

        throw const ContentFailure(
          ContentFailure.unavailable,
          'The lesson belongs to another content version. Reopen the course.',
        );
      }

      _lessonCache[cacheKey] = lesson;

      return lesson;
    });
  }

  /// `course-01` is free. Everything else needs an own progress document whose
  /// status is not `locked`; a denial or a missing document means locked.
  Future<bool> isCourseUnlocked(String courseId) async {
    if (courseId == 'course-01') {
      return true;
    }

    final user = _auth.currentUser;

    if (user == null) {
      return false;
    }

    try {
      final snapshot = await _firestore
          .doc('users/${user.uid}/courseProgress/$courseId')
          .get();

      if (!snapshot.exists) {
        return false;
      }

      return snapshot.data()?['status'] != 'locked';
    } on FirebaseException catch (error) {
      if (error.code == 'permission-denied') {
        return false;
      }

      return false;
    }
  }

  /// Drops every cached projection; call after a version change or sign-out.
  void invalidateCache() {
    _catalogCache.clear();
    _lessonListCache.clear();
    _lessonCache.clear();
  }

  Future<_ActiveVersion> _resolveVersion() async {
    DocumentSnapshot<Map<String, dynamic>> pointer;

    try {
      pointer = await _firestore
          .doc('system/publishedContentVersion')
          .get();
    } on FirebaseException catch (error) {
      throw _mapError(error, onContentPath: true);
    }

    final pointerData = pointer.data();
    final contentVersion = pointerData?['contentVersion'];
    final formatVersion = pointerData?['formatVersion'];

    if (!pointer.exists ||
        contentVersion is! String ||
        contentVersion.isEmpty) {
      throw const ContentFailure(
        ContentFailure.unavailable,
        'No content version is published.',
      );
    }

    if (formatVersion != _supportedFormatVersion) {
      throw const ContentFailure(
        ContentFailure.unavailable,
        'This app does not understand the published content format.',
      );
    }

    try {
      final versionDoc = await _firestore
          .doc('contentVersions/$contentVersion')
          .get();

      if (!versionDoc.exists ||
          versionDoc.data()?['status'] != 'published') {
        throw const ContentFailure(
          ContentFailure.unavailable,
          'The published content version is not active.',
        );
      }
    } on FirebaseException catch (error) {
      throw _mapError(error, onContentPath: true);
    }

    return _ActiveVersion(
      contentVersion: contentVersion,
      formatVersion: _supportedFormatVersion,
    );
  }

  Future<T> _guard<T>(Future<T> Function() read) async {
    try {
      return await read();
    } on FirebaseException catch (error) {
      throw _mapError(error, onContentPath: false);
    }
  }

  ContentFailure _mapError(
    FirebaseException error, {
    required bool onContentPath,
  }) {
    switch (error.code) {
      case 'permission-denied':
        return onContentPath
            ? const ContentFailure(
                ContentFailure.unavailable,
                'Content is not available right now.',
              )
            : const ContentFailure(
                ContentFailure.locked,
                'This course is locked. Finish the previous course first.',
              );
      case 'unavailable':
      case 'deadline-exceeded':
      case 'network-request-failed':
        return const ContentFailure(
          ContentFailure.offline,
          'You are offline. Showing the last downloaded content.',
        );
      default:
        return ContentFailure(
          ContentFailure.unavailable,
          error.message ?? 'Content could not be loaded.',
        );
    }
  }

  void _assertSameVersion(
    Iterable<String> versions,
    _ActiveVersion active,
  ) {
    final stale = versions.any(
      (version) => version != active.contentVersion,
    );

    if (stale) {
      _catalogCache.clear();
      _lessonListCache.clear();
      _lessonCache.clear();

      throw const ContentFailure(
        ContentFailure.unavailable,
        'The content was updated. Please reload.',
      );
    }
  }

  void _assertCatalogSize(int count) {
    if (count > _maxCourses) {
      throw const ContentFailure(
        ContentFailure.unavailable,
        'The catalog is larger than this app version supports.',
      );
    }
  }
}

class _ActiveVersion {
  const _ActiveVersion({
    required this.contentVersion,
    required this.formatVersion,
  });

  final String contentVersion;
  final int formatVersion;
}
