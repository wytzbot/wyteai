import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'app.dart';
import 'supabase.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await WyteSupabase.initialize();
  runApp(const WyteAIApp());
  SemanticsBinding.instance.ensureSemantics();
}
