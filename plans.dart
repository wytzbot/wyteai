class WytePlan {
  static const free = Plan(
    id: 'free',
    name: 'Free',
    price: '₦0',
    credits: 5,
    cadence: 'per day',
    tagline: 'Explore Wyte AI.',
    features: [
      '5 generations per day',
      'Wyte Auto model',
      'Standard quality',
      'Basic prompt enhancement',
      'Suggestions & basic templates',
      'Basic gallery and history',
      'Standard variations',
      'Basic expense tracking',
    ],
  );

  static const pro = Plan(
    id: 'pro',
    name: 'Pro',
    price: '₦10,000 / \$10',
    credits: 500,
    cadence: 'per month',
    tagline: 'Create without limits getting in your way.',
    features: [
      '500 creative credits monthly',
      'All 5 AI models',
      'Wyte Auto model routing',
      'HD generation',
      'Advanced editing',
      'Image-to-image & reference images',
      'Batch generation',
      'Campaign Mode',
      'Brand Memory',
      'Character consistency',
      'Pro templates',
      'Advanced prompt engine',
      'Priority generation',
      'Extended history',
    ],
  );
}

class Plan {
  final String id, name, price, cadence, tagline;
  final int credits;
  final List<String> features;
  const Plan({required this.id, required this.name, required this.price, required this.credits, required this.cadence, required this.tagline, required this.features});
}

class WyteCreditCost {
  static const standard = 1;
  static const premium = 2;
  static const hd = 2;
  static const advancedEdit = 2;
  static const character = 2;
  static const campaignAsset = 1;
  static const batch4 = 4;
}
