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

    const prompt = `Analyze this document (syllabus, course schedule, or assignment sheet) and extract ALL assignments, homework, quizzes, tests, and exams with their due dates.

Look for:
- Homework (HW) assignments and due dates
- Quizzes and their due dates  
- Tests/Exams and their dates
- Projects and deadlines
- Any other graded work with dates

Return a JSON array with this exact structure:
[
  {
    "title": "Assignment name (e.g., 'HW 2.1', 'Quiz 2', 'Test 1')",
    "deadline": "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS",
    "description": "Brief description if available"
  }
]

Extract every single item with a due date. If time is specified, include it in the deadline.
Return ONLY the JSON array, no markdown formatting or extra text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || textResponse.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textResponse;
    const assignments = JSON.parse(jsonText);

    return {
      assignments: Array.isArray(assignments) ? assignments : [],
      confidence: 0.85, // High confidence for Gemini vision extraction
    };
  } catch (error) {
    console.error("AI extraction failed:", error);
    return { assignments: [], confidence: 0 };
  }
}
