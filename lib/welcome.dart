import 'package:flutter/material.dart';
import 'auth.dart';
import 'app.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});
  @override State<WelcomeScreen> createState() => _WelcomeScreenState();
}
class _WelcomeScreenState extends State<WelcomeScreen> with SingleTickerProviderStateMixin {
  late AnimationController c;
  @override void initState(){ super.initState(); c=AnimationController(vsync:this,duration:const Duration(seconds:5))..repeat(reverse:true); }
  @override void dispose(){c.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(
    body: Stack(children:[
      Positioned.fill(child: AnimatedBuilder(animation:c,builder:(_,__)=>CustomPaint(painter:_GlowPainter(c.value)))),
      SafeArea(child: Center(child: SingleChildScrollView(padding:const EdgeInsets.all(28),child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:980),child:Column(children:[
        const SizedBox(height:45),
        const Text('WYTE AI',style:TextStyle(fontSize:22,fontWeight:FontWeight.w900,letterSpacing:3)),
        const SizedBox(height:55),
        TweenAnimationBuilder<double>(tween:Tween(begin:.8,end:1),duration:const Duration(milliseconds:900),curve:Curves.easeOutBack,builder:(_,v,child)=>Transform.scale(scale:v,child:child),child:const Text('Turn ideas into visuals\npeople remember.',textAlign:TextAlign.center,style:TextStyle(fontSize:58,fontWeight:FontWeight.w900,height:1.02))),
        const SizedBox(height:20),
        Text('A premium AI creative studio for products, campaigns, brands and imagination.',textAlign:TextAlign.center,style:TextStyle(fontSize:18,color:Colors.grey.shade300)),
        const SizedBox(height:34),
        FilledButton.icon(onPressed:()=>_signIn(context),icon:const Icon(Icons.g_mobiledata,size:28),label:const Padding(padding:EdgeInsets.symmetric(horizontal:20,vertical:16),child:Text('Continue with Google'))),
        const SizedBox(height:22),
        Wrap(alignment:WrapAlignment.center,spacing:18,children:[
          TextButton(onPressed:()=>_open(context,'Privacy Policy'),child:const Text('Privacy')),
          TextButton(onPressed:()=>_open(context,'Terms'),child:const Text('Terms')),
          TextButton(onPressed:()=>_open(context,'Security'),child:const Text('Security')),
        ]),
        const SizedBox(height:45),
        Wrap(alignment:WrapAlignment.center,spacing:12,runSpacing:12,children:const[
          _Pill('Premium image creation'),_Pill('Campaign Mode'),_Pill('Brand memory'),_Pill('Fast workflow')
        ]),
      ]))))),
    ]),
  );
  Future<void> _signIn(BuildContext context) async {
    try {
      await WyteAuth.signInWithGoogle();
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Google sign-in failed: $e')));
      }
    }
  }
  void _open(BuildContext context,String title)=>Navigator.push(context,MaterialPageRoute(builder:(_)=>Scaffold(appBar:AppBar(title:Text(title)),body:const Center(child:Padding(padding:EdgeInsets.all(30),child:Text('Final legal content should be published here before production.'))))));
}
class _Pill extends StatelessWidget{final String t;const _Pill(this.t);@override Widget build(BuildContext c)=>Container(padding:const EdgeInsets.symmetric(horizontal:14,vertical:9),decoration:BoxDecoration(color:Colors.white10,borderRadius:BorderRadius.circular(99)),child:Text(t));}
class _GlowPainter extends CustomPainter{
 final double t; _GlowPainter(this.t);
 @override void paint(Canvas c,Size s){final p=Paint()..maskFilter=const MaskFilter.blur(BlurStyle.normal,80);p.color=const Color(0xFF8E6CFF).withOpacity(.16);c.drawCircle(Offset(s.width*.18+s.width*.12*t,s.height*.25),180,p);p.color=const Color(0xFF42D8FF).withOpacity(.10);c.drawCircle(Offset(s.width*.82-s.width*.10*t,s.height*.65),220,p);}
 @override bool shouldRepaint(covariant _GlowPainter old)=>old.t!=t;
}
