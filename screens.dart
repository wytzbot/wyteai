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

class TrustPage extends StatelessWidget {
  final String title;
  final String body;
  const TrustPage({super.key, required this.title, required this.body});
  @override Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(title)),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 900),
        child: Text(body, style: const TextStyle(fontSize: 16, height: 1.7)),
      ),
    ),
  );
}
