import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:async';

import '../services/api_service.dart';

class AuthScreen extends StatefulWidget {
  final VoidCallback onAuthenticated;
  const AuthScreen({super.key, required this.onAuthenticated});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final api = ApiService();
  final formKey = GlobalKey<FormState>();
  final email = TextEditingController();
  final password = TextEditingController();
  final firstName = TextEditingController();
  final lastName = TextEditingController();
  final phone = TextEditingController();
  final location = TextEditingController();
  bool isRegister = false;
  bool submitting = false;
  String role = 'seeker';
  String? error;
  String? notice;
  String backendInfo = 'Backend: detecting...';

  @override
  void initState() {
    super.initState();
    _loadBackendInfo();
  }

  Future<void> _loadBackendInfo() async {
    final info = await api.debugSelectedBackendHost();
    if (!mounted) return;
    setState(() => backendInfo = 'Backend: $info');
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    firstName.dispose();
    lastName.dispose();
    phone.dispose();
    location.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;
    setState(() {
      error = null;
      notice = null;
      submitting = true;
    });
    try {
      if (isRegister) {
        await api.register({
          'email': email.text,
          'password': password.text,
          'first_name': firstName.text,
          'last_name': lastName.text,
          'phone': phone.text,
          'location': location.text,
          'role': role,
        });
        setState(() {
          isRegister = false;
          notice = role == 'provider'
              ? 'Registration successful. Your provider account is pending admin approval. Please wait for approval email.'
              : 'Registration successful. You can now login.';
        });
        return;
      }
      await api.login(email.text, password.text);
      await Future<void>.delayed(const Duration(milliseconds: 500));
      widget.onAuthenticated();
    } catch (e) {
      if (e is TimeoutException) {
        setState(() => error = 'Connection timed out. The backend server may be unreachable from this phone.');
      } else if (e is SocketException) {
        setState(() => error = 'Cannot connect right now. The phone may not be able to reach the backend server IP.');
      } else {
        final message = e.toString();
        if (message.toLowerCase().contains('timed out')) {
          setState(() => error = 'Connection timed out. The backend server may be unreachable from this phone.');
        } else if (message.toLowerCase().contains('socketexception') || message.toLowerCase().contains('connection refused')) {
          setState(() => error = 'Cannot connect right now. The phone may not be able to reach the backend server IP.');
        } else {
          setState(() => error = message);
        }
      }
    } finally {
      if (mounted) {
        setState(() => submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18),
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 22),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F3F5F),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Image(
                        image: AssetImage('assets/images/logo.png'),
                        width: 96,
                        height: 96,
                      ),
                    ),
                    SizedBox(height: 8),
                    SizedBox(height: 8),
                    Text('ServiGo', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                    SizedBox(height: 6),
                    Text('Local Services + Secure Payments', style: TextStyle(color: Color(0xFFD5E0EE))),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F3F5F).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF1F3F5F).withOpacity(0.12)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.cloud_outlined, color: Color(0xFF1F3F5F), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        backendInfo,
                        style: const TextStyle(color: Color(0xFF1F3F5F), fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Form(
                    key: formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            isRegister ? 'Create account' : 'Sign in',
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF1F3F5F)),
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (isRegister) ...[
                          TextFormField(controller: firstName, decoration: const InputDecoration(labelText: 'First name')),
                          const SizedBox(height: 8),
                          TextFormField(controller: lastName, decoration: const InputDecoration(labelText: 'Last name')),
                          const SizedBox(height: 8),
                          TextFormField(controller: phone, decoration: const InputDecoration(labelText: 'Phone')),
                          const SizedBox(height: 8),
                          TextFormField(controller: location, decoration: const InputDecoration(labelText: 'Location')),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            value: role,
                            items: const [
                              DropdownMenuItem(value: 'seeker', child: Text('Service Seeker')),
                              DropdownMenuItem(value: 'provider', child: Text('Service Provider')),
                            ],
                            onChanged: (v) => setState(() => role = v ?? 'seeker'),
                          ),
                          const SizedBox(height: 8),
                        ],
                        TextFormField(
                          controller: email,
                          decoration: const InputDecoration(labelText: 'Email'),
                          validator: (v) => v != null && v.contains('@') ? null : 'Enter valid email',
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: password,
                          decoration: const InputDecoration(labelText: 'Password'),
                          obscureText: true,
                          validator: (v) => v != null && v.length >= 8 ? null : 'Minimum 8 characters',
                        ),
                        if (error != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(error!, style: const TextStyle(color: Colors.red)),
                          ),
                        if (notice != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(notice!, style: const TextStyle(color: Color(0xFF1F3F5F), fontWeight: FontWeight.w600)),
                          ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(onPressed: submitting ? null : submit, child: Text(submitting ? 'Continuing...' : (isRegister ? 'Register' : 'Login'))),
                        ),
                        TextButton(
                          onPressed: submitting ? null : () => setState(() => isRegister = !isRegister),
                          child: Text(isRegister ? 'Already have account? Login' : 'Need account? Register'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
