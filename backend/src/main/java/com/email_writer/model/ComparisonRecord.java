package com.email_writer.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "comparison_records")
@Data @NoArgsConstructor
public class ComparisonRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email_content", columnDefinition = "TEXT")
    private String emailContent;

    @Column(name = "thread_context", columnDefinition = "TEXT")
    private String threadContext;

    @Column(name = "detected_intent", length = 50)
    private String detectedIntent;

    @Column(name = "intent_reason", length = 255)
    private String intentReason;

    @Column(name = "keywords_found", length = 255)
    private String keywordsFound;

    @Column(name = "baseline_reply", columnDefinition = "TEXT")
    private String baselineReply;

    @Column(name = "proposed_reply", columnDefinition = "TEXT")
    private String proposedReply;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}