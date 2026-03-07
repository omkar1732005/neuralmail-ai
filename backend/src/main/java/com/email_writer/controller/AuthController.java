package com.email_writer.controller;

import com.email_writer.model.User;
import com.email_writer.repository.UserRepository;
import com.email_writer.Security.JwtUtil;
import lombok.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil               jwtUtil;
    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final JavaMailSender        mailSender;

    @Value("${app.mail.from}")      private String mailFrom;
    @Value("${app.frontend.url}")   private String frontendUrl;

    // ── SIGNUP ────────────────────────────────────────────────
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
        // Validate input
        if (blank(req.getUsername()) || req.getUsername().length() < 3)
            return err("Username must be at least 3 characters");
        if (blank(req.getEmail()) || !req.getEmail().contains("@"))
            return err("Please enter a valid email address");
        if (blank(req.getPassword()) || req.getPassword().length() < 6)
            return err("Password must be at least 6 characters");

        String username = req.getUsername().trim().toLowerCase();
        String email    = req.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsername(username))
            return err("Username already taken — please choose another");
        if (userRepository.existsByEmail(email))
            return err("An account with this email already exists");

        // Save new user to PostgreSQL
        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .build();
        userRepository.save(user);

        // Send welcome email
        try { sendWelcomeEmail(email, username); } catch (Exception ignored) {}

        // Return JWT so user is logged in immediately after signup
        String token = jwtUtil.generateToken(username);
        return ResponseEntity.ok(new TokenResponse(token, username, email));
    }

    // ── LOGIN ─────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (blank(req.getUsername())) return err("Username is required");
        if (blank(req.getPassword())) return err("Password is required");

        String username = req.getUsername().trim().toLowerCase();
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, req.getPassword())
            );
        } catch (BadCredentialsException e) {
            return err("Wrong username or password");
        } catch (Exception e) {
            return err("Login failed: " + e.getMessage());
        }

        // Get user info to return email too
        User user = userRepository.findByUsername(username).orElseThrow();
        String token = jwtUtil.generateToken(username);
        return ResponseEntity.ok(new TokenResponse(token, username, user.getEmail()));
    }

    // ── VALIDATE TOKEN ─────────────────────────────────────────
    @GetMapping("/validate")
    public ResponseEntity<?> validate(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            return ResponseEntity.status(401).body(new ErrorResponse("Missing token"));
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token))
            return ResponseEntity.status(401).body(new ErrorResponse("Token invalid or expired"));

        String username = jwtUtil.extractUsername(token);
        long remaining  = jwtUtil.getExpirationMillis(token);
        User user = userRepository.findByUsername(username).orElse(null);
        String email = user != null ? user.getEmail() : "";
        int used     = user != null ? user.getRequestsToday() : 0;

        return ResponseEntity.ok(new ValidateResponse(username, email, remaining, used));
    }

    // ── FORGOT PASSWORD ────────────────────────────────────────
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotRequest req) {
        if (blank(req.getEmail()))
            return err("Email is required");

        String email = req.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        // Always return success — don't reveal if email exists (security best practice)
        if (user == null)
            return ResponseEntity.ok(new MsgResponse(
                    "If that email is registered, you'll receive a reset link shortly."));

        // Generate reset token — valid for 1 hour
        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        // Send reset email
        try {
            String resetLink = frontendUrl + "/api/auth/reset-password?token=" + token;
            sendResetEmail(email, user.getUsername(), resetLink);
        } catch (Exception e) {
            return err("Could not send email. Please try again later.");
        }

        return ResponseEntity.ok(new MsgResponse(
                "Password reset link sent! Check your email (also check spam folder)."));
    }

    // ── RESET PASSWORD ─────────────────────────────────────────
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetRequest req) {
        if (blank(req.getToken()))    return err("Reset token is required");
        if (blank(req.getPassword()) || req.getPassword().length() < 6)
            return err("New password must be at least 6 characters");

        User user = userRepository.findByResetToken(req.getToken()).orElse(null);
        if (user == null)
            return err("Invalid or expired reset link. Please request a new one.");
        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now()))
            return err("This reset link has expired. Please request a new one.");

        // Set new password and clear reset token
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(new MsgResponse(
                "Password changed successfully! You can now log in with your new password."));
    }

    // ── REFRESH TOKEN ─────────────────────────────────────────
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            return err("Missing token");
        String old = authHeader.substring(7);
        if (!jwtUtil.validateToken(old)) return err("Token expired");
        String username = jwtUtil.extractUsername(old);
        return ResponseEntity.ok(new TokenResponse(jwtUtil.generateToken(username), username, ""));
    }

    // ── EMAIL HELPERS ─────────────────────────────────────────
    private void sendWelcomeEmail(String to, String username) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(mailFrom);
        msg.setTo(to);
        msg.setSubject("Welcome to NeuralMail AI! 🧠");
        msg.setText("""
            Hi %s,
            
            Welcome to NeuralMail AI! Your account is ready.
            
            Open Gmail, click Reply on any email, and look for the NeuralMail button next to Send.
            
            You get 50 AI requests per day — resets every midnight.
            
            Enjoy!
            — The NeuralMail Team
            """.formatted(username));
        mailSender.send(msg);
    }

    private void sendResetEmail(String to, String username, String resetLink) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(mailFrom);
        msg.setTo(to);
        msg.setSubject("Reset your NeuralMail password");
        msg.setText("""
            Hi %s,
            
            You requested a password reset for your NeuralMail AI account.
            
            Click this link to set a new password (valid for 1 hour):
            %s
            
            If you didn't request this, just ignore this email — your account is safe.
            
            — The NeuralMail Team
            """.formatted(username, resetLink));
        mailSender.send(msg);
    }

    // ── UTILS ─────────────────────────────────────────────────
    private boolean blank(String s) { return s == null || s.isBlank(); }
    private ResponseEntity<?> err(String msg) {
        return ResponseEntity.badRequest().body(new ErrorResponse(msg));
    }

    // ── DTOs ──────────────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class SignupRequest   { private String username; private String email; private String password; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest    { private String username; private String password; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ForgotRequest   { private String email; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ResetRequest    { private String token; private String password; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class TokenResponse   { private String token; private String username; private String email; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ValidateResponse{ private String username; private String email; private long remainingMs; private int requestsToday; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class MsgResponse     { private String message; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ErrorResponse   { private String error; }
}