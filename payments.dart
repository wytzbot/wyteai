import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class FlutterwavePayment {
  static const endpoint = String.fromEnvironment('API_BASE_URL', defaultValue: '');

  static Future<void> start() async {
    final user = Supabase.instance.client.auth.currentUser;
    final session = Supabase.instance.client.auth.currentSession;
    if (user == null || session == null) throw StateError('Please sign in first.');
    // An empty endpoint is valid: it means the Flutter build and the /api
    // functions are served from the same origin (the default on Vercel).
    final response = await http.post(
      Uri.parse('$endpoint/api/flutterwave-create'),
      headers: {'Content-Type':'application/json','Authorization':'Bearer ${session.accessToken}'},
      body: jsonEncode({'plan':'pro_monthly'}),
    );
    final data = response.body.isEmpty ? <String,dynamic>{} : jsonDecode(response.body) as Map<String,dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) throw StateError(data['error']?.toString() ?? 'Unable to start checkout.');
    final url = data['checkoutUrl']?.toString();
    if (url == null || url.isEmpty) throw StateError('Flutterwave did not return a checkout URL.');
    final ok = await launchUrl(Uri.parse(url), webOnlyWindowName: '_self');
    if (!ok) throw StateError('Could not open payment checkout.');
  }
}
