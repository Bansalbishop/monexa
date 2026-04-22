import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("mongodb connected: " + conn.connection.host);
  } catch (error) {
    console.error("error connecting to mongo db ", error);
  }
};

export default connectDB;
