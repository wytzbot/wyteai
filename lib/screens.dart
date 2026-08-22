import 'package:flutter/material.dart';
import 'auth.dart';
import 'pricing.dart';
import 'widgets.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int index = 0;
  bool collapsed = false;

  final pages = const [
    CreateScreen(),
    SuggestionsScreen(),
    TemplatesScreen(),
    GalleryScreen(),
    ProjectsScreen(),
    BrandKitScreen(),
    ProScreen(),
    SettingsScreen(),
  ];

  final labels = const ['Create','Suggestions','Templates','Gallery','Projects','Brand Kit','Pricing','Settings'];
  final icons = const [
    Icons.auto_awesome, Icons.lightbulb_outline, Icons.dashboard_customize_outlined,
    Icons.grid_view_rounded, Icons.folder_copy_outlined, Icons.branding_watermark_outlined,
    Icons.price_change_outlined, Icons.settings_outlined,
  ];

  void open(int i) => setState(() => index = i);

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final mobile = width < 760;

    if (mobile) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('WYTE AI', style: TextStyle(fontWeight: FontWeight.w900)),
          actions: [
            IconButton(tooltip: 'Pricing', onPressed: () => open(6), icon: const Icon(Icons.bolt)),
            IconButton(tooltip: 'Account', onPressed: () => open(7), icon: const Icon(Icons.account_circle_outlined)),
          ],
        ),
        body: pages[index],
        bottomNavigationBar: NavigationBar(
          selectedIndex: index > 3 ? 0 : index,
          onDestinationSelected: (i) => open(i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.auto_awesome), label: 'Create'),
            NavigationDestination(icon: Icon(Icons.lightbulb_outline), label: 'Ideas'),
            NavigationDestination(icon: Icon(Icons.dashboard_customize_outlined), label: 'Templates'),
            NavigationDestination(icon: Icon(Icons.grid_view_rounded), label: 'Gallery'),
          ],
        ),
        drawer: Drawer(child: _drawerContents()),
      );
    }

    return Scaffold(
      body: Row(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 240),
            width: collapsed ? 82 : 240,
            child: Material(
              color: const Color(0xFF0B0C10),
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: collapsed ? MainAxisAlignment.center : MainAxisAlignment.spaceBetween,
                    children: [
                      if (!collapsed) const Padding(
                        padding: EdgeInsets.only(left: 20),
                        child: Text('WYTE AI', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                      ),
                      IconButton(
                        tooltip: collapsed ? 'Expand menu' : 'Collapse menu',
                        onPressed: () => setState(() => collapsed = !collapsed),
                        icon: Icon(collapsed ? Icons.menu : Icons.menu_open),
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  Expanded(
                    child: ListView.builder(
                      itemCount: labels.length,
                      itemBuilder: (_, i) => Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        child: Tooltip(
                          message: labels[i],
                          child: ListTile(
                            selected: index == i,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            leading: Icon(icons[i]),
                            title: collapsed ? null : Text(labels[i]),
                            onTap: () => open(i),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(14),
                    child: ListTile(
                      leading: const Icon(Icons.logout),
                      title: collapsed ? null : const Text('Sign out'),
                      onTap: () async {
                        await WyteAuth.signOut();
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          const VerticalDivider(width: 1),
          Expanded(child: pages[index]),
        ],
      ),
    );
  }

  Widget _drawerContents() => SafeArea(
    child: ListView(
      padding: const EdgeInsets.all(14),
      children: [
        const Padding(padding: EdgeInsets.all(14), child: Text('WYTE AI', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900))),
        for (var i = 0; i < labels.length; i++)
          ListTile(
            leading: Icon(icons[i]),
            title: Text(labels[i]),
            onTap: () { Navigator.pop(context); open(i); },
          ),
        const Divider(),
        ListTile(leading: const Icon(Icons.logout), title: const Text('Sign out'), onTap: () => WyteAuth.signOut()),
      ],
    ),
  );
}

class CreateScreen extends StatelessWidget {
  const CreateScreen({super.key});
  @override Widget build(BuildContext context) => const CreateWorkspace();
}

class SuggestionsScreen extends StatelessWidget {
  const SuggestionsScreen({super.key});
  @override Widget build(BuildContext context) => const SuggestionRoom();
}

class TemplatesScreen extends StatelessWidget {
  const TemplatesScreen({super.key});
  @override Widget build(BuildContext context) => const TemplateRoom();
}

class GalleryScreen extends StatelessWidget {
  const GalleryScreen({super.key});
  @override Widget build(BuildContext context) => const GalleryRoom();
}

class ProjectsScreen extends StatelessWidget {
  const ProjectsScreen({super.key});
  @override Widget build(BuildContext context) => const SimpleRoom(title: 'Projects', icon: Icons.folder_copy_outlined, description: 'Organize your campaigns, product launches and creative work.');
}

class BrandKitScreen extends StatelessWidget {
  const BrandKitScreen({super.key});
  @override Widget build(BuildContext context) => const SimpleRoom(title: 'Brand Kit', icon: Icons.branding_watermark_outlined, description: 'Keep your brand style, colors, logo and visual direction ready for every creation.');
}

class ProScreen extends StatelessWidget {
  const ProScreen({super.key});
  @override Widget build(BuildContext context) => const PricingScreen();
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  @override Widget build(BuildContext context) => const SettingsRoom();
}

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _LegalPage(
      title: 'Privacy Policy',
      icon: Icons.verified_user_outlined,
      sections: [
        _LegalSection(
          title: 'What we collect',
          body:
              'Wyte AI collects information needed to provide the service, '
              'such as your account information, authentication information, '
              'usage information, credits and content you choose to create or upload.',
        ),
        _LegalSection(
          title: 'How we use your information',
          body:
              'We use information to authenticate your account, provide AI '
              'generation features, manage credits and payments, save your '
              'projects, improve reliability and provide customer support.',
        ),
        _LegalSection(
          title: 'Your generated content',
          body:
              'Content you submit for generation may be processed by the AI '
              'providers required to deliver the requested service. Do not '
              'submit confidential or sensitive information unless you are '
              'comfortable with it being processed for that purpose.',
        ),
        _LegalSection(
          title: 'Payments',
          body:
              'Payment information is processed by our payment provider. '
              'Wyte AI does not intentionally store your full card details.',
        ),
        _LegalSection(
          title: 'Third-party services',
          body:
              'Wyte AI may use services such as Supabase, payment providers, '
              'AI providers and hosting infrastructure to operate the platform.',
        ),
        _LegalSection(
          title: 'Data security',
          body:
              'We use reasonable technical and organizational measures to '
              'protect account information and stored content. No online '
              'service can guarantee absolute security.',
        ),
        _LegalSection(
          title: 'Your choices',
          body:
              'You may request information about your account data or request '
              'account-related assistance through the support channel provided '
              'by Wyte AI.',
        ),
        _LegalSection(
          title: 'Policy updates',
          body:
              'This Privacy Policy may be updated as Wyte AI evolves. Material '
              'changes may be reflected by updating this page.',
        ),
      ],
    );
  }
}

class TermsOfServiceScreen extends StatelessWidget {
  const TermsOfServiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _LegalPage(
      title: 'Terms of Service',
      icon: Icons.gavel_outlined,
      sections: [
        _LegalSection(
          title: 'Using Wyte AI',
          body:
              'You may use Wyte AI only for lawful purposes and in accordance '
              'with these terms. You are responsible for activity performed '
              'through your account.',
        ),
        _LegalSection(
          title: 'AI-generated content',
          body:
              'AI-generated results may contain inaccuracies, unexpected '
              'content or similarities to existing works. You are responsible '
              'for reviewing generated content before publishing or using it.',
        ),
        _LegalSection(
          title: 'Prohibited use',
          body:
              'You must not use Wyte AI to create or distribute unlawful, '
              'fraudulent, abusive, harmful or otherwise prohibited content. '
              'You must also respect intellectual-property and privacy rights.',
        ),
        _LegalSection(
          title: 'Credits and payments',
          body:
              'Some features may require credits or a paid plan. Credits and '
              'plans may have limits, expiration rules or other conditions '
              'shown at the time of purchase.',
        ),
        _LegalSection(
          title: 'Your content',
          body:
              'You remain responsible for content you submit to Wyte AI and '
              'for ensuring you have the necessary rights and permissions to '
              'use that content.',
        ),
        _LegalSection(
          title: 'Service availability',
          body:
              'We aim to keep Wyte AI available and reliable, but the service '
              'may occasionally be unavailable because of maintenance, '
              'provider outages, upgrades or circumstances outside our control.',
        ),
        _LegalSection(
          title: 'Account termination',
          body:
              'Accounts may be restricted or terminated where necessary to '
              'protect the service, users, providers or comply with applicable law.',
        ),
        _LegalSection(
          title: 'Changes to these terms',
          body:
              'These terms may change as the service develops. Continued use '
              'of Wyte AI after an update constitutes acceptance of the updated terms.',
        ),
      ],
    );
  }
}

class SecurityScreen extends StatelessWidget {
  const SecurityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _LegalPage(
      title: 'Security',
      icon: Icons.security_outlined,
      sections: [
        _LegalSection(
          title: 'Account protection',
          body:
              'Wyte AI uses authentication infrastructure to protect user '
              'accounts and restrict access to authenticated resources.',
        ),
        _LegalSection(
          title: 'Database protection',
          body:
              'User data is stored using access controls designed to prevent '
              'users from accessing resources belonging to other accounts.',
        ),
        _LegalSection(
          title: 'Server-side secrets',
          body:
              'Private provider credentials and payment secrets should remain '
              'on the server and are not intended to be embedded in the Flutter '
              'client application.',
        ),
        _LegalSection(
          title: 'Payments',
          body:
              'Payment processing is handled through the configured payment '
              'provider rather than storing sensitive card information inside '
              'the Wyte AI application.',
        ),
        _LegalSection(
          title: 'AI providers',
          body:
              'Requests may be processed by external AI infrastructure required '
              'to provide generation features. Provider credentials are handled '
              'server-side.',
        ),
        _LegalSection(
          title: 'Reporting a security issue',
          body:
              'If you discover a security vulnerability, please report it '
              'through the official Wyte AI support channel rather than publicly '
              'sharing sensitive details.',
        ),
      ],
    );
  }
}

class _LegalSection {
  final String title;
  final String body;

  const _LegalSection({
    required this.title,
    required this.body,
  });
}

class _LegalPage extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<_LegalSection> sections;

  const _LegalPage({
    required this.title,
    required this.icon,
    required this.sections,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, size: 42),
                const SizedBox(height: 18),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 28),
                ...sections.map(
                  (section) => Padding(
                    padding: const EdgeInsets.only(bottom: 28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          section.title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          section.body,
                          style: TextStyle(
                            fontSize: 16,
                            height: 1.65,
                            color: Colors.grey.shade300,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
