import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens.dart';
import 'theme.dart';
import 'welcome.dart';

class WyteAIApp extends StatelessWidget {
  const WyteAIApp({super.key});
  @override Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Wyte AI',
    theme: WyteTheme.dark,
    home: const AuthGate(),
  );
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override Widget build(BuildContext context) => StreamBuilder<AuthState>(
    stream: Supabase.instance.client.auth.onAuthStateChange,
    builder: (context, snapshot) {
      final session = snapshot.data?.session ?? Supabase.instance.client.auth.currentSession;
      if (snapshot.connectionState == ConnectionState.waiting && session == null) {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      return session == null ? const WelcomeScreen() : const HomeScreen();
    },
  );
}

