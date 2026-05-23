package com.email_writer.controller;

import com.email_writer.fields.DualReplyResponse;
import com.email_writer.fields.EmailResponse;
import com.email_writer.model.EmailRequest;
import com.email_writer.model.IntentResult;
import com.email_writer.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
public class EmailGeneratorController {

    private final EmailGeneratorService emailService;
    private final IntentDetectionService intentService;
    private final PromptBuilderService promptBuilder;
    private final DeviceRateLimitService rateLimitService;

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("ok");
    }

    @GetMapping("/rate-status")
    public ResponseEntity<EmailResponse> rateStatus(@RequestParam String deviceId) {
        try {
            return ResponseEntity.ok(
                    EmailResponse.ok(String.valueOf(rateLimitService.getRemaining(deviceId))));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/dual-reply")
    public ResponseEntity<DualReplyResponse> dualReply(@RequestBody EmailRequest req) {
        try {
            if (blank(req.getEmailContent()))
                return ResponseEntity.badRequest()
                        .body(DualReplyResponse.fail("emailContent is required"));
            rateLimitService.checkRateLimit(req.getDeviceId());
            if (promptBuilder.containsInjection(req.getEmailContent()))
                return ResponseEntity.badRequest()
                        .body(DualReplyResponse.fail("Prompt injection detected"));
            IntentResult ir = intentService.detect(req.getEmailContent());
            String baselinePrompt = promptBuilder.buildBaselinePrompt(
                    req.getEmailContent(), req.getThreadContext());
            String baselineReply = emailService.callGroq(baselinePrompt);
            String proposedPrompt = promptBuilder.buildProposedPrompt(
                    req.getEmailContent(), ir.getIntent(),
                    req.getTone(), req.getReplyLength(), req.getThreadContext());
            String proposedReply = emailService.callGroq(proposedPrompt);
            emailService.saveComparison(
                    req.getEmailContent(), req.getThreadContext(),
                    ir.getIntent(), ir.getReason(),
                    ir.getKeywordsFound(), baselineReply, proposedReply);
            return ResponseEntity.ok(DualReplyResponse.ok(
                    ir.getIntent(), ir.getReason(),
                    ir.getKeywordsFound(), ir.getPromptLabel(),
                    baselineReply, proposedReply));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(DualReplyResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/reply")
    public ResponseEntity<EmailResponse> generateReply(@RequestBody EmailRequest req) {
        try {
            if (blank(req.getEmailContent()))
                return ResponseEntity.badRequest()
                        .body(EmailResponse.fail("emailContent is required"));
            rateLimitService.checkRateLimit(req.getDeviceId());
            if (promptBuilder.containsInjection(req.getEmailContent()))
                return ResponseEntity.badRequest()
                        .body(EmailResponse.fail("Prompt injection detected"));
            IntentResult ir = intentService.detect(req.getEmailContent());
            String mode = req.getIntentMode() != null ? req.getIntentMode() : "proposed";
            String prompt = mode.equals("baseline")
                    ? promptBuilder.buildBaselinePrompt(req.getEmailContent(), req.getThreadContext())
                    : promptBuilder.buildProposedPrompt(req.getEmailContent(), ir.getIntent(),
                    req.getTone(), req.getReplyLength(), req.getThreadContext());
            String reply = emailService.callGroq(prompt);
            EmailResponse resp = EmailResponse.ok(reply);
            resp.setIntent(ir.getIntent());
            resp.setIntentMode(mode);
            resp.setIntentReason(ir.getReason());
            resp.setKeywordsFound(ir.getKeywordsFound());
            resp.setPromptUsed(ir.getPromptLabel());
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/rewrite")
    public ResponseEntity<EmailResponse> rewriteEmail(@RequestBody EmailRequest req) {
        try {
            if (blank(req.getEmailContent()))
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            rateLimitService.checkRateLimit(req.getDeviceId());
            return ResponseEntity.ok(EmailResponse.ok(emailService.rewriteEmail(req)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/improve")
    public ResponseEntity<EmailResponse> improveEmail(@RequestBody EmailRequest req) {
        try {
            if (blank(req.getEmailContent()))
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            rateLimitService.checkRateLimit(req.getDeviceId());
            return ResponseEntity.ok(EmailResponse.ok(emailService.improveEmail(req)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/summarize")
    public ResponseEntity<EmailResponse> summarizeEmail(@RequestBody EmailRequest req) {
        try {
            if (blank(req.getEmailContent()))
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            rateLimitService.checkRateLimit(req.getDeviceId());
            return ResponseEntity.ok(EmailResponse.ok(emailService.summarizeEmail(req)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/followup")
    public ResponseEntity<EmailResponse> followupEmail(@RequestBody EmailRequest req) {
        try {
            if (blank(req.getEmailContent()))
                return ResponseEntity.badRequest().body(EmailResponse.fail("emailContent is required"));
            rateLimitService.checkRateLimit(req.getDeviceId());
            return ResponseEntity.ok(EmailResponse.ok(emailService.generateFollowUpEmail(req)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(EmailResponse.fail(e.getMessage()));
        }
    }

    private boolean blank(String s) { return s == null || s.isBlank(); }
}