import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:networking_fundamentals/features/auth/courses/quiz_screen.dart';

void main() {
  Future<void> pumpQuiz(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: QuizScreen()));
    await tester.pumpAndSettle();
  }

  testWidgets('starts on question 07 and can select an option', (tester) async {
    await pumpQuiz(tester);

    expect(find.text('07 / 10'), findsOneWidget);
    expect(find.text('Which subnet mask corresponds to a /26 prefix?'), findsOneWidget);

    await tester.tap(find.text('255.255.255.192'));
    await tester.pumpAndSettle();

    expect(find.text('Which subnet mask corresponds to a /26 prefix?'), findsOneWidget);
  });

  testWidgets('moves to the next question and resets the selection', (tester) async {
    await pumpQuiz(tester);

    await tester.tap(find.text('Next question'));
    await tester.pumpAndSettle();

    expect(find.text('08 / 10'), findsOneWidget);
    expect(find.text('Which protocol is used to assign IP addresses dynamically?'), findsOneWidget);
  });

  testWidgets('jumps through the numeric strip and reaches submission', (tester) async {
    await pumpQuiz(tester);

    await tester.tap(find.text('10'));
    await tester.pumpAndSettle();

    expect(find.text('10 / 10'), findsOneWidget);
    expect(find.text('Go to submission'), findsOneWidget);

    await tester.tap(find.text('Go to submission'));
    await tester.pumpAndSettle();

    expect(find.text('All 10 answers are saved'), findsOneWidget);
    expect(find.text('Submit quiz'), findsOneWidget);

    await tester.tap(find.text('Submit quiz'));
    await tester.pumpAndSettle();

    expect(find.text('80%'), findsOneWidget);
    expect(find.text('8 correct • Unlocked 80%'), findsOneWidget);
    expect(find.text('2 incorrect • Unanswered 0 • Completed 10 of 10'), findsOneWidget);
  });

  testWidgets('previous is enabled from question 07 and returns to question 06', (tester) async {
    await pumpQuiz(tester);

    await tester.tap(find.text('Previous question'));
    await tester.pumpAndSettle();

    expect(find.text('06 / 10'), findsOneWidget);
  });
}
