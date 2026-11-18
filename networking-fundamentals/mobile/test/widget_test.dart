import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:networking_fundamentals/main.dart';

void main() {
  testWidgets('renders the welcome screen and switches language', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));

    expect(find.text('Sign in to continue'), findsOneWidget);
    expect(find.text('Create a free account'), findsOneWidget);
    expect(find.text('عربي'), findsOneWidget);

    await tester.tap(find.text('عربي'));
    await tester.pumpAndSettle();

    expect(find.text('English'), findsOneWidget);
  });
}
