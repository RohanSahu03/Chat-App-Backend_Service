import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect({
            hostname: process.env.RABBITMQ_HOST,
            protocol: "amqp",
            port: 5672,
            username: process.env.RABBITMQ_USERNAME,
            password: process.env.RABBITMQ_PASSWORD,
        });
        channel = await connection.createChannel();
        console.log("✅ RabbitMQ connected");
    } catch (error) {
        console.log(error);
    }
}

export const publishToQueue = async (queueName: string, message: any) => {
    if(!channel){
        console.log("❌ RabbitMQ not connected");
        return;
    }
    await channel.assertQueue(queueName, { durable: true });
     channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)),{
        persistent:true
    });
}

