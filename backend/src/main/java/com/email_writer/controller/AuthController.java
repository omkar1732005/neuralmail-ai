package com.email_writer.controller;

import com.email_writer.Security.JwtUtil;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    // POST /api/auth/login — returns JWT on valid credentials
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (req.getUsername() == null || req.getUsername().isBlank())
            return ResponseEntity.badRequest().body(new ErrorResponse("Username is required"));
        if (req.getPassword() == null || req.getPassword().isBlank())
            return ResponseEntity.badRequest().body(new ErrorResponse("Password is required"));
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername().trim(), req.getPassword())
            );
            String token = jwtUtil.generateToken(req.getUsername().trim());
            return ResponseEntity.ok(new LoginResponse(token, "Bearer", 86400));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(new ErrorResponse("Invalid username or password"));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(401).body(new ErrorResponse("Authentication failed: " + e.getMessage()));
        }
    }

    // POST /api/auth/refresh — issues a new token from a still-valid one
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            return ResponseEntity.badRequest().body(new ErrorResponse("Missing Bearer token"));
        String oldToken = authHeader.substring(7);
        if (!jwtUtil.validateToken(oldToken))
            return ResponseEntity.status(401).body(new ErrorResponse("Token is expired or invalid"));
        String username = jwtUtil.extractUsername(oldToken);
        String newToken = jwtUtil.generateToken(username);
        return ResponseEntity.ok(new LoginResponse(newToken, "Bearer", 86400));
    }

    // GET /api/auth/validate — checks if a token is still valid (used by popup)
    @GetMapping("/validate")
    public ResponseEntity<?> validate(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer "))
            return ResponseEntity.status(401).body(new ErrorResponse("Missing token"));
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token))
            return ResponseEntity.status(401).body(new ErrorResponse("Token invalid or expired"));
        String username = jwtUtil.extractUsername(token);
        long remainingMs = jwtUtil.getExpirationMillis(token);
        return ResponseEntity.ok(new ValidateResponse(username, remainingMs));
    }

    // DTOs
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest { private String username; private String password; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class LoginResponse { private String token; private String tokenType; private long expiresInSeconds; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ValidateResponse { private String username; private long remainingMs; }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class ErrorResponse { private String error; }
}