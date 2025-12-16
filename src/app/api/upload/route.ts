import { NextResponse } from "next/server";
import { uploadDocument } from "@/lib/firebase";

// Supported file types for syllabus/assignment extraction
const SUPPORTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Expected a file under the `file` field." },
        { status: 400 },
      );
    }

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type. Accepted: PDF, DOCX, DOC, PNG, JPEG, WebP` },
        { status: 400 },
      );
    }

    // Upload to Firebase Storage (optional - skip if not configured)
    let uploadResult = null;
    try {
      uploadResult = await uploadDocument(file);
    } catch (error) {
      console.warn("Firebase upload skipped (not configured):", error);
    }

    // Extract assignments and dates using AI
    const extractedData = await extractAssignmentsFromFile(file);

    return NextResponse.json({
      ok: true,
      storageUrl: uploadResult?.storageUrl,
      bytes: uploadResult?.bytes,
      fileName: file.name,
      fileType: file.type,
      extracted: extractedData,
    });
  } catch (error) {
    console.error("Upload error", error);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}

/**
 * Extract assignment titles and deadlines from uploaded file using Gemini AI
 */
async function extractAssignmentsFromFile(file: File): Promise<{
  assignments: Array<{ title: string; deadline?: string; description?: string }>;
  confidence: number;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured, skipping AI extraction");
    return { assignments: [], confidence: 0 };
  }

  try {
    // Convert file to base64 for Gemini API
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    
    // Determine MIME type for Gemini
    const mimeType = file.type;

    const prompt = `You are an academic schedule analyzer. Extract ALL deadlines and assignments from this image/document.

Return ONLY a JSON array. Each item should have:
- "title": The assignment name (e.g., "HW 2.1", "Quiz 3", "Final Exam")
- "deadline": Date in YYYY-MM-DD format (required)
- "description": Optional brief note

Format: [{"title":"HW 2.1","deadline":"2025-09-05"},{"title":"Quiz 2","deadline":"2025-09-07"}]

Extract EVERY assignment, quiz, test, and exam with a date. Even if unsure about format, include it.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error response:", error);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Unexpected Gemini response structure:", data);
      return { assignments: [], confidence: 0 };
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    console.log("Gemini response:", textResponse);

    // Extract JSON from response
    let assignments: Array<{ title: string; deadline?: string; description?: string }> = [];
    
    try {
      // Try to find JSON array in the response
      const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        assignments = Array.isArray(parsed) ? parsed : [];
      } else {
        console.warn("No JSON array found in response:", textResponse);
      }
    } catch (parseError) {
      console.error("Failed to parse JSON from Gemini response:", parseError);
      // Try to extract manually as fallback
      const lines = textResponse.split('\n');
      for (const line of lines) {
        const match = line.match(/([A-Za-z0-9\s.]+).*?(\d{4}-\d{2}-\d{2})/);
        if (match) {
          assignments.push({
            title: match[1].trim(),
            deadline: match[2],
          });
        }
      }
    }

    console.log("Extracted assignments:", assignments);
    
    return {
      assignments: assignments.filter(a => a.title && a.deadline),
      confidence: assignments.length > 0 ? 0.85 : 0,
    };
  } catch (error) {
    console.error("AI extraction failed:", error);
    return { assignments: [], confidence: 0 };
  }
}
