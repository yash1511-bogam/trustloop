import twilio from "twilio";

type SmsSendResult = {
  success: boolean;
  sid?: string;
  error?: string;
};

const globalForTwilio = globalThis as unknown as {
  twilioClient?: ReturnType<typeof twilio>;
};

function getTwilioClient() {
  if (globalForTwilio.twilioClient) {
    return globalForTwilio.twilioClient;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return null;
  }

  const client = twilio(accountSid, authToken);
  if (process.env.NODE_ENV !== "production") {
    globalForTwilio.twilioClient = client;
  }
  return client;
}

export async function sendSmsAlert(input: {
  toPhone: string;
  message: string;
}): Promise<SmsSendResult> {
  const from = process.env.TWILIO_FROM_NUMBER;
  const client = getTwilioClient();

  if (!from || !client) {
    return {
      success: false,
      error:
        "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
    };
  }

  try {
    const message = await client.messages.create({
      body: input.message,
      from,
      to: input.toPhone,
    });

    return {
      success: true,
      sid: message.sid,
    };
  } catch (error) {
    if (error instanceof twilio.RestException) {
      return {
        success: false,
        error: `Twilio ${error.code}: ${error.message}`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS send failed.",
    };
  }
}
