package com.email_writer.service;

import com.email_writer.model.EmailRequest;
import com.email_writer.model.User;
import com.email_writer.repository.UserRepository;
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
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmailGeneratorService {

    private final WebClient.Builder webClientBuilder;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${groq.api.url}")   private String baseUrl;
    @Value("${groq.api.key}")   private String apiKey;   // YOUR key from env vars
    @Value("${groq.model}")     private String model;
    @Value("${app.rate.limit.requests-per-day:50}") private int dailyLimit;

    // ── RATE LIMIT CHECK ──────────────────────────────────────
    // Checks how many requests this user has made today
    // Resets counter automatically at midnight
    public void checkRateLimit(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LocalDateTime now = LocalDateTime.now();
        boolean newDay = user.getLastRequestDate() == null
                || user.getLastRequestDate().toLocalDate().isBefore(now.toLocalDate());

        if (newDay) {
            // New day — reset counter
            user.setRequestsToday(0);
            user.setLastRequestDate(now);
        }

        if (user.getRequestsToday() >= dailyLimit) {
            throw new RuntimeException(
                    "Daily limit reached (" + dailyLimit + " requests/day). " +
                            "Your limit resets at midnight. Come back tomorrow!"
            );
        }

        // Increment counter and save
        user.setRequestsToday(user.getRequestsToday() + 1);
        user.setLastRequestDate(now);
        userRepository.save(user);
    }

    // ── CORE GROQ CALLER ──────────────────────────────────────
    private String callGroq(String systemPrompt, String userPrompt) {
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", model);
            body.put("temperature", 0.75);
            body.put("max_tokens", 1024);

            ArrayNode messages = objectMapper.createArrayNode();
            ObjectNode sys = objectMapper.createObjectNode();
            sys.put("role", "system"); sys.put("content", systemPrompt);
            messages.add(sys);
            ObjectNode usr = objectMapper.createObjectNode();
            usr.put("role", "user"); usr.put("content", userPrompt);
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
                    .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
                            .filter(ex -> ex instanceof WebClientRequestException
                                    || (ex.getCause() instanceof SocketException
                                    && ex.getCause().getMessage() != null
                                    && ex.getCause().getMessage().contains("reset")))
                            .doBeforeRetry(sig ->
                                    System.out.println("[NeuralMail] Retrying Groq, attempt "
                                            + (sig.totalRetries() + 1)))
                    )
                    .block();

            if (response == null) throw new RuntimeException("Empty response from Groq");

            var tree = objectMapper.readTree(response);
            if (tree.has("error")) {
                throw new RuntimeException("Groq error: " + tree.path("error").path("message").asText());
            }
            return tree.path("choices").get(0).path("message").path("content").asText().trim();

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Groq API error: " + e.getMessage(), e);
        }
    }

    // ── GENERATE REPLY ────────────────────────────────────────
    public String generateEmailReply(EmailRequest req) {
        String tone   = req.getTone()        == null ? "professional" : req.getTone();
        String length = req.getReplyLength() == null ? "medium"       : req.getReplyLength();

        String toneDesc = switch (tone) {
            case "formal"      -> "formal and highly professional";
            case "friendly"    -> "warm, friendly and personable";
            case "executive"   -> "executive-level, direct and authoritative";
            case "apology"     -> "sincere and apologetic";
            case "negotiation" -> "diplomatic and open to negotiation";
            case "casual"      -> "casual and conversational";
            case "assertive"   -> "confident and assertive";
            default            -> "professional and clear";
        };
        String lengthDesc = switch (length) {
            case "short" -> "2-3 sentences MAXIMUM — extremely brief";
            case "long"  -> "detailed and comprehensive, 3-4 full paragraphs";
            default      -> "2-3 short paragraphs, moderate length";
        };
        String customBlock = "";
        if (req.getCustomPrompt() != null && !req.getCustomPrompt().isBlank()) {
            customBlock = "\n⚠️ OVERRIDE INSTRUCTION — MUST FOLLOW EXACTLY:\n"
                    + req.getCustomPrompt().trim() + "\n";
        }
        String system = """
            You are an expert email ghostwriter. Write replies that sound completely human.
            RULES: Output ONLY the email body. No subject line. No "Here is your reply:".
            No filler phrases. No placeholders. Sound like a real person, not an AI.
            """;
        String user = """
            Write a reply to the email below.
            %s
            Tone: %s | Length: %s
            
            Original email:
            %s
            """.formatted(customBlock, toneDesc, lengthDesc, req.getEmailContent());
        return callGroq(system, user);
    }

    // ── REWRITE ───────────────────────────────────────────────
    public String rewriteEmail(EmailRequest req) {
        String tone = req.getTone() != null ? req.getTone() : "professional";
        return callGroq(
                "You are an expert email editor. Output ONLY the rewritten email body.",
                "Rewrite this email to be more " + tone + " and polished. Keep same meaning.\n\n"
                        + req.getEmailContent()
        );
    }

    // ── IMPROVE ───────────────────────────────────────────────
    public String improveEmail(EmailRequest req) {
        return callGroq(
                "Fix grammar, spelling and punctuation. Output ONLY the improved email body.",
                "Fix this email:\n\n" + req.getEmailContent()
        );
    }

    // ── SUMMARIZE ─────────────────────────────────────────────
    public String summarizeEmail(EmailRequest req) {
        return callGroq(
                "Summarize emails into bullet points starting with •. Output ONLY bullet points.",
                "Summarize in 3-5 bullets (max 15 words each):\n\n" + req.getEmailContent()
        );
    }

    // ── FOLLOW-UP ─────────────────────────────────────────────
    public String generateFollowUpEmail(EmailRequest req) {
        String tone   = req.getTone() != null ? req.getTone() : "professional";
        String custom = (req.getCustomPrompt() != null && !req.getCustomPrompt().isBlank())
                ? "\n⚠️ MUST FOLLOW: " + req.getCustomPrompt() : "";
        return callGroq(
                "Write polite follow-up emails. Output ONLY the email body.",
                "Write a follow-up for this thread. Tone: " + tone + ". Max 3-4 sentences." + custom
                        + "\n\nOriginal:\n" + req.getEmailContent()
        );
    }

    // ── HUMAN SCORE ───────────────────────────────────────────
    public String generateHumanScore(String emailContent) {
        return callGroq(
                "Rate how human-written text sounds. Output ONLY a single integer 0-100.",
                "Rate this email's human score 0-100:\n\n" + emailContent
        ).replaceAll("[^0-9]", "");
    }

    // ── SEMANTIC FINGERPRINT ──────────────────────────────────
    public String generateSemanticFingerprint(String emailContent) {
        return callGroq(
                "Extract keywords. Output ONLY comma-separated keywords.",
                "Extract 5-8 keywords from:\n\n" + emailContent
        );
    }
}