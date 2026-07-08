import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[whatsapp-webhook] verificado ✓');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('[whatsapp-webhook] verificación fallida');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (messages?.length) {
      for (const msg of messages) {
        console.log(`[whatsapp-webhook] de ${msg.from}: ${msg.text?.body}`);
      }
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[whatsapp-webhook] error:', err.message);
    return NextResponse.json({ received: true });
  }
}
