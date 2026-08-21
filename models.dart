class UserProfile {
  final String uid;
  final String email;
  final String? displayName;
  final int credits;
  final bool isPro;
  const UserProfile({required this.uid, required this.email, this.displayName, this.credits = 15, this.isPro = false});
}
class Generation {
  final String id;
  final String prompt;
  final String model;
  final int creditsUsed;
  final String status;
  const Generation({required this.id, required this.prompt, required this.model, required this.creditsUsed, this.status = 'queued'});
}
