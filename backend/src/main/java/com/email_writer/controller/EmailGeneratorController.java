package com.email_writer.controller;

import com.email_writer.fields.EmailResponse;
import com.email_writer.model.EmailRequest;
import com.email_writer.service.EmailGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
public class EmailGeneratorController {

    private final EmailGeneratorService service;

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("NeuralMail Backend Online");
    }

    // Helper — gets logged-in username from JWT
    private String username(Authentication auth) {
        return auth != null ? auth.getName() : "unknown";
    }

    @PostMapping("/reply")
    public ResponseEntity<EmailResponse> generateReply(
            @RequestBody EmailRequest req, Authentication auth) {
        try {
            if (req.getEmailContent() == null || req.getEmailContent().isBlank())
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            service.checkRateLimit(username(auth));   // rate limit check
            return ResponseEntity.ok(EmailResponse.ok(service.generateEmailReply(req)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/rewrite")
    public ResponseEntity<EmailResponse> rewriteEmail(
            @RequestBody EmailRequest req, Authentication auth) {
        try {
            if (req.getEmailContent() == null || req.getEmailContent().isBlank())
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            service.checkRateLimit(username(auth));
            return ResponseEntity.ok(EmailResponse.ok(service.rewriteEmail(req)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/improve")
    public ResponseEntity<EmailResponse> improveEmail(
            @RequestBody EmailRequest req, Authentication auth) {
        try {
            if (req.getEmailContent() == null || req.getEmailContent().isBlank())
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            service.checkRateLimit(username(auth));
            return ResponseEntity.ok(EmailResponse.ok(service.improveEmail(req)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/summarize")
    public ResponseEntity<EmailResponse> summarizeEmail(
            @RequestBody EmailRequest req, Authentication auth) {
        try {
            if (req.getEmailContent() == null || req.getEmailContent().isBlank())
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            service.checkRateLimit(username(auth));
            return ResponseEntity.ok(EmailResponse.ok(service.summarizeEmail(req)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/followup")
    public ResponseEntity<EmailResponse> followUpEmail(
            @RequestBody EmailRequest req, Authentication auth) {
        try {
            if (req.getEmailContent() == null || req.getEmailContent().isBlank())
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            service.checkRateLimit(username(auth));
            return ResponseEntity.ok(EmailResponse.ok(service.generateFollowUpEmail(req)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/humanscore")
    public ResponseEntity<EmailResponse> humanScore(
            @RequestBody EmailRequest req, Authentication auth) {
        try {
            if (req.getEmailContent() == null || req.getEmailContent().isBlank())
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            // Human score doesn't count against rate limit — it's a lightweight call
            return ResponseEntity.ok(EmailResponse.ok(service.generateHumanScore(req.getEmailContent())));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/fingerprint")
    public ResponseEntity<EmailResponse> fingerprint(
            @RequestBody EmailRequest req, Authentication auth) {
        try {
            if (req.getEmailContent() == null || req.getEmailContent().isBlank())
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            return ResponseEntity.ok(EmailResponse.ok(
                    service.generateSemanticFingerprint(req.getEmailContent())));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }
}