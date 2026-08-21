import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

class CreditService {
  static const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  static Future<Map<String,dynamic>> getCredits() async {
    final session = Supabase.instance.client.auth.currentSession;
    // An empty apiBaseUrl is valid: it means the Flutter build and the /api
    // functions are served from the same origin (the default on Vercel), so
    // requests resolve as same-origin relative URLs.
    if (session == null) throw StateError('Please sign in first.');
    final r = await http.get(Uri.parse('$apiBaseUrl/api/credits'), headers: {'Authorization':'Bearer ${session.accessToken}'});
    if (r.statusCode != 200) throw StateError('Unable to load credits.');
    return jsonDecode(r.body) as Map<String,dynamic>;
  }

  static Future<Map<String,dynamic>> generate({required String prompt, String model='auto', String mode='standard', String aspectRatio='1:1'}) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw StateError('Please sign in first.');
    final r = await http.post(Uri.parse('$apiBaseUrl/api/generate'), headers: {'Content-Type':'application/json','Authorization':'Bearer ${session.accessToken}'}, body: jsonEncode({'prompt':prompt,'model':model,'mode':mode,'aspectRatio':aspectRatio}));
    final data = r.body.isEmpty ? <String,dynamic>{} : jsonDecode(r.body) as Map<String,dynamic>;
    if (r.statusCode < 200 || r.statusCode >= 300) throw StateError(data['error']?.toString() ?? 'Generation failed.');
    return data;
  }
}
