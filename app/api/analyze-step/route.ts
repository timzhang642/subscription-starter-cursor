import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);
    
    const webhookUrl = 'https://hook.us1.make.com/3q7bad3p5i76y1xvoqgzd6of12grodjh';
    console.log('Sending request to webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
    });

    console.log('Webhook response status:', response.status);
    
    // Check if the response is ok first
    if (!response.ok) {
      throw new Error(`Webhook responded with status: ${response.status}`);
    }

    // Try to get the response as text first
    const responseText = await response.text();
    console.log('Webhook response text:', responseText);

    // Try to parse it as JSON if possible
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // If it's not JSON, return the text as is
      data = { message: responseText };
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in analyze-step:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze step'
      },
      { status: 500 }
    );
  }
}
