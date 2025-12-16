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

    const prompt = `Extract ALL assignments, homework, quizzes, tests, exams from this image/document with their due dates.

Return JSON array ONLY:
[{"title":"HW 2.1","deadline":"2025-09-05"},{"title":"Quiz 2","deadline":"2025-09-07"}]

Include every assignment with a date visible. No other text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
            maxOutputTokens: 8000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error response:", response.status, error);
      
      // Fallback: return empty with note to try again
      return { assignments: [], confidence: 0 };
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Unexpected Gemini response structure");
      return { assignments: [], confidence: 0 };
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    console.log("Gemini raw response:", textResponse);

    // Extract JSON from response
    let assignments: Array<{ title: string; deadline?: string; description?: string }> = [];
    
    try {
      // Try to find JSON array in the response
      const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        assignments = Array.isArray(parsed) ? parsed : [];
        console.log("Successfully parsed assignments:", assignments);
      } else {
        console.warn("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
    }

    console.log("Extracted assignments count:", assignments.length);
    
    return {
      assignments: assignments.filter(a => a.title && a.deadline),
      confidence: assignments.length > 0 ? 0.85 : 0,
    };
  } catch (error) {
    console.error("AI extraction failed:", error);
    return { assignments: [], confidence: 0 };
  }
}
