const { getModel, DEFAULT_CHAT_MODEL } = require('../config/gemini');

const logger = require('../utils/logger');
const fs = require('fs');

// Current model names (as of 2025)
const FLASH_MODEL = 'gemini-2.0-flash';
const PRO_MODEL = 'gemini-2.0-flash'; // Use flash for everything; upgrade to gemini-2.5-pro if needed

const PLATFORM_KNOWLEDGE = `
PRAGATI AI is a civic governance platform for citizens and government officers.
Citizens can report civic issues, upload evidence, track report status, check notifications, and ask the AI assistant for help.
Officers can review AI-clustered issues, see merged citizen reports, prioritize by impact, and update work status.
Main issue categories: Water & Sanitation, Roads & Infrastructure, Electricity & Power, Public Health, Waste Management, and Other.
Complaint status for citizens: Pending means received, Processing means an officer marked the issue in progress, Resolved means work is completed.
Good complaints include exact location, landmark, issue category, how long it has existed, safety risk, and photo/video evidence when available.
`;

const normalizeComplaintStatus = (status = '') => {
  if (status === 'Processing' || status === 'In Progress') return 'In Progress';
  if (status === 'Resolved') return 'Resolved';
  if (status === 'Merged') return 'Merged for higher priority';
  return 'Pending';
};

const formatComplaintContext = (complaints = []) => {
  if (!complaints.length) return 'No recent citizen complaints are available for this user.';

  return complaints
    .slice(0, 5)
    .map((complaint, index) => {
      const id = complaint._id ? String(complaint._id).slice(-6).toUpperCase() : `#${index + 1}`;
      const status = normalizeComplaintStatus(complaint.status);
      const category = complaint.category || 'General';
      const location = complaint.location?.address || 'unknown location';
      return `${index + 1}. ${id}: ${category} at ${location}, status ${status}`;
    })
    .join('\n');
};

const getLatestComplaintSummary = (complaints = []) => {
  if (!complaints.length) {
    return 'I do not see any reports on your account yet. You can create one from Report Complaint with the location, issue details, and a photo if available.';
  }

  const complaint = complaints[0];
  const id = complaint._id ? String(complaint._id).slice(-6).toUpperCase() : 'your latest report';
  const status = normalizeComplaintStatus(complaint.status);
  const category = complaint.category || 'General';
  const location = complaint.location?.address || 'the submitted location';

  return `Your latest report ${id} is a ${category} issue at ${location}. Its current status is ${status}.`;
};

const getFallbackChatReply = (message = '', context = {}) => {
  const text = message.toLowerCase();
  const complaints = context.complaints || [];

  if (text.includes('status') || text.includes('track') || text.includes('complaint id')) {
    return `${getLatestComplaintSummary(complaints)} You can also open My Reports or the Status Check page to see all updates.`;
  }

  if (
    text.includes('report') ||
    text.includes('pothole') ||
    text.includes('garbage') ||
    text.includes('water') ||
    text.includes('electric') ||
    text.includes('road') ||
    text.includes('sewage')
  ) {
    if (text.includes('pothole') || text.includes('road')) {
      return 'For a road or pothole issue, report the exact road name, nearby landmark, size/depth if known, traffic risk, and a photo. Mark it urgent if it is causing accidents or blocking movement.';
    }

    if (text.includes('water') || text.includes('sewage')) {
      return 'For water or sewage issues, include the affected lane/ward, whether supply is stopped or contaminated, how many days it has continued, and any health or flooding risk. A clear photo helps officers verify severity faster.';
    }

    if (text.includes('electric') || text.includes('streetlight') || text.includes('power')) {
      return 'For electricity or streetlight issues, mention the pole number if visible, nearby landmark, outage duration, and whether there is exposed wiring or public danger. Avoid touching wires and report emergency hazards immediately.';
    }

    return 'To report this civic issue, open Report Complaint, add the location, describe what is happening, and upload a photo if you have one. Include nearby landmarks and how long the issue has existed so the department can prioritize it faster.';
  }

  if (text.includes('scheme') || text.includes('benefit') || text.includes('document')) {
    return 'Tell me which government scheme or benefit you are asking about and your city or ward. I can help list the typical eligibility details, documents, and where to apply.';
  }

  if (text.includes('urgent') || text.includes('danger') || text.includes('accident') || text.includes('emergency')) {
    return 'If there is immediate danger, contact your local emergency helpline first. After that, file a complaint with photos, exact location, and words like urgent or safety hazard so it can be reviewed quickly.';
  }

  if (text.includes('what can') || text.includes('help') || text.includes('knowledge') || text.includes('category')) {
    return 'I can help with Water & Sanitation, Roads & Infrastructure, Electricity & Power, Public Health, Waste Management, complaint drafting, and status tracking. For the best guidance, tell me the issue type, location, and whether there is any safety risk.';
  }

  return 'I can help with civic issue knowledge, reporting steps, complaint status, government schemes, or drafting a clearer complaint. Tell me the problem, location, and what answer you need.';
};

class AIService {
  // 1. Classification
  async classifyComplaint(text) {
    try {
      const model = getModel(FLASH_MODEL);
      const prompt = `
      You are an AI assistant for a civic governance platform (PRAGATI AI). 
      Analyze the following citizen complaint and extract the details in JSON format.
      
      Complaint: "${text}"

      Respond strictly with a JSON object (no markdown, no code fences) containing:
      {
        "category": "Water & Sanitation" | "Roads & Infrastructure" | "Electricity & Power" | "Public Health" | "Other",
        "urgency": "Low" | "Medium" | "High" | "Critical",
        "department": "Name of the government department responsible",
        "extractedLocation": "Any location mentioned in the text (or null)",
        "summary": "A 1-sentence summary of the issue"
      }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let textResponse = response.text();

      // Clean up markdown formatting if Gemini returns ```json
      textResponse = textResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(textResponse);
    } catch (error) {
      logger.error(`AI Classification Error: ${error.message}`);
      throw new Error('Failed to classify complaint with AI');
    }
  }

  // 2. Translation
  async translateText(text, targetLang = 'English') {
    try {
      const model = getModel(FLASH_MODEL);
      const prompt = `Translate the following text to ${targetLang}. Return ONLY the translated text.\n\nText: ${text}`;
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error(`AI Translation Error: ${error.message}`);
      return text; // fallback to original
    }
  }

  // 3. Image Analysis
  async analyzeImage(imagePath) {
    try {
      const model = getModel(FLASH_MODEL);

      const imageBytes = fs.readFileSync(imagePath);
      const imagePart = {
        inlineData: {
          data: imageBytes.toString("base64"),
          mimeType: "image/jpeg"
        }
      };

      const prompt = `
      Analyze this image of a civic issue. Return a JSON object (no markdown) with:
      {
        "labels": ["list", "of", "relevant", "keywords"],
        "severity": "Low" | "Medium" | "High" | "Critical",
        "description": "Brief description of the visible problem"
      }`;

      const result = await model.generateContent([prompt, imagePart]);
      let textResponse = result.response.text()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(textResponse);
    } catch (error) {
      logger.error(`AI Image Analysis Error: ${error.message}`);
      return { labels: [], severity: 'Medium', description: 'Could not analyze image' };
    }
  }

  // 4. Governance Brief
  async generateGovernanceBrief(issuesContext) {
    try {
      const model = getModel(PRO_MODEL);
      const prompt = `
      You are generating a Daily Governance Brief for city administrators.
      Based on the following JSON data of active issues, write a 2-paragraph executive summary.
      Highlight critical hotspots, overall trends, and suggest 1-2 immediate actions.
      
      Data: ${JSON.stringify(issuesContext)}
      `;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error(`AI Brief Error: ${error.message}`);
      return "Unable to generate governance brief at this time.";
    }
  }

  // 5. Chatbot
  async chat(message, context = {}) {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return getFallbackChatReply(message, context);
      }

      const model = getModel(process.env.GEMINI_CHAT_MODEL || DEFAULT_CHAT_MODEL);


      const prompt = `You are Pragati AI, a highly intelligent, empathetic, and knowledgeable civic governance assistant.

Your goal is to help citizens report civic issues, track their complaints, and understand government schemes. 
You must follow these rules when responding:
1. **Be Empathetic & Helpful**: Acknowledge the citizen's problem and express readiness to help.
2. **Use Clear Formatting**: Use Markdown (e.g., **bold text** for emphasis, bullet points for lists, and concise paragraphs) to make your response easy to read.
3. **Be Action-Oriented**: Clearly tell the user what they can do next (e.g., "You can upload a photo of the pothole" or "Check the 'My Reports' tab").
4. **Keep it Concise but Comprehensive**: Provide all necessary information but avoid overly long walls of text.

Use this platform knowledge when relevant:
${PLATFORM_KNOWLEDGE}

User's recent complaint context:
${formatComplaintContext(context.complaints || [])}

Citizen's message: "${message}"`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.warn(`AI Chat fallback used: ${error.message}`);
      return getFallbackChatReply(message, context);
    }
  }
}

module.exports = new AIService();
