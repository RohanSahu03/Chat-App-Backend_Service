import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMessage extends Document {
    chatId: Types.ObjectId;
    sender: String;
    text?: string;
    image?: {
        url: string;
        publicId: string;
    };
    messageType: "text" | "image";
    seen: boolean;
    seenAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const schema = new Schema<IMessage>({
    chatId: {
        type: Schema.Types.ObjectId,
        ref:"chat",
        required: true
    },
    sender: {
        type: String,
        required: true
    },
    text: {
        type: String,
    },
    image: {
        url: String,
        publicId: String
    },
    messageType: {
        type: String,
        enum: ["text", "image"],
        default: "text"
    },
    seen: {
        type: Boolean,
        default: false
    },
    seenAt: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
},
    {
        timestamps: true
    }
);

export const Message = mongoose.model<IMessage>("Message", schema);