import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const sendEmailMessage = async (date: string, time: string, customerName: string,
    customerPhone: string,
    pickupAddress: string,
    dropOffAddress: string) => {
    console.log(`${process.env.EMAIL_USER,
        process.env.EMAIL_PASSWORD}`)
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                // user: process.env.EMAIL_USER,
                // pass: process.env.EMAIL_PASSWORD
                user: "ramandeepsingh1511@gmail.com",
                pass: "alxedclokidiewkc"
            }
        });

        const mailOptions = {
            from: `Salmon Arm Taxi`,
            to: process.env.EMAIL_USER,
            subject: `New Schedule Ride for ${customerName} at ${time} and ${date}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
              <h2 style="color: #333333; text-align: center; background-color: #ffd700; padding: 10px; border-radius: 6px;">🚕 Ride Scheduled</h2>
              
              <p style="font-size: 16px; color: #555;"><strong>Date:</strong> ${date}</p>
              <p style="font-size: 16px; color: #555;"><strong>Time:</strong> ${time}</p>
              <p style="font-size: 16px; color: #555;"><strong>Customer Name:</strong> ${customerName}</p>
              <p style="font-size: 16px; color: #555;"><strong>Phone Number:</strong> ${customerPhone}</p>
              <p style="font-size: 16px; color: #555;"><strong>Pickup Address:</strong><br/> ${pickupAddress}</p>
              <p style="font-size: 16px; color: #555;"><strong>Drop-off Address:</strong><br/> ${dropOffAddress}</p>
          
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;" />
          
              <p style="font-size: 14px; color: #888; text-align: center;">This is an automated notification for scheduled rides.</p>
            </div>
          `

        }
        await transporter.sendMail(mailOptions);
        console.log("✅ Admin email sent successfully");
    }
    catch (error) {
        console.error("⚠️ Failed to send admin email: ", error);
    }
}