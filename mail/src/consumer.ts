import amqp from "amqplib";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const startSendOtpConsumer = async () => {
    try {
        const connection = await amqp.connect({
            hostname: process.env.RABBITMQ_HOST,
            protocol: "amqp",
            port: 5672,
            username: process.env.RABBITMQ_USERNAME,
            password: process.env.RABBITMQ_PASSWORD,
        });
        const channel = await connection.createChannel();
        const queueName = "send-otp";
        await channel.assertQueue(queueName, { durable: true });
        console.log("✅ Mail service consumer started,listening for otp emails");
        channel.consume(queueName, async (message) => {
            if (message) {
                try {
                    const { to, subject, body } = JSON.parse(message.content.toString());
                    const transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port: 465,
                        auth: {
                            user: process.env.USER,
                            pass: process.env.PASSWORD,
                        },
                    });

                    await transporter.sendMail({
                        from: process.env.USER,
                        to,
                        subject,
                        text: body,
                    });

                    console.log("✅ OTP email sent to ", to);
                    channel.ack(message);

                } catch (error) {
                    console.log("Failed to send Otp", error);

                }
            }
        });
    } catch (error) {
        console.log("❌ Failed to start send otp consumer", error);
    }
}