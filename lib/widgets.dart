import 'dart:async';
import 'package:flutter/material.dart';
import 'services.dart';

class CreateWorkspace extends StatefulWidget {
  const CreateWorkspace({super.key});
  @override State<CreateWorkspace> createState() => _CreateWorkspaceState();
}

class _CreateWorkspaceState extends State<CreateWorkspace> with SingleTickerProviderStateMixin {
  final prompt = TextEditingController();
  bool generating = false;
  late AnimationController pulse;
  Timer? progressTimer;
  int phase = 0;
  int? credits;
  final phases = const ['Understanding your idea…','Choosing the best model…','Creating your composition…','Polishing details…'];

  @override
  void initState() {
    super.initState();
    pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat(reverse: true);
    _refreshCredits();
  }

  Future<void> _refreshCredits() async {
    try {
      final data = await CreditService.getCredits();
      if (mounted) setState(() => credits = data['credits'] is int ? data['credits'] as int : int.tryParse('${data['credits']}'));
    } catch (_) {
      // Credit balance is a convenience display; ignore failures silently.
    }
  }

  @override
  void dispose() {
    progressTimer?.cancel();
    pulse.dispose();
    prompt.dispose();
    super.dispose();
  }

  Future<void> generate() async {
    if (prompt.text.trim().isEmpty || generating) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Describe what you want to create first.')));
      return;
    }
    setState(() { generating = true; phase = 0; });
    progressTimer = Timer.periodic(const Duration(milliseconds: 1100), (_) {
      if (mounted) setState(() => phase = (phase + 1) % phases.length);
    });
    try {
      final result = await CreditService.generate(prompt: prompt.text.trim());
      progressTimer?.cancel();
      if (mounted) {
        setState(() => generating = false);
        final imageUrl = result['imageUrl']?.toString();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(imageUrl == null ? 'Generation completed.' : 'Your image is ready.')));
      }
      unawaited(_refreshCredits());
    } catch (e) {
      progressTimer?.cancel();
      if (mounted) {
        setState(() => generating = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
      unawaited(_refreshCredits());
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return SingleChildScrollView(
      padding: EdgeInsets.all(width < 760 ? 20 : 42),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1150),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: .85, end: 1),
                duration: const Duration(milliseconds: 650),
                curve: Curves.easeOutBack,
                builder: (_, v, child) => Transform.scale(scale: v, alignment: Alignment.centerLeft, child: child),
                child: const Text('Create something amazing', style: TextStyle(fontSize: 38, fontWeight: FontWeight.w900)),
              ),
              const SizedBox(height: 8),
              Text('Your idea is the starting point. Wyte AI handles the creative heavy lifting.', style: TextStyle(color: Colors.grey.shade400, fontSize: 16)),
              if (credits != null) ...[
                const SizedBox(height: 10),
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.bolt, size: 16, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 6),
                  Text('$credits credits left', style: TextStyle(color: Colors.grey.shade400, fontWeight: FontWeight.w600)),
                ]),
              ],
              const SizedBox(height: 30),
              AnimatedContainer(
                duration: const Duration(milliseconds: 350),
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFF101218),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: generating ? Theme.of(context).colorScheme.primary : Colors.white10),
                  boxShadow: generating ? [BoxShadow(color: Theme.of(context).colorScheme.primary.withOpacity(.16), blurRadius: 30)] : [],
                ),
                child: TextField(
                  controller: prompt,
                  minLines: 5,
                  maxLines: 8,
                  decoration: const InputDecoration(
                    hintText: 'Describe what you want… e.g. luxury product campaign for a skincare brand in Lagos',
                    prefixIcon: Icon(Icons.auto_awesome),
                    border: InputBorder.none,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  OutlinedButton.icon(onPressed: () => _snack('Reference upload is ready for the storage connector.'), icon: const Icon(Icons.image_outlined), label: const Text('Reference')),
                  OutlinedButton.icon(onPressed: () => _snack('Aspect ratio: 1:1'), icon: const Icon(Icons.aspect_ratio), label: const Text('1:1')),
                  OutlinedButton.icon(onPressed: () => _snack('Auto selects the best available model.'), icon: const Icon(Icons.auto_awesome), label: const Text('Auto AI')),
                ],
              ),
              const SizedBox(height: 18),
              if (generating) _GenerationProgress(phase: phases[phase], controller: pulse),
              const SizedBox(height: 18),
              SizedBox(
                height: 58,
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: generate,
                  icon: generating ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_awesome),
                  label: Text(generating ? 'Creating…' : 'Generate ✨'),
                ),
              ),
              const SizedBox(height: 42),
              const Text('Recent creations', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800)),
              const SizedBox(height: 14),
              _ImagePlaceholderGrid(count: 4),
            ],
          ),
        ),
      ),
    );
  }

  void _snack(String text) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}

class _GenerationProgress extends StatelessWidget {
  final String phase;
  final AnimationController controller;
  const _GenerationProgress({required this.phase, required this.controller});
  @override Widget build(BuildContext context) => AnimatedBuilder(
    animation: controller,
    builder: (_, child) => Container(
      height: 90,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.primary.withOpacity(.18 + controller.value * .10),
            Theme.of(context).colorScheme.surface,
          ],
        ),
      ),
      child: Row(
        children: [
          RotationTransition(turns: Tween(begin: 0.0, end: 1.0).animate(controller), child: const Icon(Icons.auto_awesome, size: 28)),
          const SizedBox(width: 16),
          Expanded(child: Text(phase, style: const TextStyle(fontWeight: FontWeight.w700))),
          const SizedBox(width: 70, child: LinearProgressIndicator()),
        ],
      ),
    ),
  );
}

class SuggestionRoom extends StatelessWidget {
  const SuggestionRoom({super.key});
  final suggestions = const [
    'Luxury skincare campaign',
    'Streetwear campaign in Lagos',
    'Premium restaurant launch',
    'Tech product hero image',
    'Cinematic travel poster',
    'Real-estate social campaign',
  ];
  @override Widget build(BuildContext context) => _RoomScaffold(
    title: 'Suggestion Room',
    subtitle: 'Need inspiration? Start with a direction and make it yours.',
    child: Wrap(spacing: 14, runSpacing: 14, children: suggestions.map((s) => _ChoiceCard(title: s, icon: Icons.lightbulb_outline)).toList()),
  );
}

class TemplateRoom extends StatelessWidget {
  const TemplateRoom({super.key});
  final templates = const ['Product Ad','Instagram Story','WhatsApp Flyer','YouTube Thumbnail','Fashion Editorial','Event Poster','Website Hero','Campaign Pack'];
  @override Widget build(BuildContext context) => _RoomScaffold(
    title: 'Template Room',
    subtitle: 'Start faster with polished creative directions.',
    child: Wrap(spacing: 14, runSpacing: 14, children: templates.map((s) => _ChoiceCard(title: s, icon: Icons.dashboard_customize_outlined)).toList()),
  );
}

class GalleryRoom extends StatelessWidget {
  const GalleryRoom({super.key});
  @override Widget build(BuildContext context) => _RoomScaffold(title: 'Gallery', subtitle: 'Your creations, ready to revisit, remix or share.', child: const _ImagePlaceholderGrid(count: 8));
}

class _ChoiceCard extends StatefulWidget {
  final String title; final IconData icon;
  const _ChoiceCard({required this.title, required this.icon});
  @override State<_ChoiceCard> createState() => _ChoiceCardState();
}
class _ChoiceCardState extends State<_ChoiceCard> {
  bool hover = false;
  @override Widget build(BuildContext context) => MouseRegion(
    onEnter: (_) => setState(() => hover = true),
    onExit: (_) => setState(() => hover = false),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 220, height: 125,
      transform: Matrix4.translationValues(0, hover ? -4 : 0, 0),
      decoration: BoxDecoration(
        color: const Color(0xFF111318),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: hover ? Theme.of(context).colorScheme.primary : Colors.white10),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${widget.title} selected — open Create to continue.'))),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(widget.icon), const Spacer(), Text(widget.title, style: const TextStyle(fontWeight: FontWeight.w800)),
          ]),
        ),
      ),
    ),
  );
}

class _ImagePlaceholderGrid extends StatelessWidget {
  final int count;
  const _ImagePlaceholderGrid({required this.count});
  @override Widget build(BuildContext context) => GridView.builder(
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 260, crossAxisSpacing: 14, mainAxisSpacing: 14, childAspectRatio: 1),
    itemCount: count,
    itemBuilder: (_, i) => Material(
      borderRadius: BorderRadius.circular(20),
      color: const Color(0xFF111318),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Open generation details here when an image is available.'))),
        child: const Center(child: Icon(Icons.image_outlined, size: 42)),
      ),
    ),
  );
}

class _RoomScaffold extends StatelessWidget {
  final String title, subtitle; final Widget child;
  const _RoomScaffold({required this.title, required this.subtitle, required this.child});
  @override Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.all(32),
    child: Center(child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 1100),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8), Text(subtitle, style: TextStyle(color: Colors.grey.shade400)),
        const SizedBox(height: 28), child,
      ]),
    )),
  );
}

class SimpleRoom extends StatelessWidget {
  final String title, description; final IconData icon;
  const SimpleRoom({super.key, required this.title, required this.icon, required this.description});
  @override Widget build(BuildContext context) => _RoomScaffold(title: title, subtitle: description, child: Card(child: Padding(padding: const EdgeInsets.all(32), child: Column(children: [Icon(icon, size: 50), const SizedBox(height: 18), const Text('Ready for your content.', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))]))));
}

class SettingsRoom extends StatelessWidget {
  const SettingsRoom({super.key});
  @override Widget build(BuildContext context) => _RoomScaffold(
    title: 'Settings',
    subtitle: 'Account, privacy and trust controls.',
    child: Column(children: [
      ListTile(leading: const Icon(Icons.verified_user_outlined), title: const Text('Privacy Policy'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrustPage(title: 'Privacy Policy', body: 'Wyte AI collects only the information needed to operate your account and provide the service. Review the final deployed privacy notice before launch.')))),
      ListTile(leading: const Icon(Icons.gavel_outlined), title: const Text('Terms of Service'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrustPage(title: 'Terms of Service', body: 'Use of Wyte AI is subject to the published service terms, acceptable-use rules, billing terms and applicable law. Publish the finalized legal terms before launch.')))),
      ListTile(leading: const Icon(Icons.security_outlined), title: const Text('Security'), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrustPage(title: 'Security', body: 'Payments and sensitive provider credentials are handled server-side. Supabase Auth, Postgres RLS and private Storage protect user resources. Complete production security configuration before launch.')))),
      ListTile(leading: const Icon(Icons.help_outline), title: const Text('Help & Support'), onTap: () => showDialog(context: context, builder: (_) => AlertDialog(title: const Text('Wyte AI Support'), content: const Text('Add your support email or help center URL before launch.'), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))]))),
    ]),
  );
}
