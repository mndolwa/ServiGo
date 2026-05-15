import 'package:flutter/material.dart';

import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const ServiGoApp());
}

class ServiGoSplash extends StatelessWidget {
  const ServiGoSplash({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF1F3F5F), Color(0xFF2E5378)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image(image: AssetImage('assets/images/badge.png'), width: 84, height: 84),
              SizedBox(height: 14),
              Image(image: AssetImage('assets/images/logo.png'), width: 148, height: 148),
              SizedBox(height: 14),
              Text('ServiGo', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
              SizedBox(height: 6),
              Text('Local services and secure payments', style: TextStyle(color: Color(0xFFD5E0EE))),
            ],
          ),
        ),
      ),
    );
  }
}

class ServiGoApp extends StatefulWidget {
  const ServiGoApp({super.key});

  @override
  State<ServiGoApp> createState() => _ServiGoAppState();
}

class _ServiGoAppState extends State<ServiGoApp> {
  bool authenticated = false;
  bool showSplash = true;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 900), () {
      if (mounted) {
        setState(() => showSplash = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    const navy = Color(0xFF1F3F5F);
    const bg = Color(0xFFD8DFEA);
    return MaterialApp(
      title: 'ServiGo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: navy),
        scaffoldBackgroundColor: bg,
        appBarTheme: const AppBarTheme(
          backgroundColor: navy,
          foregroundColor: Colors.white,
          centerTitle: true,
          elevation: 0,
        ),
        cardTheme: CardTheme(
          color: Colors.white,
          elevation: 10,
          shadowColor: Colors.black.withOpacity(0.08),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFF7FAFF),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE5EBF3)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE5EBF3)),
          ),
        ),
        useMaterial3: true,
      ),
      home: showSplash
          ? const ServiGoSplash()
          : authenticated
          ? HomeScreen(onLogout: () => setState(() => authenticated = false))
          : AuthScreen(onAuthenticated: () => setState(() => authenticated = true)),
    );
  }
}
