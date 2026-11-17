import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

/// Central Firebase bootstrap for the local-only MVP.
///
/// The emulator host is configurable so the same Flutter code can run on:
/// - Windows desktop: default 127.0.0.1
/// - Physical Android device: pass the laptop LAN IP with
///   --dart-define=FIREBASE_EMULATOR_HOST=192.168.x.x
class FirebaseBootstrap {
  FirebaseBootstrap._();

  static const String projectId = 'demo-networking-p1';
  static const String emulatorHost = String.fromEnvironment(
    'FIREBASE_EMULATOR_HOST',
    defaultValue: '127.0.0.1',
  );

  static const int authPort = 9099;
  static const int firestorePort = 8080;

  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    await Firebase.initializeApp(
      demoProjectId: projectId,
    );

    FirebaseAuth.instance.useAuthEmulator(
      emulatorHost,
      authPort,
    );

    FirebaseFirestore.instance.useFirestoreEmulator(
      emulatorHost,
      firestorePort,
    );

    _initialized = true;
  }
}
