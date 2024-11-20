import { NextResponse } from 'next/server';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

export async function POST(req: Request) {
  try {
    const { tokens, title, body } = await req.json();
    const expo = new Expo();
    const messages: ExpoPushMessage[] = [];

    // Validate tokens and build messages
    for (let pushToken of tokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: { withSome: 'data' },
        priority: 'high',
      });
    }

    if (messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid push tokens found',
        },
        { status: 400 }
      );
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      tickets,
      sentTo: messages.length,
    });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
