package com.email_writer.service;

import com.email_writer.model.EmailRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import reactor.util.retry.Retry;
import java.net.SocketException;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class EmailGeneratorService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${groq.api.url}")   private String baseUrl;
    @Value("${groq.api.key}")   private String apiKey;
    @Value("${groq.model}")     private String model;

    // ── CORE GROQ CALLER (with retry on connection reset) ────
    private String callGroq(String systemPrompt, String userPrompt) {
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", model);
            body.put("temperature", 0.75);
            body.put("max_tokens", 1024);

            ArrayNode messages = objectMapper.createArrayNode();

            ObjectNode sys = objectMapper.createObjectNode();
            sys.put("role", "system");
            sys.put("content", systemPrompt);
            messages.add(sys);

            ObjectNode usr = objectMapper.createObjectNode();
            usr.put("role", "user");
            usr.put("content", userPrompt);
            messages.add(usr);

            body.set("messages", messages);

            String response = webClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .header("Connection", "keep-alive")
                    .bodyValue(body.toString())
                    .retrieve()
                    .bodyToMono(String.class)
                    // Retry up to 3 times on connection reset (1s delay between retries)
                    .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
                            .filter(ex -> ex instanceof WebClientRequestException
                                    || (ex.getCause() instanceof SocketException
                                    && ex.getCause().getMessage() != null
                                    && ex.getCause().getMessage().contains("reset")))
                            .doBeforeRetry(sig ->
                                    System.out.println("[NeuralMail] Retrying Groq call, attempt "
                                            + (sig.totalRetries() + 1) + " — " + sig.failure().getMessage())
                            )
                    )
                    .block();

            if (response == null) throw new RuntimeException("Empty response from Groq");
            return objectMapper.readTree(response)
                    .path("choices").get(0)
                    .path("message").path("content")
                    .asText().trim();
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg != null && (msg.contains("Connection reset") || msg.contains("connection"))) {
                throw new RuntimeException("Connection to AI service failed. Please try again.", e);
            }
            throw new RuntimeException("Groq API error: " + msg, e);
        }
    }

    // ── GENERATE REPLY ────────────────────────────────────────
    public String generateEmailReply(EmailRequest req) {
        String tone   = req.getTone() == null ? "professional" : req.getTone();
        String length = req.getReplyLength() == null ? "medium" : req.getReplyLength();

        String toneDesc = switch (tone) {
            case "formal"       -> "formal and highly professional";
            case "friendly"     -> "warm, friendly and personable";
            case "executive"    -> "executive-level, direct and authoritative";
            case "apology"      -> "sincere and apologetic";
            case "negotiation"  -> "diplomatic and open to negotiation";
            case "casual"       -> "casual and conversational";
            case "assertive"    -> "confident and assertive";
            default             -> "professional and clear";
        };

        String lengthDesc = switch (length) {
            case "short"  -> "2-3 sentences MAXIMUM — extremely brief";
            case "long"   -> "detailed and comprehensive, 3-4 full paragraphs";
            default       -> "2-3 short paragraphs, moderate length";
        };

        // Custom instruction block — placed FIRST with HIGHEST priority
        String customBlock = "";
        if (req.getCustomPrompt() != null && !req.getCustomPrompt().isBlank()) {
            customBlock = """
                
                ⚠️ OVERRIDE INSTRUCTION — HIGHEST PRIORITY — MUST FOLLOW EXACTLY:
                %s
                This instruction overrides everything else. Follow it precisely before anything.
                """.formatted(req.getCustomPrompt().trim());
        }

        String system = """
            You are an expert email ghostwriter. You write replies that sound completely human — natural, warm, and genuine.
            
            ABSOLUTE RULES — NEVER break these:
            1. Output ONLY the email body — no subject line, no "Here is your reply:", no explanation
            2. NEVER use filler: "Certainly!", "Of course!", "I hope this email finds you well", "Great question!"
            3. NEVER use placeholders like [Your Name] or [Date]
            4. Sound like a real person wrote this, not an AI
            5. Match the emotional context of the original email
            6. If told to reply in 2-3 words, reply in EXACTLY 2-3 words — nothing more
            7. If given a custom instruction, follow it with ABSOLUTE precision
            """;

        String user = """
            Write a reply to the email below.
            %s
            Tone: %s
            Length: %s
            
            Original email:
            %s
            """.formatted(customBlock, toneDesc, lengthDesc, req.getEmailContent());

        return callGroq(system, user);
    }

    // ── REWRITE ───────────────────────────────────────────────
    public String rewriteEmail(EmailRequest req) {
        String tone = req.getTone() != null ? req.getTone() : "professional";

        String system = """
            You are an expert email editor. Rewrite emails to be more polished and professional.
            Output ONLY the rewritten email body — no explanations, no preamble.
            """;

        String user = """
            Rewrite this email draft to be more %s and polished.
            Keep the same meaning. Improve clarity and flow. Remove redundancy.
            
            Draft:
            %s
            """.formatted(tone, req.getEmailContent());

        return callGroq(system, user);
    }

    // ── IMPROVE ───────────────────────────────────────────────
    public String improveEmail(EmailRequest req) {
        String system = """
            You are a grammar and style expert. Fix emails without changing their meaning or tone.
            Output ONLY the improved email body — no explanations.
            """;

        String user = """
            Fix all grammar, spelling and punctuation errors. Improve sentence flow.
            Preserve the original tone and meaning exactly.
            
            Email:
            %s
            """.formatted(req.getEmailContent());

        return callGroq(system, user);
    }

    // ── SUMMARIZE ─────────────────────────────────────────────
    public String summarizeEmail(EmailRequest req) {
        String system = """
            You are an email analyst. Summarize emails into clear, concise bullet points.
            Output ONLY bullet points starting with •. No preamble, no explanation.
            """;

        String user = """
            Summarize this email in 3-5 bullet points.
            Focus on: key info, action items, deadlines, decisions.
            Each bullet max 15 words.
            
            Email:
            %s
            """.formatted(req.getEmailContent());

        return callGroq(system, user);
    }

    // ── FOLLOW-UP ─────────────────────────────────────────────
    public String generateFollowUpEmail(EmailRequest req) {
        String tone   = req.getTone() != null ? req.getTone() : "professional";
        String custom = (req.getCustomPrompt() != null && !req.getCustomPrompt().isBlank())
                ? "\n⚠️ MUST FOLLOW: " + req.getCustomPrompt() : "";

        String system = """
            You are an expert at writing polite, effective follow-up emails.
            Output ONLY the follow-up email body — no subject, no explanation.
            """;

        String user = """
            Write a follow-up email referencing the thread below.
            Tone: %s. Max 3-4 sentences. Sound human, not pushy.%s
            
            Original email:
            %s
            """.formatted(tone, custom, req.getEmailContent());

        return callGroq(system, user);
    }

    // ── HUMAN SCORE ───────────────────────────────────────────
    public String generateHumanScore(String emailContent) {
        String system = """
            You are an AI-detection expert. Rate how human-written text sounds.
            Output ONLY a single integer 0-100. No explanation, no text.
            100 = completely human. 0 = obviously AI-generated.
            """;

        String user = """
            Rate this email's human-score 0-100:
            
            %s
            """.formatted(emailContent);

        return callGroq(system, user).replaceAll("[^0-9]", "");
    }

    // ── SEMANTIC FINGERPRINT ──────────────────────────────────
    public String generateSemanticFingerprint(String emailContent) {
        String system = "Extract keywords. Output ONLY comma-separated keywords, nothing else.";
        String user   = "Extract 5-8 key topic keywords from:\n\n" + emailContent;
        return callGroq(system, user);
    }
}