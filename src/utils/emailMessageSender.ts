import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

export const sendEmailMessage = async (date: string, time: string, customerName: string,
    customerPhone: string,
    pickupAddress: string,
    dropOffAddress: string) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: `Salmon Arm Taxi`,
            to: process.env.EMAIL_USER,
            subject: `Ride Booking Notification: ${customerName} at ${time} on ${date}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
              <h2 style="color: #333333; text-align: center; background-color: #ffd700; padding: 10px; border-radius: 6px;">🚕 Ride Booking Received</h2>
              
              <p style="font-size: 16px; color: #555;">A new ride has been booked. Please note that you will be notified at the scheduled time.</p>
              
              <p style="font-size: 16px; color: #555;"><strong>Date:</strong> ${date}</p>
              <p style="font-size: 16px; color: #555;"><strong>Time:</strong> ${time}</p>
              <p style="font-size: 16px; color: #555;"><strong>Customer Name:</strong> ${customerName}</p>
              <p style="font-size: 16px; color: #555;"><strong>Phone Number:</strong> ${customerPhone}</p>
              <p style="font-size: 16px; color: #555;"><strong>Pickup Address:</strong><br/> ${pickupAddress}</p>
              <p style="font-size: 16px; color: #555;"><strong>Drop-off Address:</strong><br/> ${dropOffAddress}</p>
          
            </div>
          `
        }
        await transporter.sendMail(mailOptions);
        console.log("✅ Ride schedule email sent successfully");
    }
    catch (error) {
        console.error("⚠️ Failed to send admin email: ", error);
    }
}

export const sendEmailMessageBeforeTime = async (date: string, time: string, customerName: string,
    customerPhone: string,
    pickupAddress: string,
    dropOffAddress: string) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: `Salmon Arm Taxi`,
            to: process.env.EMAIL_USER,
            subject: `New Schedule Ride for ${customerName} at ${time} and ${date}`,
            html: `
           <div style="
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                max-width: 600px;
                margin: 40px auto;
                padding: 25px;
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                background: #ffffff;
                box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            ">
                <!-- Company Logo and Name -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <img src="https://i.postimg.cc/Y9MJSmtD/salmon-logo-final.jpg" alt="Salmon Arm Taxi Logo" style="height: 60px; margin-bottom: 8px; border-radius: 50%; object-fit: cover;" />
                    <div style="font-size: 26px; font-weight: bold; color: #222; letter-spacing: 1px;">Salmon Arm Taxi</div>
                </div>
                <h2 style="
                    color: #ffffff;
                    text-align: center;
                    background: linear-gradient(90deg, #ffb703, #f5ef1b);
                    padding: 15px 10px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    font-size: 24px;
                ">
                 🚕 Ride Scheduled
                </h2>

                <p style="font-size: 18px; color: #333; margin: 0 0 15px;"><strong>Date:</strong> <span style="color:#555;">${date}</span></p>
                <p style="font-size: 18px; color: #333; margin: 0 0 15px;"><strong>Time:</strong> <span style="color:#555;">${time}</span></p>
                <p style="font-size: 18px; color: #333; margin: 0 0 15px;"><strong>Customer Name:</strong> <span style="color:#555;">${customerName}</span></p>
                <p style="font-size: 18px; color: #333; margin: 0 0 15px;"><strong>Phone Number:</strong> <span style="color:#555;">${customerPhone}</span></p>

            <div style="
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 8px;
                border: 1px dashed #ffd700;
                margin: 20px 0;
            ">
                <p style="font-size: 18px; color: #333; margin: 0 0 10px;"><strong>Pickup Address:</strong></p>
                <p style="font-size: 16px; color: #555; margin: 0;">${pickupAddress}</p>
            </div>

            <div style="
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 8px;
                border: 1px dashed #ffd700;
            ">
                <p style="font-size: 18px; color: #333; margin: 0 0 10px;"><strong>Drop-off Address:</strong></p>
                <p style="font-size: 16px; color: #555; margin: 0;">${dropOffAddress}</p>
            </div>

            <p style="text-align: center; margin-top: 40px; font-size: 14px; color: #999;">
                📧 This is an email reminder for the admin.
            </p>
            </div>`
        }
        await transporter.sendMail(mailOptions);
        console.log("✅ Reminder email sent successfully");
    }
    catch (error) {
        console.error("⚠️ Failed to send admin email: ", error);
    }
}

export const sendBookingsDetailsReportEmail = async (toEmail: string, filePath: string, ccEmails?: string | string[]) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const mailOptions: any = {
            from: `"Salmon Arm Taxi" <${process.env.EMAIL_USER}>`,
            to: [toEmail, process.env.EMAIL_USER],
            subject: "Monthly Booking Report",
            html: `
                <div style="font-family: Arial, sans-serif; background: #f4f8fb; padding: 32px;">
                    <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
                        <h2 style="color: #1a73e8; text-align: center; margin-bottom: 16px;">📊 Monthly Booking Report</h2>
                        <p style="font-size: 16px; color: #333; margin-bottom: 18px;">
                            Dear Admin,
                        </p>
                        <p style="font-size: 15px; color: #444; margin-bottom: 18px;">
                            Please find attached the <strong>monthly booking report</strong> for your review. This report contains all bookings for the previous month, including key details such as Address, driver and vehicle.
                        </p>
                        <p style="font-size: 14px; color: #888; text-align: center; margin-top: 32px;">
                            Thank you for choosing <strong>Salmon Arm Taxi</strong>.<br>
                            <span style="font-size: 13px;">This is an automated email. Please do not reply directly.</span>
                        </p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `monthly_bookings_reports_${timestamp}.csv`,
                    path: path.resolve(filePath),
                },
            ],
        };

        if (ccEmails) {
            mailOptions.bcc = ccEmails;
        }

        await transporter.sendMail(mailOptions);
        console.log("📧 Email sent Successfully!");
    } catch (error) {
        console.error("⚠️ Email sending email", error);
    }
}