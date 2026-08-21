import 'package:supabase_flutter/supabase_flutter.dart';

class WyteSupabase {
  static SupabaseClient get client => Supabase.instance.client;
  static Future<void> initialize() async {
    const url = String.fromEnvironment('SUPABASE_URL');
    const key = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
    if (url.isEmpty || key.isEmpty) throw StateError('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.');
    await Supabase.initialize(url: url, publishableKey: key);
  }
}
