package com.email_writer.fields;

import lombok.Data;
import lombok.NoArgsConstructor;
<<<<<<< HEAD
import lombok.AllArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
=======

@Data
@NoArgsConstructor
>>>>>>> 580b2e3bbac143b103fdc769f7eda4efd6d9822f
public class EmailResponse {
    private boolean success;
    private String result;
    private String error;
<<<<<<< HEAD
=======
    private String intent;
    private String intentMode;
    private String intentReason;    // explainability: why this intent
    private String keywordsFound;   // explainability: which keywords matched
    private String promptUsed;      // explainability: which template was used
>>>>>>> 580b2e3bbac143b103fdc769f7eda4efd6d9822f

    public static EmailResponse ok(String result) {
        EmailResponse r = new EmailResponse();
        r.success = true; r.result = result; return r;
    }
    public static EmailResponse fail(String error) {
        EmailResponse r = new EmailResponse();
        r.success = false; r.error = error; return r;
    }
}