import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:networking_fundamentals/features/auth/login_screen.dart';
import 'package:networking_fundamentals/features/auth/register_screen.dart';
import 'package:networking_fundamentals/main.dart';

void main() {
  Future<void> pumpApp(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pumpAndSettle();
  }

  testWidgets('welcome screen toggles theme and language', (tester) async {
    await pumpApp(tester);

    final state = tester.state<MyAppState>(find.byType(MyApp));
    expect(state.isDarkMode, isTrue);

    await tester.tap(find.byIcon(Icons.brightness_6));
    await tester.pumpAndSettle();

    expect(state.isDarkMode, isFalse);

    await tester.tap(find.text('عربي'));
    await tester.pumpAndSettle();

    expect(find.text('English'), findsOneWidget);
  });

  testWidgets('welcome screen opens sign in and registration', (tester) async {
    await pumpApp(tester);

    await tester.tap(find.text('Sign in to continue'));
    await tester.pumpAndSettle();

    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Continue as guest'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back).first);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create a free account'));
    await tester.pumpAndSettle();

    expect(find.text('Start your learning path'), findsOneWidget);
    expect(find.text('Create my account'), findsOneWidget);
  });

  testWidgets('registration validates the required fields before calling Auth', (tester) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: RegisterScreen()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create my account'));
    await tester.pumpAndSettle();

    expect(find.text('Please enter your full name.'), findsOneWidget);
    expect(find.text('Please enter your email.'), findsOneWidget);
    expect(find.text('Please enter a password.'), findsOneWidget);
    expect(find.text('Please confirm your password.'), findsOneWidget);
  });

  testWidgets('registration rejects a mismatched confirmation password', (tester) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: RegisterScreen()));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'Sara Ahmed');
    await tester.enterText(find.byType(TextFormField).at(1), 'sara@example.test');
    await tester.enterText(find.byType(TextFormField).at(4), 'Password1!');
    await tester.enterText(find.byType(TextFormField).at(5), 'Password2!');
    await tester.tap(find.text('Create my account'));
    await tester.pumpAndSettle();

    expect(find.text('Passwords do not match.'), findsOneWidget);
  });

  testWidgets('login validates the required fields before calling Auth', (tester) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: LoginScreen()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Sign in securely'));
    await tester.pumpAndSettle();

    expect(find.text('Please enter your email.'), findsOneWidget);
    expect(find.text('Please enter your password.'), findsOneWidget);
  });
}
