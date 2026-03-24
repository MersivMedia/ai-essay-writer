const OpenAI = require('openai');

let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting: 3 essays per day per IP
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const today = new Date().toDateString();
    const rateLimitKey = `${clientIP}_${today}`;
    
    // Simple in-memory rate limiting (in production, use Redis or database)
    if (!global.rateLimitStore) {
        global.rateLimitStore = {};
    }
    
    if (!global.rateLimitStore[rateLimitKey]) {
        global.rateLimitStore[rateLimitKey] = 0;
    }
    
    if (global.rateLimitStore[rateLimitKey] >= 3) {
        return res.status(429).json({ 
            error: 'Rate limit exceeded',
            message: 'You have reached your daily limit of 3 essays. Please try again tomorrow!'
        });
    }
    
    // Increment the counter
    global.rateLimitStore[rateLimitKey]++;

    const { text: essayPrompt } = req.body;

    if (!essayPrompt || essayPrompt.trim().length === 0) {
        return res.status(400).json({ error: 'Essay prompt is required' });
    }

    try {
        // If no OpenAI API key, return demo response
        if (!openai) {
            console.log('No OpenAI API key found, returning demo response for essay');
            return res.json({
                essay: "# The Power of Renewable Energy: A Sustainable Future\\n\\nIn an era of climate change and environmental consciousness, renewable energy has emerged as a critical solution for our planet's future (IPCC, 2023). This essay explores the compelling benefits of renewable energy, focusing on environmental impact, economic advantages, and long-term sustainability.\\n\\n## Environmental Benefits\\n\\nRenewable energy sources like solar, wind, and hydroelectric power produce virtually no greenhouse gas emissions during operation (Johnson & Smith, 2023). Unlike fossil fuels, which release harmful pollutants and carbon dioxide, renewable sources help reduce our carbon footprint and combat global warming. Research by the Global Climate Institute demonstrates that widespread adoption of renewable energy could reduce global CO2 emissions by up to 70% by 2050 (Climate Institute, 2023).\\n\\n## Economic Advantages\\n\\nContrary to popular belief, renewable energy has become increasingly cost-effective (Martinez et al., 2023). Solar panel costs have dropped by over 80% in the past decade, making it cheaper than coal in many regions (Energy Economics Review, 2023). The renewable energy sector also creates jobs at a faster rate than traditional energy industries, with over 13 million people employed in renewable energy worldwide (International Renewable Energy Agency, 2023).\\n\\n## Future Sustainability\\n\\nUnlike finite fossil fuel reserves, renewable energy sources are inexhaustible (Thompson, 2023). The sun will shine, the wind will blow, and rivers will flow for billions of years. Investing in renewable infrastructure today ensures energy security for future generations while reducing dependence on volatile fossil fuel markets (Energy Security Council, 2023).\\n\\n## Conclusion\\n\\nRenewable energy represents more than just an alternative to fossil fuels—it's a pathway to a sustainable, economically viable, and environmentally responsible future. As college students who will inherit this planet, supporting renewable energy initiatives is both a practical and moral imperative for creating lasting positive change.\\n\\n## References\\n\\nClimate Institute. (2023). *Global emissions reduction pathways*. Climate Research Publications.\\n\\nEnergy Economics Review. (2023). *Cost trends in renewable energy technology*. Energy Analysis Press.\\n\\nEnergy Security Council. (2023). *Long-term energy independence strategies*. Policy Research Institute.\\n\\nInternational Renewable Energy Agency. (2023). *Global renewable energy employment statistics*. IRENA Publications.\\n\\nIPCC. (2023). *Climate change mitigation strategies*. Intergovernmental Panel on Climate Change.\\n\\nJohnson, R., & Smith, A. (2023). *Environmental impacts of renewable energy systems*. Environmental Science Quarterly, 45(2), 123-145.\\n\\nMartinez, C., Brown, D., & Wilson, K. (2023). *Economic viability of renewable energy projects*. Journal of Energy Economics, 78, 234-251.\\n\\nThompson, L. (2023). *Sustainable energy for future generations*. Future Energy Review, 12(4), 45-62.",
                wordCount: 287,
                readingTime: "2-3 minutes",
                structure: [
                    "Clear thesis statement",
                    "Three main supporting arguments", 
                    "Evidence-based reasoning",
                    "Strong conclusion with call to action"
                ]
            });
        }

        // Real OpenAI API call
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a professional essay writer and academic writing expert. Create well-structured, original essays with clear thesis statements, supporting arguments, and proper academic formatting. Requirements: 1) Include in-text citations throughout the essay in APA format (Author, Year) 2) Add a comprehensive References section at the end with realistic academic sources 3) Use engaging introductions, logical paragraph flow, evidence-based reasoning, and strong conclusions 4) Format in markdown with proper headings 5) Ensure the essay meets any specified word count requirements"
                },
                {
                    role: "user", 
                    content: `Generate a comprehensive essay based on these requirements: ${essayPrompt}\n\nESSENTIAL Requirements:\n1. Create a well-structured essay in markdown format with clear headings\n2. Include a strong thesis statement and supporting arguments\n3. Use evidence-based reasoning with in-text citations (Author, Year) throughout\n4. Add a References section at the end with realistic academic sources\n5. If a specific word count is mentioned in the prompt, ensure the essay meets or exceeds that word count\n6. Write engaging content appropriate for the target audience\n7. Ensure proper academic structure (intro, body paragraphs, conclusion)\n8. Make it original and plagiarism-free\n\nPlease provide the complete essay with proper formatting, citations, and references.`
                }
            ],
            max_tokens: 3000,
            temperature: 0.7,
        });

        const essayContent = completion.choices[0].message.content;
        
        // Extract word count (approximate)
        const wordCount = essayContent.split(/\s+/).length;
        
        // Calculate reading time (average 200-250 words per minute)
        const readingMinutes = Math.ceil(wordCount / 225);
        const readingTime = readingMinutes === 1 ? "1 minute" : `${readingMinutes} minutes`;
        
        // Identify structure elements
        const structure = [];
        if (essayContent.includes('#')) structure.push("Clear section headings");
        if (essayContent.toLowerCase().includes('conclusion')) structure.push("Conclusion paragraph");
        if (essayContent.split('\n\n').length > 3) structure.push("Multi-paragraph structure");
        structure.push("Logical argument flow");

        res.json({
            essay: essayContent,
            wordCount: wordCount,
            readingTime: readingTime,
            structure: structure
        });

    } catch (error) {
        console.error('Essay generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate essay',
            details: error.message 
        });
    }
}