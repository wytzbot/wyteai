import 'package:supabase_flutter/supabase_flutter.dart';
import 'supabase.dart';

class WyteAuth {
  static Future<bool> signInWithGoogle() async {
    await WyteSupabase.client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: Uri.base.origin,
      queryParams: {'prompt': 'select_account'},
    );
    return true;
  }

  static Future<void> signOut() => WyteSupabase.client.auth.signOut();
  static User? get currentUser => WyteSupabase.client.auth.currentUser;
}
