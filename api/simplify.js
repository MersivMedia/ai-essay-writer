export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid input text' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long. Maximum 5,000 characters allowed.' });
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      // Demo mode - return sample response
      const demoResponse = {
        simplified: `Your essay demonstrates strong structural foundation with clear argumentative development. The introduction effectively establishes the thesis while body paragraphs provide supporting evidence and analysis.\n\nKey Analysis:\n• Strong thesis statement that guides the entire essay\n• Well-developed body paragraphs with topic sentences\n• Good use of evidence and examples to support claims\n• Clear transitions that connect ideas logically\n\nThis essay follows the classic five-paragraph structure commonly used in academic writing. It demonstrates solid understanding of persuasive writing techniques and evidence-based argumentation.\n\nNote: This is a demo response. Add your OpenAI API key to environment variables to get real AI-powered essay analysis.`,
        keyPoints: [
          "Clear thesis statement that drives the argument",
          "Strong topic sentences guide each body paragraph", 
          "Good use of evidence and supporting examples",
          "Logical flow and transitions between ideas",
          "Proper conclusion that reinforces main argument"
        ],
        risks: [
          "Consider adding counterarguments to strengthen analysis",
          "Some transitions between paragraphs could be smoother",
          "Conclusion could better synthesize key insights",
          "Additional evidence or examples might support weaker points", 
          "Check for any unclear or overly complex sentences"
        ]
      };
      
      return res.status(200).json(demoResponse);
    }

    // Real OpenAI processing
    const { Configuration, OpenAIApi } = require('openai');
    
    const configuration = new Configuration({
      apiKey: openaiApiKey,
    });
    
    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a legal document simplification expert. Your job is to translate complex legal language into plain English that anyone can understand. 

Respond with a JSON object containing:
1. "simplified" - A clear, conversational explanation of what the legal text means (200-400 words)
2. "keyPoints" - An array of 3-7 important points the user should know
3. "risks" - An array of 3-7 potential concerns or risks they should be aware of

Make your explanation:
- Conversational and easy to understand
- Free of legal jargon
- Practical and actionable
- Focused on what matters most to an average person

Do not provide legal advice. Focus on education and understanding.`
        },
        {
          role: "user",
          content: `Please simplify this legal text: ${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const result = completion.data.choices[0].message.content;
    const parsedResult = JSON.parse(result);

    return res.status(200).json(parsedResult);

  } catch (error) {
    console.error('Error processing legal text:', error);
    
    // Fallback to demo response on error
    const demoResponse = {
      simplified: `Your essay demonstrates strong structural foundation with clear argumentative development. The introduction effectively establishes the thesis while body paragraphs provide supporting evidence and analysis.\n\nKey Analysis:\n• Strong thesis statement that guides the entire essay\n• Well-developed body paragraphs with topic sentences\n• Good use of evidence and examples to support claims\n• Clear transitions that connect ideas logically\n\nThis essay follows the classic five-paragraph structure commonly used in academic writing. It demonstrates solid understanding of persuasive writing techniques and evidence-based argumentation.\n\nNote: This is a demo response due to an API error. The service owner should check the OpenAI configuration.`,
      keyPoints: [
        "Clear thesis statement that drives the argument",
        "Strong topic sentences guide each body paragraph", 
        "Good use of evidence and supporting examples",
        "Logical flow and transitions between ideas",
        "Proper conclusion that reinforces main argument"
      ],
      risks: [
        "Consider adding counterarguments to strengthen analysis",
        "Some transitions between paragraphs could be smoother",
        "Conclusion could better synthesize key insights",
        "Additional evidence or examples might support weaker points", 
        "Check for any unclear or overly complex sentences"
      ]
    };
    
    return res.status(200).json(demoResponse);
  }
}