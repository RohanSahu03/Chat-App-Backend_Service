import mongoose from "mongoose";

const connectDB = async () => {
    const url = process.env.MONGODB_URI;
    if (!url) {
        throw new Error("Please provide MONGODB_URI in the environment variables");
    }
    try {
        await mongoose.connect(url,{
            dbName:"Chatappmicroservice"
        });
        console.log("MongoDB connected");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

export default connectDB;