import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:networking_fundamentals/features/auth/courses/subnet_calculator_screen.dart';

void main() {
  Future<void> pumpCalculator(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: SubnetCalculatorScreen()));
    await tester.pumpAndSettle();
  }

  testWidgets('shows the default /26 result for the default address', (tester) async {
    await pumpCalculator(tester);

    expect(find.text('192.168.10.0/26'), findsOneWidget);
    expect(find.text('255.255.255.192'), findsOneWidget);
    expect(find.text('192.168.10.1 – 192.168.10.62'), findsOneWidget);
    expect(find.text('192.168.10.63'), findsOneWidget);
    expect(find.text('• 64 addresses'), findsOneWidget);
    expect(find.text('• 62 usable hosts'), findsOneWidget);
    expect(find.text('11000000.10101000.00001010.00101010'), findsOneWidget);
  });

  testWidgets('recalculates a different address and keeps one slash for /24', (tester) async {
    await pumpCalculator(tester);

    await tester.enterText(find.byType(TextField).at(0), '10.20.30.40');
    await tester.enterText(find.byType(TextField).at(1), '/24');
    await tester.tap(find.text('Calculate subnet'));
    await tester.pumpAndSettle();

    expect(find.text('10.20.30.0/24'), findsOneWidget);
    expect(find.text('255.255.255.0'), findsOneWidget);
    expect(find.text('10.20.30.1 – 10.20.30.254'), findsOneWidget);
    expect(find.text('10.20.30.255'), findsOneWidget);
    expect(find.text('• 256 addresses'), findsOneWidget);
    expect(find.text('• 254 usable hosts'), findsOneWidget);
    expect(find.text('00001010.00010100.00011110.00101000'), findsOneWidget);
    expect(find.textContaining('//'), findsNothing);
  });

  testWidgets('rejects an invalid IP and hides the previous results', (tester) async {
    await pumpCalculator(tester);

    await tester.enterText(find.byType(TextField).at(0), '999.1.1.1');
    await tester.enterText(find.byType(TextField).at(1), '24');
    await tester.tap(find.text('Calculate subnet'));
    await tester.pumpAndSettle();

    expect(find.text('Each octet must be a number from 0 to 255.'), findsOneWidget);
    expect(find.text('Subnet results'), findsNothing);
    expect(
      find.textContaining('No results generated. Correct the IP address and prefix.'),
      findsOneWidget,
    );
  });

  testWidgets('rejects an invalid prefix', (tester) async {
    await pumpCalculator(tester);

    await tester.enterText(find.byType(TextField).at(0), '192.168.1.10');
    await tester.enterText(find.byType(TextField).at(1), '33');
    await tester.tap(find.text('Calculate subnet'));
    await tester.pumpAndSettle();

    expect(find.text('Use a prefix between /0 and /32.'), findsOneWidget);
    expect(find.text('Subnet results'), findsNothing);
  });

  testWidgets('handles a /31 point-to-point network', (tester) async {
    await pumpCalculator(tester);

    await tester.enterText(find.byType(TextField).at(0), '192.168.1.0');
    await tester.enterText(find.byType(TextField).at(1), '31');
    await tester.tap(find.text('Calculate subnet'));
    await tester.pumpAndSettle();

    expect(find.text('192.168.1.0/31'), findsOneWidget);
    expect(find.text('255.255.255.254'), findsOneWidget);
    expect(find.text('192.168.1.1'), findsOneWidget);
    expect(find.text('• 2 addresses'), findsOneWidget);
    expect(find.text('• 2 usable hosts'), findsOneWidget);
  });
}
