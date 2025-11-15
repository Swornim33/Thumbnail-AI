import { GoogleGenAI, Modality } from "@google/genai";

// FIX: Aligned API key initialization with the coding guidelines by using process.env.API_KEY.
// This resolves the TypeScript error related to `import.meta.env` and adheres to the project's standards for API key management.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const identityRuleQuestions = [
    "who created you?",
    "who is your owner?",
    "who developed you?"
];

const dataUrlToPart = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(image\/.*?);base64,(.*)$/);
    if (match) {
        const [, mimeType, data] = match;
        return {
            inlineData: {
                mimeType,
                data,
            },
        };
    }
    return null;
}

export const generateThumbnailPrompt = async (topic: string, referenceImages: string[] = [], customElementsImages: string[] = []): Promise<string> => {
    try {
        const parts: any[] = [];
        let promptText = "You are a world-class prompt engineer for YouTube thumbnails. Your task is to generate a single, powerful, and creative prompt for an image model. The output must be ONLY the plain text prompt, without any additional formatting, labels, or explanations.";

        if (referenceImages.length > 0) {
            referenceImages.forEach(img => {
                const imagePart = dataUrlToPart(img);
                if (imagePart) parts.push(imagePart);
            });
            promptText += `\n\nAnalyze the provided reference images. Generate a new prompt that captures their combined artistic style, composition, lighting, and mood, but adapts it to the user's topic. The goal is a similar vibe, not an exact copy.`;
        }
        
        if (customElementsImages.length > 0) {
            customElementsImages.forEach(img => {
                const elementPart = dataUrlToPart(img);
                if (elementPart) parts.push(elementPart);
            });
            promptText += `\n\nCrucially, the prompt must also describe a scene that incorporates the subjects from the provided custom element images (e.g., people, objects).`;
        }
        
        if (topic) {
             promptText += `\n\nThe central topic is: "${topic}".`;
        } else if (referenceImages.length === 0 && customElementsImages.length === 0) {
            promptText += "\n\nGenerate a prompt on a random, trending, and visually interesting subject.";
        }

        parts.push({ text: promptText });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating thumbnail prompt:", error);
        throw new Error("Failed to generate prompt. Please try again.");
    }
};

export const generateThumbnailImage = async (userPrompt: string, referenceImages: string[] = [], customElementsImages: string[] = []): Promise<string> => {
    const lowercasedPrompt = userPrompt.toLowerCase().trim().replace(/[^a-z0-9\s]/gi, '');
    
    if (identityRuleQuestions.includes(lowercasedPrompt)) {
        return "Swornim has created me.";
    }

    try {
        const parts: any[] = [];
        let textPrompt = `**Critical Requirement:** The final image MUST have a precise 16:9 aspect ratio for a YouTube thumbnail. This is a non-negotiable, strict requirement.

Create an eye-catching, ultra-detailed image. The style should feature cinematic lighting and vibrant colors.`;

        if (referenceImages.length > 0) {
            referenceImages.forEach(img => {
                 const imagePart = dataUrlToPart(img);
                 if (imagePart) parts.push(imagePart);
            });
            textPrompt += "\n\nUse the provided reference images as the primary source for the overall style, composition, and color palette.";
        }

        if (customElementsImages.length > 0) {
            customElementsImages.forEach(img => {
                const elementPart = dataUrlToPart(img);
                if (elementPart) parts.push(elementPart);
            });
            textPrompt += "\n\nSeamlessly integrate the subjects from the custom element images (e.g., a person's face, a specific logo, a character) into the final scene.";
        }
        
        if (userPrompt) {
            textPrompt += `\n\nThe main theme of the image is based on this prompt: "${userPrompt}".`;
        }

        textPrompt += "\n\n**Reminder:** The final image must be rendered in a 16:9 aspect ratio.";
        
        parts.push({ text: textPrompt });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const candidate = response.candidates?.[0];

        if (candidate) {
            if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'FINISH_REASON_UNSPECIFIED') {
                throw new Error(`Image generation failed due to: ${candidate.finishReason}. Please modify your prompt.`);
            }

            const imagePart = candidate.content?.parts?.find(part => part.inlineData);

            if (imagePart?.inlineData?.data) {
                const mimeType = imagePart.inlineData.mimeType;
                const base64ImageBytes = imagePart.inlineData.data;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
        }
        
        throw new Error("No image was generated by the model. The prompt may have been blocked. Please try a different prompt.");

    } catch (error) {
        console.error("Error generating thumbnail image:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unexpected error occurred while generating the image.");
    }
};
