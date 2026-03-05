package com.email_writer.fields;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class EmailResponse {
    private boolean success;
    private String result;
    private String error;

    public static EmailResponse ok(String result) {
        EmailResponse r = new EmailResponse();
        r.success = true; r.result = result; return r;
    }
    public static EmailResponse fail(String error) {
        EmailResponse r = new EmailResponse();
        r.success = false; r.error = error; return r;
    }
}