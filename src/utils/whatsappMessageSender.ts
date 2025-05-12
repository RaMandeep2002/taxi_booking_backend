import axios from "axios";

const PHONE_ID = process.env.PHONE_NUMBER_ID;
const AUTH_TOKEN = process.env.WHATSAPP_MESSAGE_TOKEN;


export const sendWhatsappMessage = async (to: string, date: string, time: string, customerName: string, customer_phone_number: string, pickupAddress: string, dropOffAddress: string) => {
  const url = `https://graph.facebook.com/v22.0/${PHONE_ID}/messages`;

  try {
    // console.log("body ---> ", body);    
    const data = {
      "messaging_product": "whatsapp",
      "to": `${to}`,
      type: "template",
      template: {
        name: "ride_schedule_salmon_arm",
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: date },
              { type: "text", text: time },
              { type: "text", text: customerName },
              { type: "text", text: customer_phone_number },
              { type: "text", text: pickupAddress },
              { type: "text", text: dropOffAddress },
            ]
          }
        ]
      }
    }

    const headers = {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, data, { headers });
    console.log("✅ WhatsApp message sent:", response.data);
  } catch (error) {
    console.error("❌ Failed to send WhatsApp message:", error);
  }
}