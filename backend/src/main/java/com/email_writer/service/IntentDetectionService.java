package com.email_writer.service;

import com.email_writer.model.IntentResult;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class IntentDetectionService {

    // ── INTENT DETECTION WITH EXPLAINABILITY ─────────────────
    public IntentResult detect(String emailContent) {
        if (emailContent == null || emailContent.isBlank())
            return new IntentResult("CASUAL", "No content to classify", "", "Casual template");

        String lower = emailContent.toLowerCase();

        // MEETING
        String[] meetingKw = {"meeting", "schedule", "call", "zoom", "teams",
                "google meet", "availability", "calendar", "conference",
                "discuss", "sync", "catch up", "appointment", "reschedule"};
        List<String> found = matchedKeywords(lower, meetingKw);
        if (!found.isEmpty())
            return new IntentResult("MEETING",
                    "Detected scheduling or meeting-related keywords",
                    String.join(", ", found), "Meeting template");

        // JOB
        String[] jobKw = {"interview", "job", "position", "resume", "cv",
                "application", "hiring", "vacancy", "offer letter",
                "recruiter", "apply", "candidate", "internship", "opportunity"};
        found = matchedKeywords(lower, jobKw);
        if (!found.isEmpty())
            return new IntentResult("JOB",
                    "Detected job or career-related keywords",
                    String.join(", ", found), "Job template");

        // URGENT
        String[] urgentKw = {"urgent", "asap", "immediately", "emergency",
                "critical", "deadline", "right away", "as soon as possible",
                "time-sensitive", "high priority", "escalate", "overdue"};
        found = matchedKeywords(lower, urgentKw);
        if (!found.isEmpty())
            return new IntentResult("URGENT",
                    "Detected urgency or time-sensitive keywords",
                    String.join(", ", found), "Urgent template");

        // FINANCE
        String[] financeKw = {"invoice", "payment", "billing", "amount due",
                "transaction", "refund", "receipt", "quote", "price",
                "cost", "budget", "purchase order", "outstanding"};
        found = matchedKeywords(lower, financeKw);
        if (!found.isEmpty())
            return new IntentResult("FINANCE",
                    "Detected finance or payment-related keywords",
                    String.join(", ", found), "Finance template");

        // COMPLAINT
        String[] complaintKw = {"complaint", "issue", "problem", "not working",
                "broken", "dissatisfied", "unhappy", "disappointed",
                "frustrated", "wrong", "mistake", "error", "failed"};
        found = matchedKeywords(lower, complaintKw);
        if (!found.isEmpty())
            return new IntentResult("COMPLAINT",
                    "Detected complaint or dissatisfaction keywords",
                    String.join(", ", found), "Complaint template");

        // FOLLOWUP
        String[] followupKw = {"follow up", "following up", "checking in",
                "any update", "any news", "heard back", "still waiting",
                "circling back", "touching base", "reminder", "just wanted to"};
        found = matchedKeywords(lower, followupKw);
        if (!found.isEmpty())
            return new IntentResult("FOLLOWUP",
                    "Detected follow-up or reminder keywords",
                    String.join(", ", found), "Follow-up template");

        return new IntentResult("CASUAL",
                "No specific intent keywords detected, classified as casual",
                "none", "Casual template");
    }

    private List<String> matchedKeywords(String text, String[] keywords) {
        List<String> matched = new ArrayList<>();
        for (String kw : keywords) {
            if (text.contains(kw)) matched.add(kw);
        }
        return matched;
    }
}