import 'package:flutter/material.dart';
import 'plans.dart';
import 'payments.dart';

class PricingScreen extends StatelessWidget {
  const PricingScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    return SingleChildScrollView(
      padding: EdgeInsets.all(w < 760 ? 18 : 40),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1000),
          child: Column(children: [
            const Text('Choose your creative power', textAlign: TextAlign.center,
              style: TextStyle(fontSize: 38, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            Text('Start free. Upgrade when you want more control, speed and creative depth.',
              textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade400)),
            const SizedBox(height: 32),
            Wrap(
              spacing: 18, runSpacing: 18, alignment: WrapAlignment.center,
              children: [
                _PlanCard(plan: WytePlan.free),
                _PlanCard(plan: WytePlan.pro, featured: true),
              ],
            ),
          ]),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final Plan plan;
  final bool featured;
  const _PlanCard({required this.plan, this.featured = false});

  @override
  Widget build(BuildContext context) => Container(
    width: 430,
    padding: const EdgeInsets.all(28),
    decoration: BoxDecoration(
      color: const Color(0xFF111318),
      borderRadius: BorderRadius.circular(26),
      border: Border.all(
        color: featured ? Theme.of(context).colorScheme.primary : Colors.white10,
        width: featured ? 2 : 1,
      ),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (featured) Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary.withOpacity(.16),
          borderRadius: BorderRadius.circular(99),
        ),
        child: const Text('MOST POWERFUL', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11)),
      ),
      const SizedBox(height: 14),
      Text(plan.name, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
      const SizedBox(height: 4),
      Text(plan.tagline, style: TextStyle(color: Colors.grey.shade400)),
      const SizedBox(height: 18),
      Text(plan.price, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
      Text('${plan.credits} credits ${plan.cadence}', style: TextStyle(color: Colors.grey.shade400)),
      const SizedBox(height: 22),
      ...plan.features.map((f) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          const Icon(Icons.check_circle_outline, size: 18),
          const SizedBox(width: 10),
          Expanded(child: Text(f)),
        ]),
      )),
      if (featured) ...[
        const SizedBox(height: 18),
        SizedBox(width: double.infinity, child: FilledButton(
          onPressed: () => _upgrade(context),
          child: const Text('Upgrade to Pro'),
        )),
      ],
    ]),
  );

  Future<void> _upgrade(BuildContext context) async {
    try {
      await FlutterwavePayment.start();
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceFirst('Bad state: ', ''))));
    }
  }
}
