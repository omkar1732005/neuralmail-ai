package com.email_writer.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {
    private String emailContent;
<<<<<<< HEAD
    private String tone;
    private String replyLength;
    private String customPrompt;
    // No groqApiKey field needed — backend uses its own key from env vars
=======
    private String threadContext;   // thread-aware: full thread if available
    private String tone;
    private String replyLength;
    private String customPrompt;
    private String deviceId;        // replaces JWT
    private String intentMode;      // "proposed" (default) or "baseline"
>>>>>>> 580b2e3bbac143b103fdc769f7eda4efd6d9822f
}