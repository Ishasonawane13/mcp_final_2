import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY || "your-api-key-here"
});

export async function checkBestPractices(params) {
    const { code, language, framework, strictMode=false } = params;
    try {
        const prompt = `You are a code review expert. Analyze this ${language} code for best practices.


${framework ? `Framework: ${framework}` : ""}
Code:
\`\`\`${language}
${code}
\`\`\`


Provide analysis with:


 **What's Good**
List positive things


 **Issues Found**
- Point out problems with line numbers
- Explain why each is an issue


 **Recommendations**
- How to fix each issue
- Better practices to follow


 **Score: X/10**
Give a score and brief reason


Keep it clear and helpful!`;

        const response = await ai.model.completions.create({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        const analyse = response.text;
        return {
            content: [
                {
                    type: "text",
                    text: `Best Practices Analysis:\n\n${analyse}\n\n\n*Powered by Google Gemini 2.5 flash`
                }
            ]
        }

    } catch (error) {
        console.error("Error in checkBestPractices and Gemini API error:", error);
    }
    return {
        content:[
            {
                type: "text",
                text: `An error occurred while checking best practices.${error.message || "Unknown error occured"}`
            }
        ]
    };
}