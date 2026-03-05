package com.email_writer.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {
    private String emailContent;
    private String tone;
    private String replyLength;
    private String customPrompt;
}