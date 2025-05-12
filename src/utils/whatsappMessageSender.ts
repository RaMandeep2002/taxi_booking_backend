// import twilio from "twilio";

import axios from "axios";

// const accountSid = "ACe16dc8b1e30e3cf3ad9d7f1cd4d713a8";
// const authToken = "f52be2976e2aa1c8ef031c8779f596f4";
// const client = twilio(accountSid, authToken);

// export const sendWhatsappMessage = async (to:string, body: string) =>{
//     try{
//         const message = await client.messages.create({
//             from:`whatsapp:+14155238886`,
//             to:`whatsapp:${to}`,
//             body:body,  
//         });
//         console.log("Message sent --> ", message.sid);
//         return message.sid;
//     }
//     catch(err){
//         console.log("Failed To send message: ", err);
//         throw err;
//     }
// }3

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
    console.log(`AUTH_TOKEN --> ${AUTH_TOKEN}`);
    console.log(`PHONE_ID --> ${PHONE_ID}`);
    const response = await axios.post(url, data, { headers });
    console.log("✅ WhatsApp message sent:", response.data);
  } catch (error) {
    console.error("❌ Failed to send WhatsApp message:", error);
  }
}