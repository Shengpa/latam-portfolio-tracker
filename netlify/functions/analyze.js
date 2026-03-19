export default async (req) => {
  try {
    const body = await req.json();
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: body.messages,
      }),
    });

    const data = await response.json();
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: data,
      keyExists: !!process.env.ANTHROPIC_API_KEY,
      keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10)
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: e.message 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/analyze" };
