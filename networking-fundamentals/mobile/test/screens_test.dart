import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:networking_fundamentals/features/auth/courses/ai_tutor_screen.dart';
import 'package:networking_fundamentals/features/auth/courses/custom_bottom_nav_bar.dart';
import 'package:networking_fundamentals/features/auth/courses/delete_account_screen.dart';
import 'package:networking_fundamentals/features/auth/courses/learning_path_screen.dart';
import 'package:networking_fundamentals/features/auth/courses/profile_screen.dart';
import 'package:networking_fundamentals/main_navigation_screen.dart';

void main() {
  Future<void> pumpWithLargeSurface(WidgetTester tester, Widget child) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(MaterialApp(home: child));
    await tester.pumpAndSettle();
  }

  testWidgets('MainNavigation opens the offline subnet tool', (tester) async {
    await pumpWithLargeSurface(tester, const MainNavigationScreen());

    expect(find.text('Learning Path / Learn Screen'), findsOneWidget);

    await tester.tap(find.text('Tools'));
    await tester.pumpAndSettle();

    expect(find.text('Subnet calculator'), findsOneWidget);
    expect(find.text('Calculate subnet'), findsOneWidget);
  });

  testWidgets('Learning path shows the six course states', (tester) async {
    await pumpWithLargeSurface(tester, const LearningPathScreen());

    expect(find.text('Your learning path'), findsOneWidget);
    expect(find.text('Network foundations'), findsWidgets);
    expect(find.text('IPv4 & subnetting'), findsWidgets);
    expect(find.text('Routing essentials'), findsWidgets);
    expect(find.text('Network security'), findsWidgets);
    expect(find.text('Pass course 03 with >70% to unlock'), findsOneWidget);
  });

  testWidgets('AI tutor switches between course and general chat', (tester) async {
    await pumpWithLargeSurface(
      tester,
      const AiTutorScreen(initialIsCourseContext: false),
    );

    expect(
      find.text('What is the difference between a switch and a router?'),
      findsOneWidget,
    );

    await tester.tap(find.text('This course'));
    await tester.pumpAndSettle();

    expect(
      find.text('Why does a /26 network have 62 hosts, not 64?'),
      findsOneWidget,
    );
    expect(find.text('COURSE CONTEXT ATTACHED'), findsOneWidget);

    await tester.tap(find.text('General chat'));
    await tester.pumpAndSettle();

    expect(
      find.text('What is the difference between a switch and a router?'),
      findsOneWidget,
    );
  });

  testWidgets('Profile exposes sign out and delete confirmations', (tester) async {
    await pumpWithLargeSurface(tester, const ProfileScreen());

    expect(find.text('Sara Ahmed'), findsOneWidget);
    expect(find.text('Sign out securely'), findsOneWidget);
    expect(find.text('Delete account'), findsOneWidget);

    await tester.tap(find.text('Sign out securely'));
    await tester.pumpAndSettle();

    expect(find.text('Leave this device safely?'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back).first);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Delete account'));
    await tester.pumpAndSettle();

    expect(find.text('Delete your account?'), findsOneWidget);
    expect(find.text('Type DELETE to confirm'), findsOneWidget);
  });

  testWidgets('bottom navigation blocks the tutor during an active assessment', (tester) async {
    await pumpWithLargeSurface(
      tester,
      const Scaffold(body: CustomBottomNavBar(currentIndex: 0, isAssessmentActive: true)),
    );

    await tester.tap(find.text('AI Tutor'));
    await tester.pumpAndSettle();

    expect(find.text('Focus mode is on'), findsOneWidget);
    expect(find.text('Tutor unavailable during active quizzes'), findsOneWidget);
  });

  testWidgets('bottom navigation opens the general tutor when no assessment is active', (tester) async {
    await pumpWithLargeSurface(
      tester,
      const Scaffold(body: CustomBottomNavBar(currentIndex: 0)),
    );

    await tester.tap(find.text('AI Tutor'));
    await tester.pumpAndSettle();

    expect(find.text('Your networking tutor'), findsOneWidget);
    expect(find.text('General chat'), findsOneWidget);
  });

  testWidgets('bottom navigation opens the learning path from another tab', (tester) async {
    await pumpWithLargeSurface(
      tester,
      const Scaffold(body: CustomBottomNavBar(currentIndex: 1)),
    );

    await tester.tap(find.text('Learn'));
    await tester.pumpAndSettle();

    expect(find.text('Your learning path'), findsOneWidget);
  });

  testWidgets('delete account validates every confirmation before acting', (tester) async {
    await pumpWithLargeSurface(tester, const DeleteAccountScreen());

    await tester.tap(find.text('Permanently delete account'));
    await tester.pumpAndSettle();

    expect(find.text('Enter your password to continue.'), findsOneWidget);

    // Let the queued SnackBar expire before the next validation round.
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), 'SomePassword1!');
    await tester.tap(find.text('Permanently delete account'));
    await tester.pumpAndSettle();

    expect(find.text('Type DELETE to confirm.'), findsOneWidget);

    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(1), 'DELETE');
    await tester.tap(find.text('Permanently delete account'));
    await tester.pumpAndSettle();

    expect(
      find.text('Please confirm that you understand this is permanent.'),
      findsOneWidget,
    );
  });
}
